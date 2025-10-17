const { GoogleGenAI } = require('@google/genai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Log de diagnóstico
if (GEMINI_API_KEY) {
    console.log('[GEMINI SERVICE] API Key detectada. Iniciando cliente.');
} else {
    console.error('[GEMINI SERVICE] ❌ ERROR CRÍTICO: GEMINI_API_KEY no está definida en process.env.');
}

// Inicialización del cliente de Gemini.
// La configuración es correcta para el SDK moderno.
const ai = new GoogleGenAI({ 
    apiKey: GEMINI_API_KEY
    // apiVersion: 'v1' <--- ¡ELIMINADO CORRECTAMENTE!
});

/**
 * Función para generar contenido.
 * Se usa 'gemini-pro' como modelo por defecto para asegurar la compatibilidad 
 * con la API v1beta del entorno de Render.
 */
async function generateContent(userPrompt, systemInstruction, conversationHistory = [], model = 'gemini-pro') {
    if (!GEMINI_API_KEY) {
        throw new Error("La clave de API de Gemini no está configurada en el servidor.");
    }
    
    // El historial completo para la llamada
    const contents = [
        ...conversationHistory,
        { role: 'user', parts: [{ text: userPrompt }] }
    ];

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: contents,
            systemInstruction: systemInstruction, 
        });

        // Log de diagnóstico
        console.log('[GEMINI SERVICE] Llamada exitosa a modelo %s. Consumo de tokens: %d.', model, response.usageMetadata?.totalTokenCount || 'N/D');

        const candidate = response.candidates?.[0];

        if (candidate && candidate.content?.parts?.[0]?.text) {
            return candidate.content.parts[0].text;
        } else {
            console.error('[GEMINI SERVICE] Respuesta vacía o incompleta de la IA (posible bloqueo de Safety Settings):', JSON.stringify(response, null, 2));
            throw new Error("La IA no pudo generar una respuesta válida. (Revisar logs para Safety Settings)");
        }
    } catch (error) {
        console.error('[GEMINI SERVICE] ❌ FALLO DE API/CLIENTE:', error.message);
        throw new Error("Fallo en la comunicación con el servicio de IA. Verifique el nombre del modelo o la clave de API.");
    }
}

module.exports = { generateContent };

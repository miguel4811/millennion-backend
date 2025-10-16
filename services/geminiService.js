const { GoogleGenAI } = require('@google/genai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Log de diagnóstico
if (GEMINI_API_KEY) {
    // Es mejor no loggear la longitud de la clave por seguridad
    console.log('[GEMINI SERVICE] API Key detectada. Iniciando cliente.');
} else {
    console.error('[GEMINI SERVICE] ❌ ERROR CRÍTICO: GEMINI_API_KEY no está definida en process.env.');
}

// Inicialización del cliente de Gemini.
// ¡CORRECCIÓN CLAVE! Se elimina 'apiVersion: "v1"' para usar la versión moderna que soporta gemini-1.5-flash.
const ai = new GoogleGenAI({ 
    apiKey: GEMINI_API_KEY
    // apiVersion: 'v1' <--- ¡ELIMINADO!
});

// Función para generar contenido con historial y persona (System Instruction)
// Nota: La implementación de 'generateContent' que usaste con ai.models.generateContent({...})
// ya es la estructura correcta para el nuevo SDK.
async function generateContent(userPrompt, systemInstruction, conversationHistory = [], model = 'gemini-1.5-flash') {
    if (!GEMINI_API_KEY) {
        throw new Error("La clave de API de Gemini no está configurada en el servidor.");
    }
    
    // El historial completo para la llamada
    const contents = [
        ...conversationHistory,
        { role: 'user', parts: [{ text: userPrompt }] }
    ];

    try {
        // La estructura de la llamada es correcta para el modelo 1.5 con el SDK @google/genai
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
            // Este caso debería capturar los errores de safety settings
            console.error('[GEMINI SERVICE] Respuesta vacía o incompleta de la IA (posible bloqueo de Safety Settings):', JSON.stringify(response, null, 2));
            throw new Error("La IA no pudo generar una respuesta válida. (Revisar logs para Safety Settings)");
        }
    } catch (error) {
        // Log de diagnóstico
        console.error('[GEMINI SERVICE] ❌ FALLO DE API/CLIENTE:', error.message);
        // El mensaje de error es más preciso ahora
        throw new Error("Fallo en la comunicación con el servicio de IA. Verifique el nombre del modelo o la clave de API.");
    }
}

module.exports = { generateContent };

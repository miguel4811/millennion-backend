const { GoogleGenAI } = require('@google/genai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// 🚨 LOG DE DEBUG CRÍTICO 🚨
if (GEMINI_API_KEY) {
    console.log('[GEMINI SERVICE] API Key detectada (Longitud: %d). Iniciando cliente.', GEMINI_API_KEY.length);
} else {
    console.error('[GEMINI SERVICE] ❌ ERROR CRÍTICO: GEMINI_API_KEY no está definida en process.env.');
}

// 💥 SOLUCIÓN CLAVE 💥
// Forzamos al cliente a usar la versión "v1" en lugar de la versión "v1beta" por defecto.
const ai = new GoogleGenAI({ 
    apiKey: GEMINI_API_KEY,
    apiVersion: 'v1' // <--- ESTA ES LA CORRECCIÓN
});

// Función para generar contenido con historial y persona (System Instruction)
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
        const response = await ai.models.generateContent({
            model: model,
            contents: contents,
            config: {
                // La instrucción del sistema (persona) se define aquí
                systemInstruction: systemInstruction,
            }
        });

        // 🚨 LOG DE DEBUG CRÍTICO 🚨 (Mantengo el log de éxito)
        console.log('[GEMINI SERVICE] Llamada exitosa a modelo %s. Consumo de tokens: %d.', model, response.usageMetadata?.totalTokenCount || 'N/D');

        const candidate = response.candidates?.[0];

        if (candidate && candidate.content?.parts?.[0]?.text) {
            return candidate.content.parts[0].text;
        } else {
            console.error('[GEMINI SERVICE] Respuesta vacía o incompleta de la IA:', JSON.stringify(response, null, 2));
            throw new Error("La IA no pudo generar una respuesta válida.");
        }
    } catch (error) {
        console.error('[GEMINI SERVICE] ❌ FALLO DE API/CLIENTE:', error.message);
        throw new Error("Fallo en la comunicación con el servicio de IA. La clave o el modelo podrían ser inválidos.");
    }
}

module.exports = { generateContent };

const axios = require('axios'); // Usaremos axios para llamadas REST

// --- CONFIGURACIÓN DE DEEPSEEK ---
// 🚨 Nota: La URL es el endpoint estándar para DeepSeek
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'; 
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY; // ¡La nueva variable de entorno!

if (!DEEPSEEK_API_KEY) {
    console.error('[DEEPSEEK SERVICE] ❌ ERROR CRÍTICO: DEEPSEEK_API_KEY no está definida.');
}

/**
 * Función para generar contenido usando la API REST de DeepSeek.
 * @param {string} userPrompt - El prompt actual del usuario.
 * @param {string} systemInstruction - La instrucción del sistema (persona de LIMEN, CREANOVA, etc.).
 * @param {Array<Object>} conversationHistory - Historial de conversación (si aplica).
 * @param {string} model - El modelo a usar (ej: 'deepseek-chat').
 */
async function generateContent(userPrompt, systemInstruction, conversationHistory = [], model = 'deepseek-chat') {
    if (!DEEPSEEK_API_KEY) {
        throw new Error("La clave de API de DeepSeek no está configurada.");
    }
    
    // El formato de mensajes REST (OpenAI-compatible)
    const messages = [
        { role: 'system', content: systemInstruction },
        ...conversationHistory.map(msg => ({ role: msg.role, content: msg.parts[0].text })), // Mapea el historial de Google al formato REST
        { role: 'user', content: userPrompt }
    ];

    try {
        const response = await axios.post(
            DEEPSEEK_API_URL,
            {
                model: model,
                messages: messages,
                temperature: 0.7, // Ajuste la creatividad
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
                },
                timeout: 30000 // 30 segundos de timeout
            }
        );

        const generatedResponse = response.data.choices[0].message.content;

        console.log('[DEEPSEEK SERVICE] Llamada exitosa a modelo %s.', model);
        return generatedResponse;

    } catch (error) {
        console.error('[DEEPSEEK SERVICE] ❌ FALLO DE API/CLIENTE:', error.response ? error.response.data : error.message);
        
        // Manejo de errores específicos para DeepSeek/REST
        if (error.response && error.response.status === 401) {
             throw new Error("Clave de API de DeepSeek no válida o no autorizada.");
        }
        throw new Error("Fallo en la comunicación con el servicio de IA de DeepSeek. Por favor, verifica el servicio y la clave.");
    }
}

module.exports = { generateContent };

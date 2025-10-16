const { GoogleGenAI } = require('@google/genai');

// Carga la clave API desde las variables de entorno de Render
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// Inicializa el cliente. El SDK busca automáticamente GEMINI_API_KEY.
// Usamos el constructor de GoogleGenAI directamente, que es la forma más reciente.
const ai = new GoogleGenAI(GEMINI_API_KEY);

/**
 * Función central para generar contenido con Gemini
 * @param {string} prompt El prompt del usuario.
 * @param {string} systemInstruction La instrucción de sistema o persona del modelo.
 * @param {Array<object>} history El historial de conversación (opcional).
 * @param {string} modelName El nombre del modelo a usar (ej: 'gemini-1.5-flash').
 * @returns {Promise<string>} La respuesta generada por la IA.
 */
async function generateContent(prompt, systemInstruction, history = [], modelName = 'gemini-1.5-flash') {
    try {
        // Formatear el historial existente para que el SDK lo entienda
        // El prompt del usuario se añade al final
        const contents = [
            ...history,
            { role: "user", parts: [{ text: prompt }] }
        ];

        // Definimos la configuración con la instrucción del sistema
        const config = {
            systemInstruction: systemInstruction,
            // Quitamos 'models/' aquí, el SDK lo añade o usa el alias correcto
        };

        const response = await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: config,
        });

        // Extraemos la respuesta de la manera segura del SDK
        const generatedText = response.text || "Lo siento, la IA no pudo generar una respuesta.";
        
        return generatedText;

    } catch (error) {
        console.error("Error en generateContent (SDK de Gemini):", error.message);
        // Si el error es de modelo, forzamos un mensaje útil en los logs de Render
        if (error.message.includes('model')) {
             console.error("¡ERROR CRÍTICO! El nombre del modelo puede ser incorrecto. Nombre usado:", modelName);
        }
        throw new Error("Fallo en el servicio de IA. Verifica logs.");
    }
}

module.exports = { generateContent };

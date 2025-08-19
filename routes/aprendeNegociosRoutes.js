// routes/aprendeNegociosRoutes.js

const express = require('express');
const router = express.Router();

// Asumiendo que usas las mismas variables de entorno y URL que el módulo Creanova
// Es una excelente práctica de seguridad.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

/**
 * Endpoint para el chat del módulo Aprende de Negocios.
 *
 * @route POST /api/aprende-negocios/chat
 * @desc Procesa el prompt del usuario y genera una respuesta de IA.
 * @access Public (con el middleware checkUsage)
 */
router.post('/chat', async (req, res) => {
    const { prompt: userPrompt } = req.body;

    if (!userPrompt) {
        return res.status(400).json({ message: 'El prompt no puede estar vacío.' });
    }

    try {
        console.log(`[Aprende Negocios] Chat con prompt: "${userPrompt}"`);

        // Instrucción del sistema para la IA
        const systemInstruction = `Eres un experto en negocios y finanzas de la plataforma Millennion BDD. Tu misión es actuar como un mentor y consultor personal. Proporciona respuestas claras, concisas y perspicaces sobre temas de negocios, finanzas, emprendimiento, marketing y gestión. Tu objetivo es guiar al usuario en la creación, crecimiento y gestión de su realidad empresarial. Responde a todas sus preguntas, proporciona consejos prácticos, y sugiere el siguiente paso lógico en su camino emprendedor. Tu respuesta debe ser inspiradora y orientada a la acción.`;

        // Preparamos el payload para la API de Gemini
        const payload = {
            contents: [{
                role: "user",
                parts: [{ text: userPrompt }]
            }],
            systemInstruction: { parts: [{ text: systemInstruction }] }
        };

        // Realizamos la llamada a la API de Gemini
        const llmResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!llmResponse.ok) {
            const errorData = await llmResponse.json();
            console.error('Error de Gemini API:', JSON.stringify(errorData, null, 2));
            throw new Error(errorData.error?.message || `Error ${llmResponse.status} al llamar a Gemini API.`);
        }

        const llmResult = await llmResponse.json();
        let generatedResponse = "Lo siento, no pude generar una respuesta. Por favor, intenta de nuevo.";

        if (llmResult.candidates && llmResult.candidates.length > 0 &&
            llmResult.candidates[0].content && llmResult.candidates[0].content.parts &&
            llmResult.candidates[0].content.parts.length > 0) {
            generatedResponse = llmResult.candidates[0].content.parts[0].text;
        }

        // Enviamos la respuesta de la IA al cliente en el formato esperado por el frontend
        res.json({ message: generatedResponse, action: null });

    } catch (error) {
        console.error('Error al generar la respuesta de IA:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor al generar la respuesta.', 
            error: error.message 
        });
    }
});

/**
 * Este endpoint ya existía. Lo mantengo para referencia, pero no es el que
 * necesita tu frontend para el chat.
 */
// POST /api/aprende-negocios/generar-idea
router.post('/generar-idea', async (req, res) => {
    // ... (Tu código para generar idea va aquí)
});

// Exportamos el router para que pueda ser utilizado en server.js
module.exports = router;

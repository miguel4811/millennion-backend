// routes/aprendeNegociosRoutes.js

const express = require('express');
const router = express.Router();

// Asumiendo que usas las mismas variables de entorno y URL que el módulo Creanova
// Es una excelente práctica de seguridad.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// --- Endpoint para generar ideas de negocio ---
// POST /api/aprende-negocios/generar-idea
// Asegúrate de que esta ruta no tenga el error de sintaxis que te mencioné (: sin nombre)
router.post('/generar-idea', async (req, res) => {
    const { userPrompt } = req.body;

    if (!userPrompt) {
        return res.status(400).json({ message: 'El prompt no puede estar vacío.' });
    }

    try {
        console.log(`[Aprende Negocios] Generando idea con prompt: "${userPrompt}"`);

        // La instrucción del sistema puede ser más específica para el propósito de este módulo.
        const systemInstruction = `Eres un experto en negocios y finanzas de la plataforma Millennion BDD. Tu misión es analizar el prompt del usuario y generar ideas de negocio viables y escalables, estrategias de marketing disruptivas, y modelos de negocio innovadores. Proporciona un plan de acción inicial o una descripción detallada que oriente al usuario en su camino emprendedor. Tu respuesta debe ser concisa, inspiradora y orientada a la acción.`;

        // Preparamos el payload (el cuerpo de la solicitud) para la API de Gemini
        const payload = {
            contents: [{
                role: "user",
                parts: [{ text: userPrompt }]
            }],
            systemInstruction: { parts: [{ text: systemInstruction }] }
        };

        // Realizamos la llamada directa a la API de Gemini usando 'fetch'
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
        let generatedIdea = "No se pudo generar una idea. Por favor, intenta de nuevo.";

        if (llmResult.candidates && llmResult.candidates.length > 0 &&
            llmResult.candidates[0].content && llmResult.candidates[0].content.parts &&
            llmResult.candidates[0].content.parts.length > 0) {
            generatedIdea = llmResult.candidates[0].content.parts[0].text;
        }

        // Enviamos la respuesta de la API al cliente
        res.json({ response: generatedIdea });

    } catch (error) {
        console.error('Error al generar la idea con IA:', error);
        res.status(500).json({ message: 'Error interno del servidor al generar la idea de negocio.', error: error.message });
    }
});

// Exportamos el router para que pueda ser utilizado en server.js
module.exports = router;

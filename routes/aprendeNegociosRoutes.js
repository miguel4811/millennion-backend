const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { checkUsage } = require('../middleware/usageMiddleware');
const User = require('../models/User');
const AnonymousUser = require('../models/AnonymousUser');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

const APRENDE_NEGOCIOS_ANON_LIMIT = 30;
const APRENDE_NEGOCIOS_USER_LIMIT = 30;

/**
 * Helper para detectar la intención del usuario de forma simple.
 * @param {string} prompt - El texto del usuario.
 * @returns {string} - La intención detectada ('learn_general', 'create_idea', 'process' o 'other').
 */
function detectIntent(prompt) {
    const p = prompt.toLowerCase();
    if (p.includes('enséñame') || p.includes('aprende') || p.includes('quiero aprender') || p.includes('ensename')) return 'learn_general';
    if (p.includes('crear') || p.includes('idea') || p.includes('propuesta')) return 'create_idea';
    if (p.includes('proceso') || p.includes('operación') || p.includes('sistema') || p.includes('delegar')) return 'process';
    return 'other';
}

/**
 * Función para interactuar con la API de Gemini y generar la lección.
 * @param {string} userPrompt - El prompt del usuario.
 * @param {string} userName - El nombre de usuario (o 'explorador' si es anónimo).
 * @returns {Promise<string>} - El HTML de la lección generada.
 */
async function generateLesson(userPrompt, userName) {
    const llmPrompt = `Eres un tutor experto en negocios. El usuario "${userName}" ha expresado el siguiente interés: "${userPrompt}".
    
    Tu tarea es generar una lección concisa en formato HTML que incluya:
    - Un título h3 con el texto "📚 Lección del día"
    - Un párrafo p con la explicación principal.
    - Un título h4 con el texto "💡 Reflexión clave"
    - Un párrafo p con una frase que incite a la reflexión.
    - Un párrafo p con el texto "❓ Pregunta para ti:" y una pregunta abierta para el usuario.
    
    No incluyas sugerencias de módulos en este HTML, solo el contenido de la lección.`;
    
    const payload = { contents: [{ role: "user", parts: [{ text: llmPrompt }] }] };

    const llmResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!llmResponse.ok) {
        const errorData = await llmResponse.json();
        throw new Error(errorData.error?.message || `Error ${llmResponse.status} al llamar a Gemini API.`);
    }

    const llmResult = await llmResponse.json();
    return llmResult.candidates[0]?.content?.parts[0]?.text || '<p>Lo siento, no pude generar una lección en este momento.</p>';
}

router.post('/', checkUsage, async (req, res) => {
    // La lógica de `ensureAnonymousUser` ya está manejada en `usageMiddleware`
    const { user, anonymousUser, isUserAuthenticated, aprendeNegociosUsage, aprendeNegociosLimit } = req;
    
    if (aprendeNegociosLimit !== -1 && aprendeNegociosUsage >= aprendeNegociosLimit) {
        const message = isUserAuthenticated
            ? `Has alcanzado tu límite de ${aprendeNegociosLimit} usos en "Aprende de Negocios" para este mes. Por favor, actualiza tu plan.`
            : `Has alcanzado tu límite de ${aprendeNegociosLimit} usos gratuitos en "Aprende de Negocios". Por favor, inicia sesión o regístrate para continuar.`;
        return res.status(403).json({ message });
    }

    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ message: 'El prompt no puede estar vacío.' });
    }

    try {
        const userName = user ? user.userName : 'explorador';
        const lessonHtml = await generateLesson(prompt, userName);
        
        const intent = detectIntent(prompt);
        let suggestion = '';
        let moduleAction = {};

        // Lógica de sugerencia de módulos
        if (intent === 'learn_general' || intent === 'create_idea') {
            suggestion = '¿Listo para aplicar esta lección? ¡Usa Creanova para forjar tu idea!';
            moduleAction.creanova = { message: 'Crear plantilla de negocio sugerida (idea + pasos iniciales)' };
        }
        if (intent === 'process') {
            suggestion = 'Para estructurar un sistema, ¡LÍMEN es tu guía!';
            moduleAction.limen = { message: 'Diseñar proceso operativo básico para delegar tareas' };
        }

        // Incrementa el uso y guarda
        if (user) {
            user.aprendeNegociosCurrentMonthUsage = (user.aprendeNegociosCurrentMonthUsage || 0) + 1;
            await user.save();
        } else if (anonymousUser) {
            anonymousUser.aprendeNegociosCurrentMonthUsage = (anonymousUser.aprendeNegociosCurrentMonthUsage || 0) + 1;
            await anonymousUser.save();
        }

        res.json({
            lessonHtml,
            suggestion, // Nuevo campo para la sugerencia de texto
            moduleAction
        });

    } catch (error) {
        console.error('Error al generar la lección con IA:', error);
        res.status(500).json({ message: 'Hubo un error al procesar tu solicitud.', error: error.message });
    }
});

module.exports = router;

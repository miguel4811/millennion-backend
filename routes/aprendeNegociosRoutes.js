const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { checkUsage } = require('../middleware/usageMiddleware');
const User = require('../models/User');
const AnonymousUser = require('../models/AnonymousUser');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

const APRENDE_NEGOCIOS_ANON_LIMIT = 30; // Límite de uso para usuarios anónimos
const APRENDE_NEGOCIOS_USER_LIMIT = 30; // Límite de uso para usuarios autenticados (plan "Free")

// Función para garantizar que un usuario anónimo tenga un ID y límites
const ensureAnonymousUser = async (req, res) => {
    if (req.isUserAuthenticated || req.anonymousUser) {
        return;
    }
    
    let anonymousId = req.headers['x-anonymous-id'];
    let anonymousUser = null;
    
    if (anonymousId) {
        anonymousUser = await AnonymousUser.findOne({ anonymousId });
    }

    if (!anonymousUser) {
        anonymousId = uuidv4();
        anonymousUser = new AnonymousUser({
            anonymousId,
            aprendeNegociosCurrentMonthUsage: 0,
            aprendeNegociosMonthlyLimit: APRENDE_NEGOCIOS_ANON_LIMIT,
        });
        await anonymousUser.save();
        res.setHeader('X-Set-Anonymous-ID', anonymousId);
    }

    req.anonymousUser = anonymousUser;
    req.aprendeNegociosUsage = anonymousUser.aprendeNegociosCurrentMonthUsage;
    req.aprendeNegociosLimit = anonymousUser.aprendeNegociosMonthlyLimit;
};

// Helper simple para detectar la intención del usuario
function detectIntent(prompt) {
    const p = prompt.toLowerCase();
    if (p.includes('enséñame') || p.includes('aprende') || p.includes('quiero aprender') || p.includes('ensename')) return 'learn_general';
    if (p.includes('crear') || p.includes('idea') || p.includes('propuesta')) return 'create_idea';
    if (p.includes('proceso') || p.includes('operación') || p.includes('sistema')) return 'process';
    return 'other';
}

router.post('/', checkUsage, async (req, res) => {
    await ensureAnonymousUser(req, res);

    const user = req.user;
    const anonymousUser = req.anonymousUser;
    const isUserAuthenticated = req.isUserAuthenticated;
    
    const currentUsage = req.aprendeNegociosUsage;
    const monthlyLimit = req.aprendeNegociosLimit;

    if (monthlyLimit !== -1 && currentUsage >= monthlyLimit) {
        return res.status(403).json({
            message: isUserAuthenticated
                ? `Has alcanzado tu límite de ${monthlyLimit} usos en "Aprende de Negocios" para este mes. Por favor, actualiza tu plan.`
                : `Has alcanzado tu límite de ${monthlyLimit} usos gratuitos en "Aprende de Negocios". Por favor, inicia sesión o regístrate para continuar.`
        });
    }

    const { prompt } = req.body;
    const intent = detectIntent(prompt || '');

    if (!prompt) {
        return res.status(400).json({ message: 'El prompt no puede estar vacío.' });
    }

    try {
        let lessonHtml, suggestion, moduleAction = {};

        // Utilizar la IA para generar el contenido de la lección
        const llmPrompt = `Eres un tutor experto en negocios. El usuario "${user ? user.userName : 'explorador'}" ha expresado el siguiente interés: "${prompt}".
        
        Tu tarea es generar una lección concisa en formato HTML que incluya:
        - Un título h3 con el texto "📚 Lección del día"
        - Un párrafo p con la explicación principal.
        - Un título h4 con el texto "💡 Reflexión clave"
        - Un párrafo p con una frase que incite a la reflexión.
        - Un párrafo p con el texto "❓ Pregunta para ti:" y una pregunta abierta para el usuario.
        
        Además, evalúa la intención del usuario y sugiere el módulo de Millennion más adecuado para el siguiente paso (Creanova para ideas o LÍMEN para procesos). No incluyas las sugerencias en el HTML.`;
        
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
        lessonHtml = llmResult.candidates[0]?.content?.parts[0]?.text || '<p>Lo siento, no pude generar una lección en este momento.</p>';

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
            suggestion,
            moduleAction,
            usage: user ? user.aprendeNegociosCurrentMonthUsage : (anonymousUser ? anonymousUser.aprendeNegociosCurrentMonthUsage : 0),
            limit: user ? user.aprendeNegociosMonthlyLimit : monthlyLimit,
            isUserAuthenticated
        });

    } catch (error) {
        console.error('Error al generar la lección con IA:', error);
        res.status(500).json({ message: 'Hubo un error al procesar tu solicitud.', error: error.message });
    }
});

module.exports = router;

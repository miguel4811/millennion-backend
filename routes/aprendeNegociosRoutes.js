// aprendeNegociosRoutes.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const AnonymousUser = require('../models/AnonymousUser');
const AprendenNegociosEntry = require('../models/AprendeNegociosEntry');
const { checkUsage } = require('../middleware/usageMiddleware');

// *** Importado para la interconexión ***
const Sigma = require('./sigmaRoutes.js');
const Engine = require('./engineRoutes.js');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

const ensureAnonymousUser = async (req, res) => {
    if (req.isUserAuthenticated || req.anonymousUser) {
        return;
    }
    
    const newAnonymousId = uuidv4();
    const newAnonymousUser = new AnonymousUser({
        anonymousId: newAnonymousId,
        aprendeNegociosCurrentMonthUsage: 0,
        aprendeNegociosMonthlyLimit: process.env.APRENDE_NEGOCIOS_ANON_LIMIT || 25,
    });
    await newAnonymousUser.save();

    req.anonymousUser = newAnonymousUser;
    req.aprendeNegociosUsage = newAnonymousUser.aprendeNegociosCurrentMonthUsage;
    req.aprendeNegociosLimit = newAnonymousUser.aprendeNegociosMonthlyLimit;

    res.setHeader('X-Set-Anonymous-ID', newAnonymousId);
};

// *** Objeto para guardar las recomendaciones pendientes para cada usuario ***
const recommendations = {};

// *** Función que Engine usará para enviar recomendaciones a este módulo ***
router.addRecommendation = (userId, message) => {
    recommendations[userId] = message;
};

// Nueva ruta para manejar el chat
router.post('/chat', checkUsage, async (req, res) => {
    await ensureAnonymousUser(req, res);
    
    const user = req.user;
    const anonymousUser = req.anonymousUser;
    const isUserAuthenticated = req.isUserAuthenticated;
    const currentUsage = req.aprendeNegociosUsage;
    const monthlyLimit = req.aprendeNegociosLimit;
    const { prompt } = req.body;
    const userId = user ? user._id : anonymousUser ? anonymousUser.anonymousId : 'anonymous';

    if (!prompt) {
        return res.status(400).json({ message: 'El prompt no puede estar vacío.' });
    }

    console.log(`[APRENDE DE NEGOCIOS] Recibiendo prompt de ${user ? user.userName : 'Anónimo'}: "${prompt}"`);

    // *** Nuevo: Notificar a Sigma sobre el evento de chat, para que decida si hay una recomendación ***
    Sigma.notify('aprendeNegocios', {
        type: 'chat',
        userId: userId,
        prompt: prompt
    });

    // *** MODIFICACIÓN CLAVE: El prompt ahora define la personalidad del mentor ***
    const llmPrompt = `Un usuario llamado "${user ? user.userName : 'explorador'}" ha pedido ayuda en el módulo "Aprende de Negocios" con la siguiente consulta: "${prompt}".

    Actúa como un **mentor de negocios de élite** y arquitecto de imperios. Tu rol no es solo dar información, sino moldear una mentalidad empresarial. Tu respuesta debe ser concisa, directa y orientada a la acción. Utiliza un tono motivador y enérgico, enfocado en estrategias prácticas y resultados.
    
    Considera los siguientes principios para tu respuesta:
    - **Piensa en sistemas, no en transacciones.**
    - **Crea dependencias inteligentes.**
    - **Domina el tiempo y la percepción.**
    - **Multiplica tus entradas de valor.**
    - **Analiza y absorbe conocimiento de los gigantes.**
    - **Actúa con audacia calculada.**

    La respuesta debe usar **Markdown** para un formato claro y legible. Utiliza negritas para resaltar conceptos clave. Asegúrate de que la respuesta sea relevante para la consulta del usuario, ofreciendo consejos de alto valor que reflejen esta mentalidad.`;

    try {
        const payload = { contents: [{ role: "user", parts: [{ text: llmPrompt }] }] };

        const llmResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!llmResponse.ok) {
            const errorData = await llmResponse.json();
            console.error('Error de Gemini API:', errorData);
            throw new Error(errorData.error?.message || `Error ${llmResponse.status} al llamar a Gemini API.`);
        }

        const llmResult = await llmResponse.json();
        let generatedResponse = "La mentalidad es tu primer activo. ¿Qué estrategia quieres forjar?";

        if (llmResult.candidates && llmResult.candidates.length > 0 &&
            llmResult.candidates[0].content && llmResult.candidates[0].content.parts &&
            llmResult.candidates[0].content.parts.length > 0) {
            generatedResponse = llmResult.candidates[0].content.parts[0].text;
        }

        if (user) {
            user.aprendeNegociosCurrentMonthUsage += 1;
            await user.save();
        } else if (anonymousUser) {
            anonymousUser.aprendeNegociosCurrentMonthUsage += 1;
            await anonymousUser.save();
        }

        const newEntry = new AprendenNegociosEntry({
            userId: user ? user._id : null,
            anonymousId: anonymousUser ? anonymousUser._id : null, 
            type: 'chat',
            query: prompt,
            response: generatedResponse,
            metadata: {
                userName: user ? user.userName : 'Anónimo'
            }
        });
        await newEntry.save();

        // *** Obtener la recomendación si existe ***
        const recommendation = recommendations[userId] || null;
        if (recommendation) {
            delete recommendations[userId];
        }

        setTimeout(() => {
            res.json({
                message: generatedResponse,
                usage: user ? user.aprendeNegociosCurrentMonthUsage : (anonymousUser ? anonymousUser.aprendeNegociosCurrentMonthUsage : 0),
                limit: user ? user.aprendeNegociosMonthlyLimit : monthlyLimit,
                isUserAuthenticated: isUserAuthenticated,
                recommendation: recommendation // Agregamos la recomendación
            });
        }, 1000);

    } catch (llmError) {
        console.error('Error al generar la respuesta con IA:', llmError);
        res.status(500).json({ message: 'Algo salió mal al procesar tu solicitud. Por favor, intenta de nuevo más tarde.', error: llmError.message });
    }
});

module.exports = router;

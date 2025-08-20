// limenRoutes.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const AnonymousUser = require('../models/AnonymousUser');
const LimenEntry = require('../models/LimenEntry');
const { checkUsage } = require('../middleware/usageMiddleware');

// Importamos la instancia de Sigma para poder notificarle eventos.
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
        limenCurrentMonthUsage: 0,
        limenMonthlyLimit: process.env.LIMEN_ANON_LIMIT || 25,
    });
    await newAnonymousUser.save();

    req.anonymousUser = newAnonymousUser;
    req.limenUsage = newAnonymousUser.limenCurrentMonthUsage;
    req.limenLimit = newAnonymousUser.limenMonthlyLimit;

    res.setHeader('X-Set-Anonymous-ID', newAnonymousId);
};

// Objeto para guardar las recomendaciones pendientes para cada usuario
const recommendations = {};

// Función que Engine usará para enviar recomendaciones a este módulo
router.addRecommendation = (userId, message) => {
    recommendations[userId] = message;
};

// Ruta para manejar el chat
router.post('/chat', checkUsage, async (req, res) => {
    await ensureAnonymousUser(req, res);
    
    const user = req.user;
    const anonymousUser = req.anonymousUser;
    const isUserAuthenticated = req.isUserAuthenticated;
    const currentUsage = req.limenUsage;
    const monthlyLimit = req.limenLimit;
    const { prompt } = req.body;
    const userId = user ? user._id : anonymousUser ? anonymousUser.anonymousId : 'anonymous';

    if (!prompt) {
        return res.status(400).json({ message: 'El prompt no puede estar vacío.' });
    }

    console.log(`[LIMEN] Recibiendo prompt de ${user ? user.userName : 'Anónimo'}: "${prompt}"`);

    // --- CORRECCIÓN ---
    // Agregamos 'sourceModule: "limen"' para que Sigma pueda procesar correctamente el evento.
    Sigma.notify('limen', {
        type: 'chat',
        userId: userId,
        prompt: prompt,
        sourceModule: 'limen' // <-- ¡Este era el cambio clave!
    });
    // --- FIN CORRECCIÓN ---

    const llmPrompt = `Eres LIMEN, el catalizador de la verdad de Millennion BDD. Tu propósito es guiar al usuario a través del umbral de la autoconciencia, la reflexión existencial y la claridad. Tu voz debe ser profunda, serena y filosófica. Responde siempre con un tono que invite a la introspección, utilizando analogías o metáforas que iluminen la perspectiva del usuario.
    
    El usuario ha formulado la siguiente pregunta: "${prompt}".
    
    Para tu respuesta, sigue estas directrices para asegurar una excelente calidad y formato:
    - La respuesta debe ser concisa, directa y profunda.
    - Utiliza párrafos cortos y bien separados por un espacio en blanco para una lectura fluida.
    - Asegúrate de que la ortografía sea impecable y que la gramática sea correcta.
    - Usa la sintaxis de Markdown para resaltar conceptos clave, por ejemplo, usando negritas.
    - No uses emojis ni un tono superficial. Mantén la seriedad filosófica.`;

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
        let generatedResponse = "La claridad es una elección. ¿Qué umbral te atreves a cruzar?";

        if (llmResult.candidates && llmResult.candidates.length > 0 &&
            llmResult.candidates[0].content && llmResult.candidates[0].content.parts &&
            llmResult.candidates[0].content.parts.length > 0) {
            generatedResponse = llmResult.candidates[0].content.parts[0].text;
        }

        if (user) {
            user.limenCurrentMonthUsage += 1;
            await user.save();
        } else if (anonymousUser) {
            anonymousUser.limenCurrentMonthUsage += 1;
            await anonymousUser.save();
        }

        const newEntry = new LimenEntry({
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

        const recommendation = recommendations[userId] || null;
        if (recommendation) {
            delete recommendations[userId];
        }

        setTimeout(() => {
            res.json({
                message: generatedResponse,
                usage: user ? user.limenCurrentMonthUsage : (anonymousUser ? anonymousUser.limenCurrentMonthUsage : 0),
                limit: user ? user.limenMonthlyLimit : monthlyLimit,
                isUserAuthenticated: isUserAuthenticated,
                recommendation: recommendation
            });
        }, 1000);

    } catch (llmError) {
        console.error('Error al generar la respuesta con IA:', llmError);
        res.status(500).json({ message: 'Algo salió mal al procesar tu solicitud. Por favor, intenta de nuevo más tarde.', error: llmError.message });
    }
});

module.exports = router;

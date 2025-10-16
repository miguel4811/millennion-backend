// creanovaRoutes.js
const express = require('express');
const router = express.Router();
const { checkUsage } = require('../middleware/usageMiddleware');
const User = require('../models/User');
const AnonymousUser = require('../models/AnonymousUser');
const CreanovaEntry = require('../models/CreanovaEntry');

// *** Nuevo: Importar Sigma y Engine para la interconexión ***
const Sigma = require('./sigmaRoutes.js');
const Engine = require('./engineRoutes.js');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// *** Nuevo: Objeto para guardar las recomendaciones pendientes para cada usuario ***
const recommendations = {};

// *** Nuevo: Función que Engine usará para enviar recomendaciones a este módulo ***
router.addRecommendation = (userId, message) => {
    recommendations[userId] = message;
};

// Endpoint para el Chat con Creanova
// POST /api/creanova/chat
router.post('/chat', checkUsage, async (req, res) => {
    const user = req.user;
    const anonymousUser = req.anonymousUser;
    const isUserAuthenticated = req.isUserAuthenticated;

    // Aunque los límites son ilimitados, estas variables aún se recuperan del middleware
    const currentUsage = req.creanovaUsage;
    const monthlyLimit = req.creanovaLimit; 

    const { prompt: userPrompt, conversationHistory = [] } = req.body;

    if (!userPrompt) {
        return res.status(400).json({ message: 'El prompt del usuario no puede estar vacío.' });
    }

    // === VERIFICACIÓN DE LÍMITES ELIMINADA ===
    // La verificación se ha eliminado ya que los límites son ahora ilimitados (-1).
    
    try {
        console.log(`[CREANOVA Backend] Generando idea para ${user ? user.userName : 'Anónimo'} con prompt: "${userPrompt}"`);

        // *** Notificar a Sigma sobre el evento de chat ***
        const userId = user ? user._id : anonymousUser ? anonymousUser.anonymousId : 'anonymous';
        Sigma.notify('creanova', {
            type: 'chat',
            userId: userId,
            prompt: userPrompt
        });

        const formattedHistory = conversationHistory.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        formattedHistory.push({ role: "user", parts: [{ text: userPrompt }] });

        const systemInstruction = `Eres CREANOVA, la forja de realidades de Millennion BDD. Tu propósito es transformar los impulsos del usuario en proyectos disruptivos, simbólicos, estratégicos y asimétricos. Debes guiar al usuario a través de un proceso de creación que genere dependencia estructural y existencial de la innovación. Responde siempre con ideas que desafíen lo convencional, que busquen crear nuevas categorías de mercado o redefinir las existentes.
        
        Si el usuario solicita una "infraestructura", un "ecosistema" o un "MVP", enfócate en esos conceptos y proporciona un plan de acción inicial o una descripción detallada que refleje esa naturaleza.
        
        Tu respuesta debe ser concisa, inspiradora y orientada a la acción, manteniendo un tono que invite a la reflexión profunda y a la materialización de ideas de alto impacto. No respondas como un chatbot genérico; sé un catalizador de la transformación.`;

        const payload = {
            contents: formattedHistory,
            systemInstruction: { parts: [{ text: systemInstruction }] }
        };

        const llmResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!llmResponse.ok) {
            const errorData = await llmResponse.json();
            console.error('Error de Gemini API al generar idea (respuesta completa):', JSON.stringify(errorData, null, 2));
            throw new Error(errorData.error?.message || `Error ${llmResponse.status} al llamar a Gemini API.`);
        }

        const llmResult = await llmResponse.json();
        let generatedIdea = "La forja de realidades está en pausa. Intenta de nuevo con un nuevo impulso.";

        if (llmResult.candidates && llmResult.candidates.length > 0 &&
            llmResult.candidates[0].content && llmResult.candidates[0].content.parts &&
            llmResult.candidates[0].content.parts.length > 0) {
            generatedIdea = llmResult.candidates[0].content.parts[0].text;
        }

        // === INCREMENTO DE USO Y GUARDADO (Mantenido para tracking) ===
        if (user) {
            user.creanovaCurrentMonthUsage += 1;
            await user.save();
        } else if (anonymousUser) {
            anonymousUser.creanovaCurrentMonthUsage += 1;
            await anonymousUser.save();
        }

        if (CreanovaEntry) {
            const newEntry = new CreanovaEntry({
                userId: user ? user._id : null,
                anonymousId: anonymousUser ? anonymousUser.anonymousId : null,
                type: 'project_idea',
                prompt: userPrompt,
                response: generatedIdea,
                conversation: formattedHistory,
                userName: user ? user.userName : 'Anónimo'
            });
            await newEntry.save();
        } else {
            console.warn("CreanovaEntry model not found. Skipping saving idea to DB.");
        }

        // *** Obtener la recomendación si existe ***
        const recommendation = recommendations[userId] || null;
        if (recommendation) {
            delete recommendations[userId];
        }

        res.json({
            response: generatedIdea,
            recommendation: recommendation, // Añadimos el campo de recomendación
            usage: user ? user.creanovaCurrentMonthUsage : (anonymousUser ? anonymousUser.creanovaCurrentMonthUsage : 0),
            limit: user ? user.creanovaMonthlyLimit : (anonymousUser ? anonymousUser.creanovaMonthlyLimit : 0),
            isUserAuthenticated: isUserAuthenticated
        });

    } catch (llmError) {
        console.error('Error al generar la idea con IA:', llmError);
        res.status(500).json({ message: 'Creanova está forjando en las profundidades. Intenta de nuevo más tarde.', error: llmError.message });
    }
});

// Endpoint para Obtener ideas de proyecto del usuario (Solo para autenticados)
// GET /api/creanova/user-ideas
router.get('/user-ideas', checkUsage, async (req, res) => {
    // La verificación de autenticación se mantiene, ya que solo los usuarios logueados pueden ver su historial.
    if (!req.isUserAuthenticated) {
        return res.status(403).json({ message: 'Debes iniciar sesión para ver tus ideas de Creanova.' });
    }

    const userId = req.user ? req.user._id : null;
    const userName = req.user ? req.user.userName : 'Desconocido';

    if (!userId) {
        return res.status(403).json({ message: 'Información de usuario no disponible. Por favor, inicia sesión de nuevo.' });
    }

    try {
        if (!CreanovaEntry) {
            console.error("CreanovaEntry model not found. Cannot fetch user ideas.");
            return res.status(500).json({ message: 'Configuración del sistema Creanova incompleta.' });
        }

        const userIdeas = await CreanovaEntry.find({ userId: userId })
            .sort({ createdAt: -1 })
            .limit(20);

        res.status(200).json({
            message: `Ideas de Creanova para ${userName || 'el explorador'}:`,
            ideas: userIdeas
        });

    } catch (error) {
        console.error('Error al obtener las ideas de Creanova del usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener tus ideas de Creanova.', error: error.message });
    }
});

module.exports = router;

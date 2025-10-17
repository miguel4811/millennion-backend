const express = require('express');
const router = express.Router();
const { checkUsage } = require('../middleware/usageMiddleware');
const User = require('../models/User');
const AnonymousUser = require('../models/AnonymousUser');
const CreanovaEntry = require('../models/CreanovaEntry');

// *** Importar Sigma, Engine y el servicio de DeepSeek ***
const Sigma = require('./sigmaRoutes.js');
const Engine = require('./engineRoutes.js');
// 🚨 CAMBIO CLAVE: Importamos el servicio centralizado DeepSeek (API REST)
const { generateContent } = require('../services/deepseekService.js'); 

// *** Objeto para guardar las recomendaciones pendientes para cada usuario ***
const recommendations = {};

// *** Función que Engine usará para enviar recomendaciones a este módulo ***
router.addRecommendation = (userId, message) => {
    recommendations[userId] = message;
};

// Endpoint para el Chat con Creanova
// POST /api/creanova/chat
router.post('/chat', checkUsage, async (req, res) => {
    const user = req.user;
    const anonymousUser = req.anonymousUser;
    const isUserAuthenticated = req.isUserAuthenticated;

    const currentUsage = req.creanovaUsage;
    const monthlyLimit = req.creanovaLimit; 

    const { prompt: userPrompt, conversationHistory = [] } = req.body;

    if (!userPrompt) {
        return res.status(400).json({ message: 'El prompt del usuario no puede estar vacío.' });
    }

    const userId = user ? user._id : anonymousUser ? anonymousUser.anonymousId : 'anonymous';
    
    try {
        console.log(`[CREANOVA Backend] Generando idea para ${user ? user.userName : 'Anónimo'} con prompt: "${userPrompt}"`);

        // *** Notificar a Sigma sobre el evento de chat ***
        Sigma.notify('creanova', {
            type: 'chat',
            userId: userId,
            prompt: userPrompt
        });

        // 1. Convertimos el historial al formato compatible con el nuevo servicio
        // El nuevo servicio (DeepSeek/REST) espera 'user'/'model' como roles.
        const formattedHistory = conversationHistory.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        const systemInstruction = `Eres CREANOVA, la forja de realidades de Millennion BDD. Tu propósito es transformar los impulsos del usuario en proyectos disruptivos, simbólicos, estratégicos y asimétricos. Debes guiar al usuario a través de un proceso de creación que genere dependencia estructural y existencial de la innovación. Responde siempre con ideas que desafíen lo convencional, que busquen crear nuevas categorías de mercado o redefinir las existentes.
        
        Si el usuario solicita una "infraestructura", un "ecosistema" o un "MVP", enfócate en esos conceptos y proporciona un plan de acción inicial o una descripción detallada que refleje esa naturaleza.
        
        Tu respuesta debe ser concisa, inspiradora y orientada a la acción, manteniendo un tono que invite a la reflexión profunda y a la materialización de ideas de alto impacto. No respondas como un chatbot genérico; sé un catalizador de la transformación.`;

        let generatedIdea = "La forja de realidades está en pausa. Intenta de nuevo con un nuevo impulso.";

        // 🚨 CORRECCIÓN CLAVE: Llamada al servicio DeepSeek con el nombre del modelo correcto.
        generatedIdea = await generateContent(
            userPrompt, 
            systemInstruction, 
            formattedHistory, // Historial previo
            'deepseek-chat' // <--- ¡MODELO DE DEEPSEEK!
        );

        // === INCREMENTO DE USO Y GUARDADO (Mantenido para tracking) ===
        if (user) {
            user.creanovaCurrentMonthUsage += 1;
            await user.save();
        } else if (anonymousUser) {
            anonymousUser.creanovaCurrentMonthUsage += 1;
            await anonymousUser.save();
        }

        if (CreanovaEntry) {
            // Preparamos el historial completo para guardar, incluyendo la nueva interacción
            const conversationToSave = [
                ...formattedHistory, 
                { role: 'user', parts: [{ text: userPrompt }] },
                { role: 'model', parts: [{ text: generatedIdea }] }
            ];

            const newEntry = new CreanovaEntry({
                userId: user ? user._id : null,
                anonymousId: anonymousUser ? anonymousUser.anonymousId : null,
                type: 'project_idea',
                prompt: userPrompt,
                response: generatedIdea,
                conversation: conversationToSave, 
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
            recommendation: recommendation, 
            usage: user ? user.creanovaCurrentMonthUsage : (anonymousUser ? anonymousUser.creanovaCurrentMonthUsage : 0),
            limit: user ? user.creanovaMonthlyLimit : (anonymousUser ? anonymousUser.creanovaMonthlyLimit : 0),
            isUserAuthenticated: isUserAuthenticated
        });

    } catch (llmError) {
        console.error('Error al generar la idea con IA (usando DeepSeek):', llmError);
        res.status(500).json({ message: 'Creanova está forjando en las profundidades. Intenta de nuevo más tarde.', error: llmError.message });
    }
});

// Endpoint para Obtener ideas de proyecto del usuario (Solo para autenticados)
// GET /api/creanova/user-ideas
router.get('/user-ideas', checkUsage, async (req, res) => {
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

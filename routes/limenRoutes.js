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
// 🚨 CAMBIO CLAVE: Importamos el servicio centralizado que usa el SDK
const { generateContent } = require('../services/geminiService'); 

// 🚨 REMOVIDO: Ya no se necesitan las constantes de API (GEMINI_API_KEY, GEMINI_API_URL)

// Constante para el límite ilimitado de usuarios anónimos
const UNLIMITED_ANON_LIMIT = Number.MAX_SAFE_INTEGER; 

const ensureAnonymousUser = async (req, res) => {
    if (req.isUserAuthenticated || req.anonymousUser) {
        return;
    }
    
    const newAnonymousId = uuidv4();
    const newAnonymousUser = new AnonymousUser({
        anonymousId: newAnonymousId,
        limenCurrentMonthUsage: 0,
        limenMonthlyLimit: UNLIMITED_ANON_LIMIT, // <-- MODIFICACIÓN CLAVE: Ilimitado
    });
    await newAnonymousUser.save();

    req.anonymousUser = newAnonymousUser;
    req.limenUsage = newAnonymousUser.limenCurrentMonthUsage;
    req.limenLimit = newAnonymousUser.limenMonthlyLimit; // Se asigna el límite ilimitado

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

    // Notificación a Sigma
    Sigma.notify('limen', {
        type: 'chat',
        userId: userId,
        prompt: prompt,
        sourceModule: 'limen'
    });

    // Separamos la persona (System Instruction) del prompt del usuario
    const systemInstruction = `Eres LIMEN, el catalizador de la verdad de Millennion BDD. Tu propósito es guiar al usuario a través del umbral de la autoconciencia, la reflexión existencial y la claridad. Tu voz debe ser profunda, serena y filosófica. Responde siempre con un tono que invite a la introspección, utilizando analogías o metáforas que iluminen la perspectiva del usuario.
    
    Para tu respuesta, sigue estas directrices para asegurar una excelente calidad y formato:
    - La respuesta debe ser concisa, directa y profunda.
    - Utiliza párrafos cortos y bien separados por un espacio en blanco para una lectura fluida.
    - Asegúrate de que la ortografía sea impecable y que la gramática sea correcta.
    - Usa la sintaxis de Markdown para resaltar conceptos clave, por ejemplo, usando negritas.
    - No uses emojis ni un tono superficial. Mantén la seriedad filosófica.`;
    
    let generatedResponse = "La claridad es una elección. ¿Qué umbral te atreves a cruzar?";

    try {
        // 🚨 CAMBIO CLAVE: USO DEL SERVICIO SDK CENTRALIZADO
        // Limen no utiliza historial de conversación, por lo que pasamos un array vacío
        generatedResponse = await generateContent(
            prompt, // El prompt actual del usuario
            systemInstruction, // La persona del modelo
            [], // Sin historial
            'gemini-1.5-flash' // Nombre del modelo
        );

        // Incremento de uso (mantenido para tracking)
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
        console.error('Error al generar la respuesta con IA (usando SDK):', llmError);
        res.status(500).json({ message: 'Algo salió mal al procesar tu solicitud. Por favor, intenta de nuevo más tarde.', error: llmError.message });
    }
});

module.exports = router;

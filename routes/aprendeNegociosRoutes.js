// aprendeNegociosRoutes.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const AnonymousUser = require('../models/AnonymousUser');
const AprendenNegociosEntry = require('../models/AprendeNegociosEntry');
const { checkUsage } = require('../middleware/usageMiddleware');
const Sigma = require('./sigmaRoutes.js'); // Asumiendo que es un módulo para notificaciones.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

// Constante para el límite ilimitado de usuarios anónimos
const UNLIMITED_ANON_LIMIT = Number.MAX_SAFE_INTEGER; 

// *** NUEVO: Objeto para almacenar el historial de conversación por usuario ***
const chatHistory = {};

// Objeto para guardar las recomendaciones pendientes
const recommendations = {};
router.addRecommendation = (userId, message) => {
    recommendations[userId] = message;
};

// Middleware para asegurar un usuario anónimo
const ensureAnonymousUser = async (req, res) => {
    // Si el usuario ya está autenticado o ya tiene un usuario anónimo (gracias a checkUsage), salir
    if (req.isUserAuthenticated || req.anonymousUser) {
        return;
    }
    
    // Crear un nuevo usuario anónimo si no existe uno
    const newAnonymousId = uuidv4();
    const newAnonymousUser = new AnonymousUser({
        anonymousId: newAnonymousId,
        aprendeNegociosCurrentMonthUsage: 0,
        aprendeNegociosMonthlyLimit: UNLIMITED_ANON_LIMIT, // <-- MODIFICACIÓN CLAVE: Ilimitado
    });
    
    // Guardar el nuevo usuario anónimo. Nota: En la versión anterior se estaba creando, 
    // pero el límite se asigna directamente al objeto, el cual se guarda en el controller.
    // Aquí actualizamos el objeto AnonymousUser si usamos el esquema actualizado.
    await newAnonymousUser.save(); 

    req.anonymousUser = newAnonymousUser;
    // Estos valores se usan para la respuesta del frontend.
    req.aprendeNegociosUsage = newAnonymousUser.aprendeNegociosCurrentMonthUsage;
    req.aprendeNegociosLimit = UNLIMITED_ANON_LIMIT; // Asignar el límite ilimitado
    
    // Devolver el ID al cliente para que lo guarde
    res.setHeader('X-Set-Anonymous-ID', newAnonymousId);
};

// @desc   Chat con el mentor de negocios
// @route   POST /api/aprende-negocios/chat
// @access  Public (Autenticado o Anónimo)
router.post('/chat', checkUsage, async (req, res) => {
    // Si checkUsage no encontró un usuario (autenticado o anónimo), lo creamos aquí.
    await ensureAnonymousUser(req, res);
    
    const user = req.user;
    const anonymousUser = req.anonymousUser;
    const isUserAuthenticated = req.isUserAuthenticated;
    // monthlyLimit ahora siempre será ilimitado (-1 para Auth, Max_Safe_Int para Anon)
    const monthlyLimit = req.aprendeNegociosLimit; 
    const { prompt } = req.body;
    // Usamos el ID de MongoDB si es anónimo, si es que el esquema de AprendeNegociosEntry lo requiere.
    const userId = user ? user._id : anonymousUser ? anonymousUser.anonymousId : 'anonymous'; 

    if (!prompt) {
        return res.status(400).json({ message: 'El prompt no puede estar vacío.' });
    }

    console.log(`[APRENDE DE NEGOCIOS] Recibiendo prompt de ${user ? user.userName : 'Anónimo'}: "${prompt}"`);

    // Notificar a Sigma
    Sigma.notify('aprendeNegocios', {
        type: 'chat',
        userId: userId,
        prompt: prompt
    });

    // 1. Iniciar el historial si no existe
    if (!chatHistory[userId]) {
        chatHistory[userId] = [];
    }

    // 2. Agregar el prompt del usuario al historial
    chatHistory[userId].push({ role: 'user', parts: [{ text: prompt }] });

    // 3. Crear el prompt principal para la IA
    const userPrompt = `Eres un mentor de negocios de élite y arquitecto de imperios. Tu rol no es solo dar información, sino moldear una mentalidad empresarial. Tu respuesta debe ser concisa, directa y orientada a la acción. Utiliza un tono motivador y enérgico, enfocado en estrategias prácticas y resultados.
    
    Considera los siguientes principios para tu respuesta:
    - **Piensa en sistemas, no en transacciones.**
    - **Crea dependencias inteligentes.**
    - **Domina el tiempo y la percepción.**
    - **Multiplica tus entradas de valor.**
    - **Analiza y absorbe conocimiento de los gigantes.**
    - **Actúa con audacia calculada.**
    
    La respuesta debe usar **Markdown** para un formato claro y legible. Utiliza negritas para resaltar conceptos clave. Asegúrate de que la respuesta sea relevante para la consulta del usuario, ofreciendo consejos de alto valor que reflejen esta mentalidad.`;
    
    // El historial se convierte en la conversación
    const conversation = [{ role: 'user', parts: [{ text: userPrompt }] }, ...chatHistory[userId]];
    
    try {
        const payload = {
            contents: conversation
        };
        
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

        // 4. Agregar la respuesta de la IA al historial
        chatHistory[userId].push({ role: 'model', parts: [{ text: generatedResponse }] });

        // Limitar el historial para evitar un token overflow
        if (chatHistory[userId].length > 10) {
            chatHistory[userId].splice(0, chatHistory[userId].length - 10);
        }

        // Lógica de conteo de uso (solo para fines de tracking, el límite se ignora)
        if (user) {
            user.aprendeNegociosCurrentMonthUsage += 1;
            await user.save();
        } else if (anonymousUser) {
            anonymousUser.aprendeNegociosCurrentMonthUsage += 1;
            await anonymousUser.save();
        }

        const newEntry = new AprendenNegociosEntry({
            userId: user ? user._id : null,
            // NOTA: Revisa tu esquema, el campo anonymousId en AprendenNegociosEntry 
            // debería ser el ID de MongoDB del AnonymousUser, no el anonymousId de la sesión.
            anonymousId: anonymousUser ? anonymousUser._id : null, 
            type: 'chat',
            query: prompt,
            response: generatedResponse,
            metadata: {
                userName: user ? user.userName : 'Anónimo'
            }
        });
        await newEntry.save();

        // Obtener la recomendación de Sigma, si existe
        const recommendation = recommendations[userId] || null;
        if (recommendation) {
            delete recommendations[userId];
        }

        setTimeout(() => {
            res.json({
                message: generatedResponse,
                // Los campos de usage y limit ahora reflejan el estado ilimitado
                usage: user ? user.aprendeNegociosCurrentMonthUsage : (anonymousUser ? anonymousUser.aprendeNegociosCurrentMonthUsage : 0),
                limit: user ? user.aprendeNegociosMonthlyLimit : monthlyLimit,
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

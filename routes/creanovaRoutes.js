// millennion/backend/routes/creanovaRoutes.js

const express = require('express');
const router = express.Router();
const { checkUsage } = require('../middleware/usageMiddleware'); // Importa el middleware corregido
const User = require('../models/User'); 
const AnonymousUser = require('../models/AnonymousUser'); 
const CreanovaEntry = require('../models/CreanovaEntry'); 

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""; 
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// --- Endpoint para Generar Ideas de Proyecto (AHORA SERÁ UN CHAT) ---
// POST /api/creanova/generate-project-idea
router.post('/generate-project-idea', checkUsage, async (req, res) => { // Usa checkUsage
    // Los datos del usuario (autenticado o anónimo) y los límites vienen de checkUsage
    const user = req.user; // Puede ser null si es anónimo
    const anonymousUser = req.anonymousUser; // Puede ser null si está autenticado
    const isUserAuthenticated = req.isUserAuthenticated;

    const currentUsage = req.creanovaUsage;
    const monthlyLimit = req.creanovaLimit;

    const { prompt: userPrompt, conversationHistory = [] } = req.body; 

    if (!userPrompt) {
        return res.status(400).json({ message: 'El prompt del usuario no puede estar vacío.' });
    }

    // === VERIFICACIÓN DE LÍMITES ===
    // Esta lógica es necesaria en el controlador, por si el middleware falla por alguna razón
    if (monthlyLimit !== -1 && currentUsage >= monthlyLimit) {
        return res.status(403).json({
            message: isUserAuthenticated
                ? `Has alcanzado tu límite mensual de Creanova (${monthlyLimit} usos). Por favor, actualiza tu plan.`
                : `Has alcanzado tu límite de usos gratuitos de Creanova (${monthlyLimit} usos). Por favor, inicia sesión o regístrate para continuar.`
        });
    }

    try {
        console.log(`[CREANOVA Backend] Generando idea para ${user ? user.userName : 'Anónimo'} con prompt: "${userPrompt}"`);

        // Formatear el historial de conversación para la API de Gemini
        const formattedHistory = conversationHistory.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        // Añadir el prompt actual del usuario al historial para la llamada a la IA
        formattedHistory.push({ role: "user", parts: [{ text: userPrompt }] });

        // Instrucción de sistema para la IA
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

        // === INCREMENTO DE USO Y GUARDADO ===
        if (user) {
            user.creanovaCurrentMonthUsage += 1;
            await user.save();
        } else if (anonymousUser) {
            anonymousUser.creanovaCurrentMonthUsage += 1;
            await anonymousUser.save();
        }

        // Guarda la entrada de Creanova en la base de datos
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

        res.json({
            idea: generatedIdea,
            usage: user ? user.creanovaCurrentMonthUsage : anonymousUser.creanovaCurrentMonthUsage,
            limit: user ? user.creanovaMonthlyLimit : monthlyLimit,
            isUserAuthenticated: isUserAuthenticated 
        });

    } catch (llmError) {
        console.error('Error al generar la idea con IA:', llmError);
        res.status(500).json({ message: 'Creanova está forjando en las profundidades. Intenta de nuevo más tarde.', error: llmError.message });
    }
});

// --- Endpoint para Obtener ideas de proyecto del usuario (Solo para autenticados) ---
// GET /api/creanova/user-ideas
router.get('/user-ideas', checkUsage, async (req, res) => { // Usa checkUsage
    // Esta ruta solo debería ser accesible para usuarios autenticados
    if (!req.isUserAuthenticated) {
        return res.status(403).json({ message: 'Debes iniciar sesión para ver tus ideas de Creanova.' });
    }

    const userId = req.userId;
    const userName = req.userName;

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

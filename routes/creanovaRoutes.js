const express = require('express');
const router = express.Router();
const { checkUsage } = require('../middleware/usageMiddleware');
const User = require('../models/User'); 
const AnonymousUser = require('../models/AnonymousUser'); 
const CreanovaEntry = require('../models/CreanovaEntry'); 

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""; 
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// --- Endpoint para el Chat con Creanova ---
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

    if (monthlyLimit !== -1 && currentUsage >= monthlyLimit) {
        return res.status(403).json({
            message: isUserAuthenticated
                ? `Has alcanzado tu límite mensual de Creanova (${monthlyLimit} usos). Por favor, actualiza tu plan.`
                : `Has alcanzado tu límite de usos gratuitos de Creanova (${monthlyLimit} usos). Por favor, inicia sesión o regístrate para continuar.`
        });
    }

    try {
        console.log(`[CREANOVA Backend] Generando idea para ${user ? user.userName : 'Anónimo'} con prompt: "${userPrompt}"`);

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

        if (user) {
            user.creanovaCurrentMonthUsage += 1;
            await user.save();
        } else if (anonymousUser) {
            anonymousUser.creanovaCurrentMonthUsage += 1;
            await anonymousUser.save();
        }

        // --- CAMBIO CLAVE AQUÍ: Lógica para guardar la entrada ---
        if (CreanovaEntry) {
            const entryData = {
                type: 'project_idea', 
                prompt: userPrompt, 
                response: generatedIdea, 
                conversation: formattedHistory, 
                userName: user ? user.userName : 'Anónimo'
            };

            // Solo agrega userId si existe un usuario autenticado
            if (user) {
                entryData.userId = user._id;
            }
            // Solo agrega anonymousId si existe un usuario anónimo
            else if (anonymousUser) {
                entryData.anonymousId = anonymousUser.anonymousId;
            }
            
            const newEntry = new CreanovaEntry(entryData);
            await newEntry.save();
        } else {
            console.warn("CreanovaEntry model not found. Skipping saving idea to DB.");
        }
        // --- FIN DEL CAMBIO CLAVE ---

        res.json({
            response: generatedIdea,
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
router.get('/user-ideas', checkUsage, async (req, res) => {
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

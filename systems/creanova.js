const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware'); 
const User = require('../models/User'); 
const CreanovaEntry = require('../models/CreanovaEntry'); // Asegúrate de que este modelo exista

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""; 
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// --- Endpoint para Generar Ideas de Proyecto (AHORA SERÁ UN CHAT) ---
// POST /api/creanova/generate-project-idea
router.post('/generate-project-idea', protect, async (req, res) => {
    const userId = req.userId;
    const userName = req.userName;
    const { prompt: userPrompt, conversationHistory = [] } = req.body; 

    if (!userPrompt) {
        return res.status(400).json({ message: 'El prompt del usuario no puede estar vacío.' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        // Lógica de límites de uso
        if (user.creanovaMonthlyLimit !== -1 && user.creanovaCurrentMonthUsage >= user.creanovaMonthlyLimit) {
            return res.status(403).json({ message: 'Has alcanzado tu límite mensual de Creanova. Por favor, actualiza tu plan.' });
        }

        console.log(`[CREANOVA Backend] Generando idea para ${userName || userId} con prompt: "${userPrompt}"`);

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
            // --- INICIO DE DEPURACIÓN MEJORADA ---
            console.error('Error de Gemini API al generar idea (respuesta completa):', JSON.stringify(errorData, null, 2));
            // --- FIN DE DEPURACIÓN MEJORADA ---
            throw new Error(errorData.error?.message || `Error ${llmResponse.status} al llamar a Gemini API.`);
        }

        const llmResult = await llmResponse.json();
        let generatedIdea = "La forja de realidades está en pausa. Intenta de nuevo con un nuevo impulso."; 

        if (llmResult.candidates && llmResult.candidates.length > 0 &&
            llmResult.candidates[0].content && llmResult.candidates[0].content.parts &&
            llmResult.candidates[0].content.parts.length > 0) {
            generatedIdea = llmResult.candidates[0].content.parts[0].text;
        }

        user.creanovaCurrentMonthUsage += 1;
        await user.save();

        // Guarda la entrada de Creanova en la base de datos
        if (CreanovaEntry) { 
            const newEntry = new CreanovaEntry({
                userId: userId,
                type: 'project_idea', 
                prompt: userPrompt, 
                response: generatedIdea, 
                conversation: formattedHistory, 
                userName: userName 
            });
            await newEntry.save();
        } else {
            console.warn("CreanovaEntry model not found. Skipping saving idea to DB.");
        }

        res.json({ idea: generatedIdea, usage: user.creanovaCurrentMonthUsage, limit: user.creanovaMonthlyLimit });

    } catch (llmError) {
        console.error('Error al generar la idea con IA:', llmError);
        res.status(500).json({ message: 'Creanova está forjando en las profundidades. Intenta de nuevo más tarde.', error: llmError.message });
    }
});

// --- Endpoint para Obtener ideas de proyecto del usuario ---
// GET /api/creanova/user-ideas
router.get('/user-ideas', protect, async (req, res) => {
    const userId = req.userId;
    const userName = req.userName;

    if (!userId) {
        return res.status(401).json({ message: 'Usuario no autenticado.' });
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

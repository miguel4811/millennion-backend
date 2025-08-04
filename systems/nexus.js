const express = require('express');
const router = express.Router();
// ¡CORRECCIÓN AQUÍ! Importa 'protect' usando desestructuración
const { protect } = require('../middleware/authMiddleware'); // Asegúrate de que esta ruta sea correcta
const User = require('../models/User'); // Para acceder a los datos del usuario si es necesario
// const NexusEntry = require('../models/NexusEntry'); // Si tienes un modelo para guardar las entradas de Nexus

// Asegúrate de que GEMINI_API_KEY esté en tu .env del backend
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""; 
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// --- Endpoint de ejemplo para NEXUS (Conexiones y Sinergias) ---
// POST /api/nexus/find-synergy
router.post('/find-synergy', protect, async (req, res) => {
    const userId = req.userId;
    const userName = req.userName;
    const { elements, context } = req.body; // Elementos a conectar y el contexto

    if (!elements || !Array.isArray(elements) || elements.length < 2) {
        return res.status(400).json({ message: 'Se requieren al menos dos elementos para encontrar sinergias.' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        // --- Lógica de límites de uso para Nexus (si aplica) ---
        // Necesitarías añadir 'nexusMonthlyLimit' y 'nexusCurrentMonthUsage' a tu modelo User
        /*
        if (user.nexusMonthlyLimit !== -1 && user.nexusCurrentMonthUsage >= user.nexusMonthlyLimit) {
            return res.status(403).json({ message: 'Has alcanzado tu límite mensual de Nexus. Por favor, actualiza tu plan.' });
        }
        */

        console.log(`[NEXUS Backend] Buscando sinergias para ${userName || userId} entre: ${elements.join(', ')}`);

        // Diseño del prompt para la IA de Nexus (con tu visión de conexión y asimetría)
        const prompt = `Como NEXUS, el motor de conexiones y sinergias de Millennion BDD, tu misión es revelar las interconexiones ocultas y las sinergias asimétricas entre los siguientes elementos: [${elements.join(', ')}]. El contexto es: "${context || 'general'}". Proporciona una explicación de cómo estos elementos pueden combinarse para crear un valor exponencial o una ventaja estratégica inesperada. Tu respuesta debe ser concisa, visionaria y enfocada en el potencial de transformación.`;

        const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

        const llmResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!llmResponse.ok) {
            const errorData = await llmResponse.json();
            console.error('Error de Gemini API al buscar sinergias:', errorData);
            throw new Error(errorData.error?.message || `Error ${llmResponse.status} al llamar a Gemini API.`);
        }

        const llmResult = await llmResponse.json();
        let synergyResult = "NEXUS está tejiendo la red de posibilidades. Intenta de nuevo más tarde."; // Frase fallback

        if (llmResult.candidates && llmResult.candidates.length > 0 &&
            llmResult.candidates[0].content && llmResult.candidates[0].content.parts &&
            llmResult.candidates[0].content.parts.length > 0) {
            synergyResult = llmResult.candidates[0].content.parts[0].text;
        }

        // Incrementar el uso mensual de Nexus (si aplica)
        /*
        user.nexusCurrentMonthUsage = (user.nexusCurrentMonthUsage || 0) + 1;
        await user.save();
        */

        // Puedes guardar la entrada de Nexus en la base de datos si tienes un modelo NexusEntry
        /*
        const newEntry = new NexusEntry({
            userId: userId,
            type: 'synergy_analysis',
            query: { elements, context },
            response: synergyResult,
            metadata: {
                userName: userName
            }
        });
        await newEntry.save();
        */

        res.json({ synergy: synergyResult /*, usage: user.nexusCurrentMonthUsage, limit: user.nexusMonthlyLimit */ });

    } catch (llmError) {
        console.error('Error al encontrar sinergias con IA:', llmError);
        res.status(500).json({ message: 'NEXUS está explorando las interconexiones. Intenta de nuevo más tarde.', error: llmError.message });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
// ¡CORRECCIÓN AQUÍ! Importa 'protect' usando desestructuración
const { protect } = require('../middleware/authMiddleware'); // Asegúrate de que esta ruta sea correcta
const User = require('../models/User'); // Para acceder a los datos del usuario si es necesario
// const EngineEntry = require('../models/EngineEntry'); // Si tienes un modelo para guardar las entradas de Engine

// Asegúrate de que GEMINI_API_KEY esté en tu .env del backend
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""; 
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// --- Endpoint de ejemplo para ENGINE (Procesamiento y Optimización) ---
// POST /api/engine/optimize
router.post('/optimize', protect, async (req, res) => {
    const userId = req.userId;
    const userName = req.userName;
    const { inputData, optimizationGoal } = req.body; // Datos a optimizar y objetivo

    if (!inputData) {
        return res.status(400).json({ message: 'Los datos de entrada no pueden estar vacíos.' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        // --- Lógica de límites de uso para Engine (si aplica) ---
        // Necesitarías añadir 'engineMonthlyLimit' y 'engineCurrentMonthUsage' a tu modelo User
        /*
        if (user.engineMonthlyLimit !== -1 && user.engineCurrentMonthUsage >= user.engineMonthlyLimit) {
            return res.status(403).json({ message: 'Has alcanzado tu límite mensual de Engine. Por favor, actualiza tu plan.' });
        }
        */

        console.log(`[ENGINE Backend] Optimizando para ${userName || userId} con objetivo: ${optimizationGoal}`);

        // Diseño del prompt para la IA de Engine (con tu visión de eficiencia y poder estructural)
        const prompt = `Como ENGINE, el motor de procesamiento y optimización de Millennion BDD, tu tarea es tomar los siguientes datos de entrada: "${JSON.stringify(inputData)}". El objetivo del usuario "${userName || 'el optimizador'}" es: "${optimizationGoal}". Proporciona una solución optimizada, identifica ineficiencias y sugiere un camino para maximizar el poder estructural. Tu respuesta debe ser concisa, práctica y enfocada en la eficiencia y el impacto.`;

        const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

        const llmResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!llmResponse.ok) {
            const errorData = await llmResponse.json();
            console.error('Error de Gemini API al optimizar:', errorData);
            throw new Error(errorData.error?.message || `Error ${llmResponse.status} al llamar a Gemini API.`);
        }

        const llmResult = await llmResponse.json();
        let optimizationResult = "ENGINE está calibrando los engranajes. Intenta de nuevo más tarde."; // Frase fallback

        if (llmResult.candidates && llmResult.candidates.length > 0 &&
            llmResult.candidates[0].content && llmResult.candidates[0].content.parts &&
            llmResult.candidates[0].content.parts.length > 0) {
            optimizationResult = llmResult.candidates[0].content.parts[0].text;
        }

        // Incrementar el uso mensual de Engine (si aplica)
        /*
        user.engineCurrentMonthUsage = (user.engineCurrentMonthUsage || 0) + 1;
        await user.save();
        */

        // Puedes guardar la entrada de Engine en la base de datos si tienes un modelo EngineEntry
        /*
        const newEntry = new EngineEntry({
            userId: userId,
            type: 'optimization',
            query: { inputData, optimizationGoal },
            response: optimizationResult,
            metadata: {
                userName: userName
            }
        });
        await newEntry.save();
        */

        res.json({ result: optimizationResult /*, usage: user.engineCurrentMonthUsage, limit: user.engineMonthlyLimit */ });

    } catch (llmError) {
        console.error('Error al optimizar con IA:', llmError);
        res.status(500).json({ message: 'ENGINE está reconfigurando la realidad. Intenta de nuevo más tarde.', error: llmError.message });
    }
});

module.exports = router;

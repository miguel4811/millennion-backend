const express = require('express');
const router = express.Router();
// ¡CORRECCIÓN AQUÍ! Importa 'protect' usando desestructuración
const { protect } = require('../middleware/authMiddleware'); // Asegúrate de que esta ruta sea correcta
const User = require('../models/User'); // Para acceder a los límites del usuario
// const SigmaEntry = require('../models/SigmaEntry'); // Si tienes un modelo para guardar las entradas de Sigma

// Asegúrate de que GEMINI_API_KEY esté en tu .env del backend
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""; 
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// --- Endpoint de ejemplo para SIGMA (Análisis Estratégico) ---
// POST /api/sigma/analyze
router.post('/analyze', protect, async (req, res) => {
    const userId = req.userId;
    const userName = req.userName;
    const { dataToAnalyze, analysisType } = req.body; // Datos y tipo de análisis

    if (!dataToAnalyze) {
        return res.status(400).json({ message: 'Los datos para analizar no pueden estar vacíos.' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        // --- Lógica de límites de uso para Sigma (si aplica) ---
        // Asumiendo que Sigma también tiene un límite, similar a Creanova/Limen
        // Necesitarías añadir 'sigmaMonthlyLimit' y 'sigmaCurrentMonthUsage' a tu modelo User
        /*
        if (user.sigmaMonthlyLimit !== -1 && user.sigmaCurrentMonthUsage >= user.sigmaMonthlyLimit) {
            return res.status(403).json({ message: 'Has alcanzado tu límite mensual de Sigma. Por favor, actualiza tu plan.' });
        }
        */

        console.log(`[SIGMA Backend] Realizando análisis para ${userName || userId} de tipo: ${analysisType}`);

        // Diseño del prompt para la IA de Sigma (con tu visión estratégica)
        const prompt = `Como SIGMA, el motor de análisis estratégico de Millennion BDD, tu tarea es transformar los datos proporcionados por el usuario "${userName || 'el estratega'}" en insights asimétricos y simbólicos que impulsen la toma de decisiones. El usuario ha solicitado un análisis de tipo "${analysisType}" para los siguientes datos: "${dataToAnalyze}". Ofrece una perspectiva disruptiva, identifica patrones ocultos y sugiere movimientos estratégicos no obvios. Tu respuesta debe ser concisa, profunda y orientada a generar una ventaja competitiva única.`;

        const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

        const llmResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!llmResponse.ok) {
            const errorData = await llmResponse.json();
            console.error('Error de Gemini API al realizar análisis:', errorData);
            throw new Error(errorData.error?.message || `Error ${llmResponse.status} al llamar a Gemini API.`);
        }

        const llmResult = await llmResponse.json();
        let analysisResult = "SIGMA está procesando la complejidad. Intenta de nuevo más tarde."; // Frase fallback

        if (llmResult.candidates && llmResult.candidates.length > 0 &&
            llmResult.candidates[0].content && llmResult.candidates[0].content.parts &&
            llmResult.candidates[0].content.parts.length > 0) {
            analysisResult = llmResult.candidates[0].content.parts[0].text;
        }

        // Incrementar el uso mensual de Sigma (si aplica)
        /*
        user.sigmaCurrentMonthUsage = (user.sigmaCurrentMonthUsage || 0) + 1;
        await user.save();
        */

        // Puedes guardar la entrada de Sigma en la base de datos si tienes un modelo SigmaEntry
        /*
        const newEntry = new SigmaEntry({
            userId: userId,
            type: 'analysis',
            query: dataToAnalyze,
            response: analysisResult,
            metadata: {
                analysisType: analysisType,
                userName: userName
            }
        });
        await newEntry.save();
        */

        res.json({ analysis: analysisResult /*, usage: user.sigmaCurrentMonthUsage, limit: user.sigmaMonthlyLimit */ });

    } catch (llmError) {
        console.error('Error al realizar el análisis con IA:', llmError);
        res.status(500).json({ message: 'SIGMA está inmerso en la matriz. Intenta de nuevo más tarde.', error: llmError.message });
    }
});

module.exports = router;

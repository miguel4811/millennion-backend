const express = require('express');
const router = express.Router();
// ¡CORRECCIÓN AQUÍ! Importa 'protect' usando desestructuración
const { protect } = require('../middleware/authMiddleware'); // Asegúrate de que esta ruta sea correcta
const User = require('../models/User'); // Para acceder a los datos del usuario si es necesario
// const FinanceEntry = require('../models/FinanceEntry'); // Si tienes un modelo para guardar las entradas de Finance

// Asegúrate de que GEMINI_API_KEY esté en tu .env del backend
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""; 
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// --- Endpoint de ejemplo para FINANCE (Análisis Financiero/Estratégico) ---
// POST /api/finance/analyze-financials
router.post('/analyze-financials', protect, async (req, res) => {
    const userId = req.userId;
    const userName = req.userName;
    const { financialData, analysisGoal } = req.body; // Datos financieros y objetivo del análisis

    if (!financialData) {
        return res.status(400).json({ message: 'Los datos financieros no pueden estar vacíos.' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        // --- Lógica de límites de uso para Finance (si aplica) ---
        // Necesitarías añadir 'financeMonthlyLimit' y 'financeCurrentMonthUsage' a tu modelo User
        /*
        if (user.financeMonthlyLimit !== -1 && user.financeCurrentMonthUsage >= user.financeMonthlyLimit) {
            return res.status(403).json({ message: 'Has alcanzado tu límite mensual de Finance. Por favor, actualiza tu plan.' });
        }
        */

        console.log(`[FINANCE Backend] Realizando análisis financiero para ${userName || userId} con objetivo: ${analysisGoal}`);

        // Diseño del prompt para la IA de Finance (con tu visión estratégica y asimétrica)
        const prompt = `Como FINANCE, el motor de estrategia financiera de Millennion BDD, tu tarea es analizar los siguientes datos financieros: "${JSON.stringify(financialData)}". El objetivo del usuario "${userName || 'el financiero'}" es: "${analysisGoal}". Proporciona un análisis que revele oportunidades asimétricas, riesgos ocultos y estrategias financieras disruptivas. Tu respuesta debe ser concisa, orientada a la toma de decisiones de alto impacto y a la optimización del poder estructural financiero.`;

        const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

        const llmResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!llmResponse.ok) {
            const errorData = await llmResponse.json();
            console.error('Error de Gemini API al analizar finanzas:', errorData);
            throw new Error(errorData.error?.message || `Error ${llmResponse.status} al llamar a Gemini API.`);
        }

        const llmResult = await llmResponse.json();
        let financialAnalysisResult = "FINANCE está calculando las variables. Intenta de nuevo más tarde."; // Frase fallback

        if (llmResult.candidates && llmResult.candidates.length > 0 &&
            llmResult.candidates[0].content && llmResult.candidates[0].content.parts &&
            llmResult.candidates[0].content.parts.length > 0) {
            financialAnalysisResult = llmResult.candidates[0].content.parts[0].text;
        }

        // Incrementar el uso mensual de Finance (si aplica)
        /*
        user.financeCurrentMonthUsage = (user.financeCurrentMonthUsage || 0) + 1;
        await user.save();
        */

        // Puedes guardar la entrada de Finance en la base de datos si tienes un modelo FinanceEntry
        /*
        const newEntry = new FinanceEntry({
            userId: userId,
            type: 'financial_analysis',
            query: { financialData, analysisGoal },
            response: financialAnalysisResult,
            metadata: {
                userName: userName
            }
        });
        await newEntry.save();
        */

        res.json({ analysis: financialAnalysisResult /*, usage: user.financeCurrentMonthUsage, limit: user.financeMonthlyLimit */ });

    } catch (llmError) {
        console.error('Error al realizar análisis financiero con IA:', llmError);
        res.status(500).json({ message: 'FINANCE está procesando los flujos. Intenta de nuevo más tarde.', error: llmError.message });
    }
});

module.exports = router;

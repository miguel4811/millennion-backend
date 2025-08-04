const express = require('express');
const router = express.Router();
// ¡CORRECCIÓN AQUÍ! Importa 'protect' usando desestructuración
const { protect } = require('../middleware/authMiddleware'); // Asegúrate de que esta ruta sea correcta
const LimenEntry = require('../models/LimenEntry'); // ¡Importa tu nuevo modelo LimenEntry!

// Asegúrate de que GEMINI_API_KEY esté en tu .env del backend
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""; 
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// --- Endpoint para Generar Revelaciones ---
// GET /api/limen/revelation
router.get('/revelation', protect, async (req, res) => { // Usa 'protect' directamente
    const userId = req.userId;
    const userName = req.userName;
    console.log(`[LÍMEN Backend] Generando revelación para ${userName || userId}`);

    const prompt = `Genera una frase de sabiduría, una revelación corta y profunda, o una afirmación inspiradora para un explorador espiritual. Debe ser concisa y tener un tono místico/filosófico. Si conoces el nombre del usuario ("${userName || 'explorador'}"), puedes intentar incorporarlo sutilmente o personalizar el mensaje. Asegúrate que la frase no sea demasiado larga. Ejemplo: "En el silencio, encuentras la voz del cosmos, explorador."`;

    try {
        const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

        const llmResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!llmResponse.ok) {
            const errorData = await llmResponse.json();
            console.error('Error de Gemini API al generar revelación:', errorData);
            throw new Error(errorData.error?.message || `Error ${llmResponse.status} al llamar a Gemini API.`);
        }

        const llmResult = await llmResponse.json();
        let generatedPhrase = "El eco de tu alma ya tiene la respuesta. Escucha en el silencio de tu ser."; // Frase fallback

        if (llmResult.candidates && llmResult.candidates.length > 0 &&
            llmResult.candidates[0].content && llmResult.candidates[0].content.parts &&
            llmResult.candidates[0].content.parts.length > 0) {
            generatedPhrase = llmResult.candidates[0].content.parts[0].text;
        }

        // Guarda la revelación en la base de datos
        const newEntry = new LimenEntry({
            userId: userId,
            type: 'revelation',
            response: generatedPhrase,
            metadata: {
                prompt: prompt, // Guarda el prompt usado para referencia
                userName: userName
            }
        });
        await newEntry.save();

        setTimeout(() => { // Mantiene el setTimeout para simular tiempo de "meditación"
            res.json({ phrase: generatedPhrase });
        }, 1000);

    } catch (llmError) {
        console.error('Error al generar la revelación con IA:', llmError);
        res.status(500).json({ message: 'Límen está meditando profundamente. Intenta de nuevo más tarde.', error: llmError.message });
    }
});

// --- Endpoint para Recibir Dudas/Preguntas ---
// POST /api/limen/doubt
router.post('/doubt', protect, async (req, res) => { // Usa 'protect' directamente
    const userId = req.userId;
    const userName = req.userName;
    const { question } = req.body;

    if (!question) {
        return res.status(400).json({ message: 'La pregunta no puede estar vacía.' });
    }
    console.log(`[LÍMEN Backend] Recibiendo duda de ${userName || userId}: "${question}"`);

    const prompt = `El usuario "${userName || 'explorador'}" ha expresado la siguiente duda o pregunta interna: "${question}". Responde con una "respuesta simbólica". Evita dar consejos directos o lógicos. En su lugar, ofrece una metáfora, una afirmación enigmática, una pregunta reflexiva, o una analogía que invite a la introspección y a encontrar la propia respuesta. El tono debe ser místico y de guía intuitiva, no directa. La respuesta debe ser concisa.`;

    try {
        const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

        const llmResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!llmResponse.ok) {
            const errorData = await llmResponse.json();
            console.error('Error de Gemini API al responder duda:', errorData);
            throw new Error(errorData.error?.message || `Error ${llmResponse.status} al llamar a Gemini API.`);
        }

        const llmResult = await llmResponse.json();
        let symbolicAnswer = "El eco de tu alma ya tiene la respuesta. Escucha en el silencio de tu ser."; // Frase fallback

        if (llmResult.candidates && llmResult.candidates.length > 0 &&
            llmResult.candidates[0].content && llmResult.candidates[0].content.parts &&
            llmResult.candidates[0].content.parts.length > 0) {
            symbolicAnswer = llmResult.candidates[0].content.parts[0].text;
        }

        // Guarda la duda y su respuesta en la base de datos
        const newEntry = new LimenEntry({
            userId: userId,
            type: 'doubt_response',
            query: question, // Guardamos la pregunta del usuario
            response: symbolicAnswer,
            metadata: {
                prompt: prompt, // Guarda el prompt usado
                userName: userName
            }
        });
        await newEntry.save();

        setTimeout(() => {
            res.json({ answer: symbolicAnswer });
        }, 1000);

    } catch (llmError) {
        console.error('Error al responder la duda con IA:', llmError);
        res.status(500).json({ message: 'Límen está inmerso en el éter. Intenta de nuevo más tarde.', error: llmError.message });
    }
});

// --- Endpoint para Rituales (Ejemplo) ---
// POST /api/limen/ritual
router.post('/ritual', protect, async (req, res) => { // Usa 'protect' directamente
    const userId = req.userId;
    const userName = req.userName;
    const { ritualType, data } = req.body;

    console.log(`[LÍMEN Backend] Usuario ${userName || userId} activando ritual: ${ritualType} con datos:`, data);

    // Aquí podrías implementar lógica más compleja, como:
    // - Verificar condiciones para el ritual (ej. si el usuario ha completado X tareas)
    // - Guardar el ritual activado en la base de datos
    // - Desbloquear características reales en la cuenta del usuario (ej. actualizar un campo en el modelo de usuario)
    try {
        if (ritualType === 'initiation_ritual') {
            // Ejemplo: Guardar un registro del ritual activado
            const newEntry = new LimenEntry({
                userId: userId,
                type: 'ritual_activation', // Puedes añadir un nuevo tipo para esto en el esquema si es necesario
                query: `Activación de ritual: ${ritualType}`,
                response: `Ritual de iniciación completado por ${userName || 'el explorador'}.`,
                metadata: {
                    ritualType: ritualType,
                    data: data
                }
            });
            await newEntry.save(); // Guarda el evento del ritual

            setTimeout(() => {
                res.json({ status: 'success', message: `Ritual '${ritualType}' completado por ${userName || 'el explorador'}. Has desbloqueado una nueva percepción.` });
            }, 500);
        } else {
            setTimeout(() => {
                res.status(400).json({ status: 'error', message: `Ritual '${ritualType}' desconocido o no permitido para ${userName || 'el explorador'}.` });
            }, 500);
        }
    } catch (error) {
        console.error('Error al procesar el ritual:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al procesar el ritual.', error: error.message });
    }
});

// --- Opcional: Endpoint para obtener el historial de Limen ---
router.get('/history', protect, async (req, res) => { // Usa 'protect' directamente
    const userId = req.userId;
    const userName = req.userName;
    console.log(`[LÍMEN Backend] Obteniendo historial para ${userName || userId}`);

    try {
        const history = await LimenEntry.find({ userId: userId }).sort({ createdAt: -1 });
        res.json({
            message: `Tu historial con Límen, ${userName || 'explorador'}:`,
            history: history.map(entry => entry.toObject())
        });
    } catch (error) {
        console.error('Error al obtener el historial de Limen:', error);
        res.status(500).json({ message: 'Error al obtener tu historial con Límen.', error: error.message });
    }
});


module.exports = router;

const express = require('express');
const router = express.Router();
const { checkUsage } = require('../middleware/usageMiddleware');
const User = require('../models/User');
const AnonymousUser = require('../models/AnonymousUser');
const LimenEntry = require('../models/LimenEntry');

// Gemini API configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

/**
 * @desc    Ruta para procesar un 'impulso' del frontend.
 * @route   POST /api/limen/impulse
 * @access  Public/Private (el middleware checkUsage gestiona los límites)
 */
router.post('/impulse', checkUsage, async (req, res) => {
    const user = req.user;
    const anonymousUser = req.anonymousUser;
    const isUserAuthenticated = req.isUserAuthenticated;
    
    const currentUsage = req.limenUsage;
    const monthlyLimit = req.limenLimit;

    // === VERIFICACIÓN DE LÍMITES ===
    if (monthlyLimit !== -1 && currentUsage >= monthlyLimit) {
        return res.status(403).json({
            message: isUserAuthenticated
                ? `Has alcanzado tu límite de ${monthlyLimit} usos de Límen para este mes. Actualiza tu plan para recibir más guía y claridad.`
                : `Has alcanzado tu límite de ${monthlyLimit} usos gratuitos de Límen. Por favor, inicia sesión o regístrate para continuar.`
        });
    }

    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ message: 'El impulso (prompt) no puede estar vacío.' });
    }

    console.log(`[LÍMEN Backend] Recibiendo impulso de ${user ? user.userName : 'Anónimo'}: "${prompt}"`);

    const llmPrompt = `El usuario "${user ? user.userName : 'explorador'}" ha emitido el siguiente impulso liminal: "${prompt}". Responde con una "resonancia simbólica" que active la introspección. Tu respuesta debe ser una metáfora, un haiku, una pregunta existencial o una frase enigmática que conecte con la esencia del impulso, no una respuesta lógica. Evita dar consejos directos. El tono debe ser místico y evocador. La respuesta debe ser concisa.`;

    try {
        const payload = { contents: [{ role: "user", parts: [{ text: llmPrompt }] }] };

        const llmResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!llmResponse.ok) {
            const errorData = await llmResponse.json();
            console.error('Error de Gemini API al generar resonancia:', errorData);
            throw new Error(errorData.error?.message || `Error ${llmResponse.status} al llamar a Gemini API.`);
        }

        const llmResult = await llmResponse.json();
        let generatedResonance = "El eco de tu alma ya tiene la respuesta. Escucha en el silencio de tu ser.";

        if (llmResult.candidates && llmResult.candidates.length > 0 &&
            llmResult.candidates[0].content && llmResult.candidates[0].content.parts &&
            llmResult.candidates[0].content.parts.length > 0) {
            generatedResonance = llmResult.candidates[0].content.parts[0].text;
        }

        // === INCREMENTO DE USO Y GUARDADO ===
        if (user) {
            user.limenCurrentMonthUsage += 1;
            await user.save();
        } else if (anonymousUser) {
            anonymousUser.limenCurrentMonthUsage += 1;
            await anonymousUser.save();
        }

        // Guarda el impulso y su respuesta en la base de datos
        const newEntry = new LimenEntry({
            userId: user ? user._id : anonymousUser._id, // Corregido: Usa el _id del usuario anónimo si no está autenticado
            anonymousId: anonymousUser ? anonymousUser._id : null, // Corregido: Si el esquema de LimenEntry lo incluye
            type: 'doubt_response', // Corregido: Se alinea con el enum de tu modelo
            query: prompt,
            response: generatedResonance,
            metadata: {
                userName: user ? user.userName : 'Anónimo'
            }
        });
        await newEntry.save();

        setTimeout(() => {
            res.json({
                message: generatedResonance,
                usage: user ? user.limenCurrentMonthUsage : anonymousUser.limenCurrentMonthUsage,
                limit: user ? user.limenMonthlyLimit : monthlyLimit,
                isUserAuthenticated: isUserAuthenticated
            });
        }, 1000);

    } catch (llmError) {
        console.error('Error al generar la resonancia con IA:', llmError);
        res.status(500).json({ message: 'Límen está resonando en el éter. Intenta de nuevo más tarde.', error: llmError.message });
    }
});

/**
 * @desc    Genera una revelación/guía con IA.
 * @route   POST /api/limen/get-revelation
 * @access  Public/Private (el middleware checkUsage gestiona los límites)
 */
router.post('/get-revelation', checkUsage, async (req, res) => {
    // Los datos del usuario y los límites se obtienen del middleware checkUsage
    const user = req.user;
    const anonymousUser = req.anonymousUser;
    const isUserAuthenticated = req.isUserAuthenticated;
    
    const currentUsage = req.limenUsage;
    const monthlyLimit = req.limenLimit;

    // === VERIFICACIÓN DE LÍMITES ===
    if (monthlyLimit !== -1 && currentUsage >= monthlyLimit) {
        return res.status(403).json({
            message: isUserAuthenticated
                ? `Has alcanzado tu límite de ${monthlyLimit} revelaciones de Límen para este mes. Actualiza tu plan para recibir más guía y claridad.`
                : `Has alcanzado tu límite de ${monthlyLimit} usos gratuitos de Límen. Por favor, inicia sesión o regístrate para continuar.`
        });
    }

    console.log(`[LÍMEN Backend] Generando revelación para ${user ? user.userName : 'Anónimo'}`);

    const prompt = `Genera una frase de sabiduría, una revelación corta y profunda, o una afirmación inspiradora para un explorador espiritual. Debe ser concisa y tener un tono místico/filosófico. Si conoces el nombre del usuario ("${user ? user.userName : 'explorador'}") puedes intentar incorporarlo sutilmente o personalizar el mensaje. Asegúrate que la frase no sea demasiado larga. Ejemplo: "En el silencio, encuentras la voz del cosmos, explorador."`;

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
        let generatedPhrase = "El eco de tu alma ya tiene la respuesta. Escucha en el silencio de tu ser.";

        if (llmResult.candidates && llmResult.candidates.length > 0 &&
            llmResult.candidates[0].content && llmResult.candidates[0].content.parts &&
            llmResult.candidates[0].content.parts.length > 0) {
            generatedPhrase = llmResult.candidates[0].content.parts[0].text;
        }

        // === INCREMENTO DE USO Y GUARDADO ===
        if (user) {
            user.limenCurrentMonthUsage += 1;
            await user.save();
        } else if (anonymousUser) {
            anonymousUser.limenCurrentMonthUsage += 1;
            await anonymousUser.save();
        }

        // Guarda la revelación en la base de datos
        const newEntry = new LimenEntry({
            userId: user ? user._id : anonymousUser._id, // Corregido: Usa el _id del usuario anónimo si no está autenticado
            anonymousId: anonymousUser ? anonymousUser._id : null, // Corregido: Si el esquema de LimenEntry lo incluye
            type: 'revelation',
            response: generatedPhrase,
            metadata: {
                prompt: prompt,
                userName: user ? user.userName : 'Anónimo'
            }
        });
        await newEntry.save();

        setTimeout(() => {
            res.json({
                revelation: generatedPhrase,
                usage: user ? user.limenCurrentMonthUsage : anonymousUser.limenCurrentMonthUsage,
                limit: user ? user.limenMonthlyLimit : monthlyLimit,
                isUserAuthenticated: isUserAuthenticated
            });
        }, 1000);

    } catch (llmError) {
        console.error('Error al generar la revelación con IA:', llmError);
        res.status(500).json({ message: 'Límen está meditando profundamente. Intenta de nuevo más tarde.', error: llmError.message });
    }
});

/**
 * @desc    Recibe una duda o pregunta y responde con una "respuesta simbólica".
 * @route   POST /api/limen/doubt
 * @access  Public/Private (el middleware checkUsage gestiona los límites)
 */
router.post('/doubt', checkUsage, async (req, res) => {
    const { question } = req.body;

    const user = req.user;
    const anonymousUser = req.anonymousUser;
    const isUserAuthenticated = req.isUserAuthenticated;
    
    const currentUsage = req.limenUsage;
    const monthlyLimit = req.limenLimit;

    // === VERIFICACIÓN DE LÍMITES ===
    if (monthlyLimit !== -1 && currentUsage >= monthlyLimit) {
        return res.status(403).json({
            message: isUserAuthenticated
                ? `Has alcanzado tu límite de ${monthlyLimit} usos de Límen para este mes. Actualiza tu plan para recibir más guía y claridad.`
                : `Has alcanzado tu límite de ${monthlyLimit} usos gratuitos de Límen. Por favor, inicia sesión o regístrate para continuar.`
        });
    }

    if (!question) {
        return res.status(400).json({ message: 'La pregunta no puede estar vacía.' });
    }
    console.log(`[LÍMEN Backend] Recibiendo duda de ${user ? user.userName : 'Anónimo'}: "${question}"`);

    const prompt = `El usuario "${user ? user.userName : 'explorador'}" ha expresado la siguiente duda o pregunta interna: "${question}". Responde con una "respuesta simbólica". Evita dar consejos directos o lógicos. En su lugar, ofrece una metáfora, una afirmación enigmática, una pregunta reflexiva, o una analogía que invite a la introspección y a encontrar la propia respuesta. El tono debe ser místico y de guía intuitiva, no directa. La respuesta debe ser concisa.`;

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
        let symbolicAnswer = "El eco de tu alma ya tiene la respuesta. Escucha en el silencio de tu ser.";

        if (llmResult.candidates && llmResult.candidates.length > 0 &&
            llmResult.candidates[0].content && llmResult.candidates[0].content.parts &&
            llmResult.candidates[0].content.parts.length > 0) {
            symbolicAnswer = llmResult.candidates[0].content.parts[0].text;
        }

        // === INCREMENTO DE USO Y GUARDADO ===
        if (user) {
            user.limenCurrentMonthUsage += 1;
            await user.save();
        } else if (anonymousUser) {
            anonymousUser.limenCurrentMonthUsage += 1;
            await anonymousUser.save();
        }

        // Guarda la duda y su respuesta en la base de datos
        const newEntry = new LimenEntry({
            userId: user ? user._id : anonymousUser._id, // Corregido: Usa el _id del usuario anónimo si no está autenticado
            anonymousId: anonymousUser ? anonymousUser._id : null, // Corregido: Si el esquema de LimenEntry lo incluye
            type: 'doubt_response',
            query: question,
            response: symbolicAnswer,
            metadata: {
                prompt: prompt,
                userName: user ? user.userName : 'Anónimo'
            }
        });
        await newEntry.save();

        setTimeout(() => {
            res.json({
                answer: symbolicAnswer,
                usage: user ? user.limenCurrentMonthUsage : anonymousUser.limenCurrentMonthUsage,
                limit: user ? user.limenMonthlyLimit : monthlyLimit,
                isUserAuthenticated: isUserAuthenticated
            });
        }, 1000);

    } catch (llmError) {
        console.error('Error al responder la duda con IA:', llmError);
        res.status(500).json({ message: 'Límen está inmerso en el éter. Intenta de nuevo más tarde.', error: llmError.message });
    }
});

/**
 * @desc    Activa un ritual y registra el evento.
 * @route   POST /api/limen/ritual
 * @access  Public/Private (el middleware checkUsage gestiona los límites)
 */
router.post('/ritual', checkUsage, async (req, res) => {
    const { ritualType, data } = req.body;

    const user = req.user;
    const anonymousUser = req.anonymousUser;
    const isUserAuthenticated = req.isUserAuthenticated;

    const currentUsage = req.limenUsage;
    const monthlyLimit = req.limenLimit;

    // === VERIFICACIÓN DE LÍMITES ===
    if (monthlyLimit !== -1 && currentUsage >= monthlyLimit) {
        return res.status(403).json({
            message: isUserAuthenticated
                ? `Has alcanzado tu límite de ${monthlyLimit} usos de Límen para este mes. Actualiza tu plan para recibir más guía y claridad.`
                : `Has alcanzado tu límite de ${monthlyLimit} usos gratuitos de Límen. Por favor, inicia sesión o regístrate para continuar.`
        });
    }

    console.log(`[LÍMEN Backend] Usuario ${user ? user.userName : 'Anónimo'} activando ritual: ${ritualType} con datos:`, data);

    try {
        // En este caso, solo registramos los rituales válidos
        if (ritualType === 'initiation_ritual') {
            // Incremento de uso y guardado (para rituales también)
            if (user) {
                user.limenCurrentMonthUsage += 1;
                await user.save();
            } else if (anonymousUser) {
                anonymousUser.limenCurrentMonthUsage += 1;
                await anonymousUser.save();
            }
            
            const newEntry = new LimenEntry({
                userId: user ? user._id : anonymousUser._id, // Corregido: Usa el _id del usuario anónimo si no está autenticado
                anonymousId: anonymousUser ? anonymousUser._id : null, // Corregido: Si el esquema de LimenEntry lo incluye
                type: 'revelation', // Corregido: Se alinea con el enum de tu modelo, representando el ritual como una revelación
                query: `Activación de ritual: ${ritualType}`,
                response: `Ritual de iniciación completado por ${user ? user.userName : 'el explorador anónimo'}.`,
                metadata: {
                    ritualType: ritualType,
                    data: data
                }
            });
            await newEntry.save();

            setTimeout(() => {
                res.json({
                    status: 'success',
                    message: `Ritual '${ritualType}' completado por ${user ? user.userName : 'el explorador anónimo'}. Has desbloqueado una nueva percepción.`,
                    usage: user ? user.limenCurrentMonthUsage : anonymousUser.limenCurrentMonthUsage,
                    limit: user ? user.limenMonthlyLimit : monthlyLimit,
                    isUserAuthenticated: isUserAuthenticated
                });
            }, 500);
        } else {
            // No se incrementa el uso si el ritual no es reconocido
            setTimeout(() => {
                res.status(400).json({ status: 'error', message: `Ritual '${ritualType}' desconocido o no permitido para ${user ? user.userName : 'el explorador anónimo'}.` });
            }, 500);
        }
    } catch (error) {
        console.error('Error al procesar el ritual:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al procesar el ritual.', error: error.message });
    }
});

/**
 * @desc    Obtiene el historial de Limen para el usuario autenticado.
 * @route   GET /api/limen/history
 * @access  Private
 */
router.get('/history', checkUsage, async (req, res) => {
    // Si el usuario no está autenticado, no hay historial que mostrar.
    if (!req.isUserAuthenticated) {
        return res.status(403).json({ message: 'Debes iniciar sesión para ver tu historial con Límen.' });
    }

    const userId = req.user._id; // Corregido: Usa `req.user._id` para el usuario autenticado
    const userName = req.user.userName;
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

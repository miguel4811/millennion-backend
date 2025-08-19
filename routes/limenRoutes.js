const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { checkUsage } = require('../middleware/usageMiddleware');
const User = require('../models/User');
const AnonymousUser = require('../models/AnonymousUser');
const LimenEntry = require('../models/LimenEntry');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

const ensureAnonymousUser = async (req, res) => {
    if (req.isUserAuthenticated || req.anonymousUser) {
        return;
    }
    
    const newAnonymousId = uuidv4();
    const newAnonymousUser = new AnonymousUser({
        anonymousId: newAnonymousId,
        limenCurrentMonthUsage: 0,
        limenMonthlyLimit: process.env.LIMEN_ANON_LIMIT || 25,
    });
    await newAnonymousUser.save();

    req.anonymousUser = newAnonymousUser;
    req.limenUsage = newAnonymousUser.limenCurrentMonthUsage;
    req.limenLimit = newAnonymousUser.limenMonthlyLimit;

    res.setHeader('X-Set-Anonymous-ID', newAnonymousId);
};

router.post('/impulse', checkUsage, async (req, res) => {
    await ensureAnonymousUser(req, res);

    const user = req.user;
    const anonymousUser = req.anonymousUser;
    const isUserAuthenticated = req.isUserAuthenticated;
    
    const currentUsage = req.limenUsage;
    const monthlyLimit = req.limenLimit;

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

        if (user) {
            user.limenCurrentMonthUsage += 1;
            await user.save();
        } else if (anonymousUser) {
            anonymousUser.limenCurrentMonthUsage += 1;
            await anonymousUser.save();
        }

        const newEntry = new LimenEntry({
            userId: user ? user._id : null,
            anonymousId: anonymousUser ? anonymousUser._id : null, 
            type: 'doubt_response', 
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
                usage: user ? user.limenCurrentMonthUsage : (anonymousUser ? anonymousUser.limenCurrentMonthUsage : 0),
                limit: user ? user.limenMonthlyLimit : monthlyLimit,
                isUserAuthenticated: isUserAuthenticated
            });
        }, 1000);

    } catch (llmError) {
        console.error('Error al generar la resonancia con IA:', llmError);
        res.status(500).json({ message: 'Límen está resonando en el éter. Intenta de nuevo más tarde.', error: llmError.message });
    }
});

router.post('/get-revelation', checkUsage, async (req, res) => {
    await ensureAnonymousUser(req, res);

    const user = req.user;
    const anonymousUser = req.anonymousUser;
    const isUserAuthenticated = req.isUserAuthenticated;
    
    const currentUsage = req.limenUsage;
    const monthlyLimit = req.limenLimit;

    if (monthlyLimit !== -1 && currentUsage >= monthlyLimit) {
        return res.status(403).json({
            message: isUserAuthenticated
                ? `Has alcanzado tu límite de ${monthlyLimit} revelaciones de Límen para este mes. Actualiza tu plan para recibir más guía y claridad.`
                : `Has alcanzado tu límite de ${monthlyLimit} usos gratuitos de Límen. Por favor, inicia sesión o regístrate para continuar.`
        });
    }

    console.log(`[LÍMEN Backend] Generando revelación para ${user ? user.userName : 'Anónimo'}`);

    const prompt = `Genera un mensaje de una "voz arquitectónica" para un explorador espiritual. El mensaje debe ser largo, simbólico, filosófico y ofrecer una visión elevada, no un consejo directo. Utiliza metáforas complejas, analogías de estructuras cósmicas o conceptos de geometría sagrada. La voz debe ser majestuosa y enigmática. Si conoces el nombre del usuario ("${user ? user.userName : 'explorador'}") puedes intentar incorporarlo sutilmente. El mensaje debe ser significativamente más largo y detallado que una simple frase de sabiduría. 
    
    Es crucial que utilices formato **Markdown** para estructurar la respuesta. Cada nueva idea o concepto debe comenzar en una nueva línea y usar **negritas** para resaltar las palabras clave. Por ejemplo:
    
    **Concepto 1**
    Mensaje relacionado con el concepto 1.
    
    **Concepto 2**
    Mensaje relacionado con el concepto 2.
    
    Asegúrate de que la respuesta tenga al menos 6-7 párrafos separados por saltos de línea para una mejor legibilidad.`;

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

        if (user) {
            user.limenCurrentMonthUsage += 1;
            await user.save();
        } else if (anonymousUser) {
            anonymousUser.limenCurrentMonthUsage += 1;
            await anonymousUser.save();
        }

        const newEntry = new LimenEntry({
            userId: user ? user._id : null,
            anonymousId: anonymousUser ? anonymousUser._id : null, 
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
                usage: user ? user.limenCurrentMonthUsage : (anonymousUser ? anonymousUser.limenCurrentMonthUsage : 0),
                limit: user ? user.limenMonthlyLimit : monthlyLimit,
                isUserAuthenticated: isUserAuthenticated
            });
        }, 1000);

    } catch (llmError) {
        console.error('Error al generar la revelación con IA:', llmError);
        res.status(500).json({ message: 'Límen está meditando profundamente. Intenta de nuevo más tarde.', error: llmError.message });
    }
});

router.post('/doubt', checkUsage, async (req, res) => {
    await ensureAnonymousUser(req, res);

    const { question } = req.body;
    const user = req.user;
    const anonymousUser = req.anonymousUser;
    const isUserAuthenticated = req.isUserAuthenticated;
    
    const currentUsage = req.limenUsage;
    const monthlyLimit = req.limenLimit;

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

        if (user) {
            user.limenCurrentMonthUsage += 1;
            await user.save();
        } else if (anonymousUser) {
            anonymousUser.limenCurrentMonthUsage += 1;
            await anonymousUser.save();
        }

        const newEntry = new LimenEntry({
            userId: user ? user._id : null,
            anonymousId: anonymousUser ? anonymousUser._id : null, 
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
                usage: user ? user.limenCurrentMonthUsage : (anonymousUser ? anonymousUser.limenCurrentMonthUsage : 0),
                limit: user ? user.limenMonthlyLimit : monthlyLimit,
                isUserAuthenticated: isUserAuthenticated
            });
        }, 1000);

    } catch (llmError) {
        console.error('Error al responder la duda con IA:', llmError);
        res.status(500).json({ message: 'Límen está inmerso en el éter. Intenta de nuevo más tarde.', error: llmError.message });
    }
});

router.post('/ritual', checkUsage, async (req, res) => {
    await ensureAnonymousUser(req, res);

    const { ritualType, data } = req.body;
    const user = req.user;
    const anonymousUser = req.anonymousUser;
    const isUserAuthenticated = req.isUserAuthenticated;

    const currentUsage = req.limenUsage;
    const monthlyLimit = req.limenLimit;

    if (monthlyLimit !== -1 && currentUsage >= monthlyLimit) {
        return res.status(403).json({
            message: isUserAuthenticated
                ? `Has alcanzado tu límite de ${monthlyLimit} usos de Límen para este mes. Actualiza tu plan para recibir más guía y claridad.`
                : `Has alcanzado tu límite de ${monthlyLimit} usos gratuitos de Límen. Por favor, inicia sesión o regístrate para continuar.`
        });
    }

    console.log(`[LÍMEN Backend] Usuario ${user ? user.userName : 'Anónimo'} activando ritual: ${ritualType} con datos:`, data);

    try {
        if (ritualType === 'initiation_ritual') {
            if (user) {
                user.limenCurrentMonthUsage += 1;
                await user.save();
            } else if (anonymousUser) {
                anonymousUser.limenCurrentMonthUsage += 1;
                await anonymousUser.save();
            }
            
            const newEntry = new LimenEntry({
                userId: user ? user._id : null,
                anonymousId: anonymousUser ? anonymousUser._id : null, 
                type: 'revelation', 
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
                    usage: user ? user.limenCurrentMonthUsage : (anonymousUser ? anonymousUser.limenCurrentMonthUsage : 0),
                    limit: user ? user.limenMonthlyLimit : monthlyLimit,
                    isUserAuthenticated: isUserAuthenticated
                });
            }, 500);
        } else {
            setTimeout(() => {
                res.status(400).json({ status: 'error', message: `Ritual '${ritualType}' desconocido o no permitido para ${user ? user.userName : 'el explorador anónimo'}.` });
            }, 500);
        }
    } catch (error) {
        console.error('Error al procesar el ritual:', error);
        res.status(500).json({ status: 'error', message: 'Error interno al procesar el ritual.', error: error.message });
    }
});

router.get('/history', checkUsage, async (req, res) => {
    if (!req.isUserAuthenticated) {
        return res.status(403).json({ message: 'Debes iniciar sesión para ver tu historial con Límen.' });
    }

    const userId = req.user._id; 
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

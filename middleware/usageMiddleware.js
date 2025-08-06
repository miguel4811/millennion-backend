// millennion/backend/middleware/usageMiddleware.js

const User = require('../models/User');
const AnonymousUser = require('../models/AnonymousUser'); // Nuevo modelo
const jwt = require('jsonwebtoken'); // Para verificar tokens existentes

// Límites para usuarios anónimos
const ANONYMOUS_CREANOVA_LIMIT = 2; // 2 usos para Creanova si no está autenticado
const ANONYMOUS_LIMEN_LIMIT = 2;    // 2 usos para Limen si no está autenticado

const checkUsage = async (req, res, next) => {
    let user = null;
    let anonymousUser = null;
    let isAnonymous = false;
    let newAnonymousId = null; // Para enviar un nuevo ID anónimo si es necesario

    // 1. Intentar autenticar al usuario si hay un token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            user = await User.findById(decoded.id).select('-password');
            if (user) {
                req.user = user;
                req.userName = user.userName;
                req.userId = user._id;
            }
        } catch (error) {
            // Si el token es inválido o expirado, se tratará como anónimo
            console.warn('Token JWT inválido o expirado. Procediendo como usuario anónimo.');
        }
    }

    // 2. Si no hay usuario autenticado, intentar identificar o crear un usuario anónimo
    if (!user) {
        isAnonymous = true;
        const anonymousIdFromHeader = req.headers['x-anonymous-id'];

        if (anonymousIdFromHeader) {
            anonymousUser = await AnonymousUser.findOne({ anonymousId: anonymousIdFromHeader });
        }

        if (!anonymousUser) {
            // Si no se encontró el ID anónimo o no se envió, crear uno nuevo
            newAnonymousId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
            anonymousUser = new AnonymousUser({ anonymousId: newAnonymousId });
            await anonymousUser.save();
            // Adjuntar el nuevo ID anónimo en la respuesta para que el frontend lo guarde
            res.setHeader('X-Set-Anonymous-ID', newAnonymousId);
        }
        req.anonymousUser = anonymousUser; // Adjuntar el usuario anónimo a la solicitud
    }

    // 3. Lógica de reseteo mensual para usuarios (autenticados y anónimos)
    const now = new Date();
    if (user) {
        // Para usuarios autenticados, usa sus propios límites y fechas de reseteo
        const creanovaResetDate = user.creanovaLastReset || new Date(0);
        const limenResetDate = user.limenLastReset || new Date(0);

        if (creanovaResetDate.getMonth() !== now.getMonth() || creanovaResetDate.getFullYear() !== now.getFullYear()) {
            user.creanovaCurrentMonthUsage = 0;
            user.creanovaLastReset = now;
        }
        if (limenResetDate.getMonth() !== now.getMonth() || limenResetDate.getFullYear() !== now.getFullYear()) {
            user.limenCurrentMonthUsage = 0;
            user.limenLastReset = now;
        }
        await user.save(); // Guarda los cambios de reseteo
    } else if (anonymousUser) {
        // Para usuarios anónimos, usa sus límites y fechas de reseteo
        const lastReset = anonymousUser.lastReset || new Date(0);
        if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
            anonymousUser.creanovaCurrentMonthUsage = 0;
            anonymousUser.limenCurrentMonthUsage = 0;
            anonymousUser.lastReset = now;
            await anonymousUser.save(); // Guarda los cambios de reseteo
        }
    }

    // 4. Adjuntar límites y uso actual para el controlador
    if (user) {
        req.creanovaLimit = user.creanovaMonthlyLimit;
        req.creanovaUsage = user.creanovaCurrentMonthUsage;
        req.limenLimit = user.limenMonthlyLimit;
        req.limenUsage = user.limenCurrentMonthUsage;
        req.isUserAuthenticated = true;
    } else if (anonymousUser) {
        req.creanovaLimit = ANONYMOUS_CREANOVA_LIMIT;
        req.creanovaUsage = anonymousUser.creanovaCurrentMonthUsage;
        req.limenLimit = ANONYMOUS_LIMEN_LIMIT;
        req.limenUsage = anonymousUser.limenCurrentMonthUsage;
        req.isUserAuthenticated = false;
    } else {
        // Esto no debería ocurrir si la lógica anterior funciona, pero como fallback
        req.creanovaLimit = 0;
        req.creanovaUsage = 0;
        req.limenLimit = 0;
        req.limenUsage = 0;
        req.isUserAuthenticated = false;
    }

    next(); // Continuar con la ruta
};

module.exports = { checkUsage };

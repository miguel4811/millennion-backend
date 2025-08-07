// millennion/backend/middleware/usageMiddleware.js

const User = require('../models/User');
const AnonymousUser = require('../models/AnonymousUser');
const jwt = require('jsonwebtoken');

// Límites para usuarios anónimos
const ANONYMOUS_CREANOVA_LIMIT = 2;
const ANONYMOUS_LIMEN_LIMIT = 2;

const checkUsage = async (req, res, next) => {
    let user = null;
    let anonymousUser = null;
    req.isUserAuthenticated = false; // Valor por defecto

    try {
        // 1. Intentar autenticar al usuario si hay un token
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            user = await User.findById(decoded.id).select('-password');
            if (user) {
                req.user = user;
                req.userName = user.userName;
                req.userId = user._id;
                req.isUserAuthenticated = true;
            }
        }

        // 2. Si no hay usuario autenticado, intentar identificar o crear un usuario anónimo
        if (!user) {
            const anonymousIdFromHeader = req.headers['x-anonymous-id'];

            if (anonymousIdFromHeader) {
                anonymousUser = await AnonymousUser.findOne({ anonymousId: anonymousIdFromHeader });
            }

            if (!anonymousUser) {
                // Si no se encontró el ID anónimo o no se envió, crear uno nuevo
                const newAnonymousId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
                anonymousUser = new AnonymousUser({ anonymousId: newAnonymousId });
                await anonymousUser.save();
                // Adjuntar el nuevo ID anónimo en la respuesta para que el frontend lo guarde
                res.setHeader('X-Set-Anonymous-ID', newAnonymousId);
            }
            req.anonymousUser = anonymousUser;
        }

        // 3. Lógica de reseteo mensual
        const now = new Date();
        if (user) {
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
            await user.save();
        } else if (anonymousUser) {
            const lastReset = anonymousUser.lastReset || new Date(0);
            if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
                anonymousUser.creanovaCurrentMonthUsage = 0;
                anonymousUser.limenCurrentMonthUsage = 0;
                anonymousUser.lastReset = now;
                await anonymousUser.save();
            }
        }

        // 4. Adjuntar límites y uso actual para el controlador
        if (user) {
            req.creanovaLimit = user.creanovaMonthlyLimit;
            req.creanovaUsage = user.creanovaCurrentMonthUsage;
            req.limenLimit = user.limenMonthlyLimit;
            req.limenUsage = user.limenCurrentMonthUsage;
        } else {
            req.creanovaLimit = ANONYMOUS_CREANOVA_LIMIT;
            req.creanovaUsage = anonymousUser.creanovaCurrentMonthUsage;
            req.limenLimit = ANONYMOUS_LIMEN_LIMIT;
            req.limenUsage = anonymousUser.limenCurrentMonthUsage;
        }

        next(); // Continuar con la ruta
    } catch (error) {
        console.error('Error en el middleware de uso:', error);
        // Manejar cualquier error del servidor de forma controlada
        res.status(500).json({ message: 'Error interno del servidor. Intenta de nuevo más tarde.' });
    }
};

module.exports = { checkUsage };

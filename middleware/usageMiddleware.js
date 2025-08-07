const jwt = require('jsonwebtoken');
const User = require('../models/User'); 
const AnonymousUser = require('../models/AnonymousUser');

const checkUsage = async (req, res, next) => {
    let token;
    let user = null;
    let isUserAuthenticated = false;

    // 1. Prioridad máxima: Intentar autenticar con el token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            if (token && token !== 'null') {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                user = await User.findById(decoded.id).select('-password');
                if (user) {
                    isUserAuthenticated = true;
                }
            }
        } catch (error) {
            // El token no es válido. No hacemos nada, el proceso sigue como anónimo
            console.error('Error al verificar el token:', error.message);
        }
    }

    if (isUserAuthenticated && user) {
        // Opción 1: El usuario está autenticado, adjuntamos su información
        req.user = user;
        req.isUserAuthenticated = true;
        req.creanovaUsage = user.creanovaCurrentMonthUsage;
        req.creanovaLimit = user.creanovaMonthlyLimit;
        // Agrega aquí los límites para Limen si es necesario
        // req.limenUsage = user.limenCurrentMonthUsage;
        // req.limenLimit = user.limenMonthlyLimit;
        
    } else {
        // Opción 2: El usuario es anónimo o el token no es válido
        const anonymousId = req.headers['x-anonymous-id'];
        req.isUserAuthenticated = false;
        let anonymousUser = null;

        if (anonymousId) {
            anonymousUser = await AnonymousUser.findOne({ anonymousId });
            
            if (!anonymousUser) {
                anonymousUser = await AnonymousUser.create({
                    anonymousId,
                    creanovaCurrentMonthUsage: 0,
                    creanovaMonthlyLimit: process.env.CREANOVA_ANON_LIMIT || 3,
                });
            }
        }

        req.anonymousUser = anonymousUser;
        
        if (anonymousUser) {
            req.creanovaUsage = anonymousUser.creanovaCurrentMonthUsage;
            req.creanovaLimit = anonymousUser.creanovaMonthlyLimit;
        } else {
            // Si no se encuentra ni se puede crear un usuario anónimo (ej. error de DB),
            // usar valores por defecto para evitar el crasheo
            req.creanovaUsage = 0;
            req.creanovaLimit = process.env.CREANOVA_ANON_LIMIT || 3;
        }
    }

    next();
};

module.exports = { checkUsage };

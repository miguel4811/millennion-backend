const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AnonymousUser = require('../models/AnonymousUser');

/**
 * @description Middleware para verificar la autenticación del usuario y
 *                 gestionar los límites de uso de los módulos.
 *                 El usuario puede ser autenticado o anónimo.
 */
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
        
        // Asignar los límites del usuario autenticado
        req.creanovaUsage = user.creanovaCurrentMonthUsage;
        req.creanovaLimit = user.creanovaMonthlyLimit;
        req.limenUsage = user.limenCurrentMonthUsage;
        
        // Límite de 15 usos para usuarios autenticados con plan gratuito
        req.limenLimit = user.limenMonthlyLimit || 15; 
        
    } else {
        // Opción 2: El usuario es anónimo o el token no es válido
        const anonymousId = req.headers['x-anonymous-id'];
        req.isUserAuthenticated = false;
        let anonymousUser = null;

        if (anonymousId) {
            anonymousUser = await AnonymousUser.findOne({ anonymousId });
            
            if (!anonymousUser) {
                // Si no existe, lo creamos con el límite de 5 para Limen
                anonymousUser = await AnonymousUser.create({
                    anonymousId,
                    creanovaCurrentMonthUsage: 0,
                    creanovaMonthlyLimit: process.env.CREANOVA_ANON_LIMIT || 3,
                    
                    // Límite de 5 usos para usuarios anónimos
                    limenCurrentMonthUsage: 0,
                    limenMonthlyLimit: process.env.LIMEN_ANON_LIMIT || 5, 
                });
            }
        }

        req.anonymousUser = anonymousUser;
        
        if (anonymousUser) {
            req.creanovaUsage = anonymousUser.creanovaCurrentMonthUsage;
            req.creanovaLimit = anonymousUser.creanovaMonthlyLimit;
            // Usar el límite de la base de datos si existe, si no, el por defecto
            req.limenUsage = anonymousUser.limenCurrentMonthUsage;
            req.limenLimit = anonymousUser.limenMonthlyLimit || 5; 
        } else {
            // Si no se encuentra ni se puede crear un usuario anónimo, usar valores por defecto
            req.creanovaUsage = 0;
            req.creanovaLimit = process.env.CREANOVA_ANON_LIMIT || 3;
            req.limenUsage = 0;
            req.limenLimit = process.env.LIMEN_ANON_LIMIT || 5;
        }
    }

    next();
};

module.exports = { checkUsage };

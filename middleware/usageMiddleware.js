const jwt = require('jsonwebtoken');
const User = require('../models/User'); 
const AnonymousUser = require('../models/AnonymousUser'); // Se necesita importar el modelo de usuario anónimo

const checkUsage = async (req, res, next) => {
    let token;
    let user = null;
    let anonymousUser = null;
    let isUserAuthenticated = false;

    // --- Lógica para usuarios autenticados (Login) ---
    // 1. Intentar obtener el token de autenticación del header
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
            // Si el token es inválido, el proceso continúa como usuario anónimo
            console.error('Error al verificar el token:', error.message);
        }
    }

    // 2. Si el usuario está autenticado, adjuntar su información y límites
    if (isUserAuthenticated && user) {
        req.user = user;
        req.isUserAuthenticated = true;
        req.creanovaUsage = user.creanovaCurrentMonthUsage;
        req.creanovaLimit = user.creanovaMonthlyLimit;
        // Agrega aquí los límites para Limen si es necesario
        // req.limenUsage = user.limenCurrentMonthUsage;
        // req.limenLimit = user.limenMonthlyLimit;
        
    } else {
        // --- Lógica para usuarios anónimos ---
        // 3. Si no hay token o es inválido, buscar un ID anónimo en los headers
        const anonymousId = req.headers['x-anonymous-id'];
        req.isUserAuthenticated = false;

        if (anonymousId) {
            anonymousUser = await AnonymousUser.findOne({ anonymousId });
            
            if (!anonymousUser) {
                // Crear un nuevo usuario anónimo si no existe
                anonymousUser = await AnonymousUser.create({
                    anonymousId,
                    creanovaCurrentMonthUsage: 0,
                    creanovaMonthlyLimit: process.env.CREANOVA_ANON_LIMIT || 3,
                });
            }
        }

        req.anonymousUser = anonymousUser;
        
        // 4. Adjuntar los límites y uso del usuario anónimo a la petición
        // Esto evita el TypeError en las rutas
        if (anonymousUser) {
            req.creanovaUsage = anonymousUser.creanovaCurrentMonthUsage;
            req.creanovaLimit = anonymousUser.creanovaMonthlyLimit;
            // Agrega aquí los límites para Limen si es necesario
            // req.limenUsage = anonymousUser.limenCurrentMonthUsage;
            // req.limenLimit = anonymousUser.limenMonthlyLimit;
        } else {
            // Adjuntar valores por defecto si no se pudo encontrar/crear un anónimo
            req.creanovaUsage = 0;
            req.creanovaLimit = process.env.CREANOVA_ANON_LIMIT || 3;
            // req.limenUsage = 0;
            // req.limenLimit = process.env.LIMEN_ANON_LIMIT || 5;
        }
    }

    next();
};

module.exports = { checkUsage };

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AnonymousUser = require('../models/AnonymousUser');

// Constante para simular un límite ilimitado
const UNLIMITED = Number.MAX_SAFE_INTEGER;

/**
 * @description Middleware para verificar la autenticación del usuario.
 * **¡CAMBIO CLAVE!** Se ha configurado el acceso ILIMITADO a todos los módulos
 * para TODOS los usuarios (autenticados y anónimos).
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

    // --- LÓGICA DE ASIGNACIÓN UNIVERSAL DE ACCESO ILIMITADO ---

    if (isUserAuthenticated && user) {
        // Opción 1: El usuario está autenticado, adjuntamos su información
        req.user = user;
        req.isUserAuthenticated = true;
    } else {
        // Opción 2: Usuario anónimo
        const anonymousId = req.headers['x-anonymous-id'];
        req.isUserAuthenticated = false;
        let anonymousUser = null;

        if (anonymousId) {
            // Buscamos o creamos el usuario anónimo para mantener el ID de sesión
            anonymousUser = await AnonymousUser.findOne({ anonymousId });
            
            if (!anonymousUser) {
                // Si no existe, lo creamos (aunque ya no usaremos los límites, es útil para el tracking)
                anonymousUser = await AnonymousUser.create({
                    anonymousId,
                    // Establecemos usos y límites iniciales, aunque la lógica de abajo los ignorará
                    creanovaCurrentMonthUsage: 0,
                    creanovaMonthlyLimit: UNLIMITED,
                    limenCurrentMonthUsage: 0,
                    limenMonthlyLimit: UNLIMITED, 
                });
            }
        }

        req.anonymousUser = anonymousUser;
    }

    // ASIGNACIÓN DE LÍMITES ILIMITADOS PARA TODOS (Autenticados y Anónimos)
    // Se asigna uso actual 0 y límite UNLIMITED a todos los módulos, 
    // lo que efectivamente hace que el acceso sea gratuito para todos.
    req.creanovaUsage = 0;
    req.creanovaLimit = UNLIMITED;
    
    req.limenUsage = 0;
    req.limenLimit = UNLIMITED; 
    
    // **NUEVA LÍNEA AÑADIDA:** Acceso ilimitado para Aprende de Negocios
    req.aprendeNegociosUsage = 0;
    req.aprendeNegociosLimit = UNLIMITED; 
    
    // -----------------------------------------------------

    next();
};

module.exports = { checkUsage };

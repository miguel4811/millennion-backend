const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Asegúrate de que la ruta a tu modelo User sea correcta

const checkUsage = async (req, res, next) => {
    let token;

    // 1. Verificar si el token existe en los headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Obtener el token del header
            token = req.headers.authorization.split(' ')[1];
            
            // Si el token es nulo o 'null' como string, no intentar verificarlo
            if (!token || token === 'null') {
                req.isAnonymous = true;
                return next();
            }

            // 2. Verificar el token y obtener el ID del usuario
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. Obtener el usuario del token y adjuntarlo a la solicitud
            // Esto asume que tu modelo User tiene un método para buscar por ID
            req.user = await User.findById(decoded.id).select('-password');
            req.isAnonymous = false;
            next();

        } catch (error) {
            // Si el token es inválido o malformado, tratar como anónimo
            // Para evitar que el servidor crashee con el error "jwt malformed"
            console.error('Error de autenticación, tratando como usuario anónimo:', error.message);
            req.isAnonymous = true;
            next();
        }
    } else {
        // Si no hay token en el header, también es un usuario anónimo
        req.isAnonymous = true;
        next();
    }
};

module.exports = { checkUsage };

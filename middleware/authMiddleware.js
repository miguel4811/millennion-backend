// millennion/backend/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Asegúrate de que esta ruta sea correcta

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Obtener token de los headers
            token = req.headers.authorization.split(' ')[1];

            // Verificar token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Buscar usuario y adjuntarlo a req (excluyendo la contraseña)
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'Usuario no encontrado. Token inválido.' });
            }

            // === ¡AJUSTE AQUÍ! Asegúrate de que `req.user.userName` sea correcto ===
            // En tu modelo de usuario (User.js), el campo para el nombre es 'userName'.
            // Por lo tanto, debes acceder a él como `req.user.userName`.
            // La línea original que tenías era `req.userName = req.user.name;`
            // CAMBIAR A:
            req.userName = req.user.userName; // Esto adjunta el nombre de usuario
            req.userId = req.user._id;       // Esto adjunta el ID del usuario

            next(); // Continuar con la siguiente función del middleware/ruta
        } catch (error) {
            console.error(error); // Log el error para depuración en el servidor
            return res.status(401).json({ message: 'Acceso denegado: Token no válido o expirado.' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Acceso denegado: No hay token de autenticación.' });
    }
};

// Asegúrate de que la exportación sea consistente con cómo la importas
// Dado cómo lo importas en `users.js` (`const { protect } = require(...)`),
// la exportación debe ser:
module.exports = { protect };

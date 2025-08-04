const express = require('express');
const router = express.Router();
// Importa las funciones del userController
const { registerUser, loginUser, getUserProfile } = require('../controllers/userController'); 
// Importa tu middleware de autenticación usando desestructuración
const { protect } = require('../middleware/authMiddleware'); 

// Rutas de autenticación (públicas)
router.post('/register', registerUser);
router.post('/login', loginUser);

// Ruta para obtener perfil de usuario (protegida, requiere token)
router.get('/profile', protect, getUserProfile); 

// Puedes añadir más rutas relacionadas con usuarios aquí si lo necesitas
/*
router.put('/update', protect, async (req, res) => {
    try {
        const { userName, email, level, coherentDecisions, structuralPatterns, ineffectiveCycles } = req.body;
        const user = await User.findById(req.user.id); // req.user.id viene del middleware `protect`
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        user.userName = userName || user.userName;
        user.email = email || user.email;
        user.level = level !== undefined ? level : user.level;
        user.coherentDecisions = coherentDecisions !== undefined ? coherentDecions : user.coherentDecisions;
        user.structuralPatterns = structuralPatterns !== undefined ? structuralPatterns : user.structuralPatterns;
        user.ineffectiveCycles = ineffectiveCycles !== undefined ? ineffectiveCycles : user.ineffectiveCycles;

        await user.save();
        res.json({ 
            message: 'Perfil actualizado con éxito.', 
            user: { // Devuelve el usuario actualizado
                id: user._id,
                userName: user.userName,
                email: user.email,
                plan: user.plan,
                level: user.level,
                coherentDecisions: user.coherentDecisions,
                structuralPatterns: user.structuralPatterns,
                ineffectiveCycles: user.ineffectiveCycles,
                // ... otras propiedades que quieras enviar
            }
        });
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({ message: 'Error del servidor al actualizar el perfil.' });
    }
});
*/

module.exports = router;

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

module.exports = router;

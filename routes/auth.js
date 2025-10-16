// millennion/backend/routes/auth.js

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Importa el modelo de usuario

// === NUEVA IMPORTACIÓN ===
const { updatePlanLimits } = require('../controllers/subscriptionController'); // Importa la función auxiliar
// === FIN NUEVA IMPORTACIÓN ===

// Secreto para firmar y verificar JWT (¡USA UNA VARIABLE DE ENTORNO EN PRODUCCIÓN!)
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here';

// Ruta de registro de usuario
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // 1. Validar que todos los campos estén presentes
        if (!email || !password || !name) {
            return res.status(400).json({ message: 'Todos los campos (email, password, name) son requeridos.' });
        }

        // 2. Verificar si el usuario ya existe
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'El email ya está registrado.' });
        }

        // 3. Crear un nuevo usuario
        const newUser = new User({
            email,
            password, // La contraseña se hasheará automáticamente por el middleware 'pre-save' en el modelo User
            name,
            // level, coherentDecisions, structuralPatterns, ineffectiveCycles serán inicializados por defecto
        });

        // === ASIGNAR PLAN GRATUITO E ILIMITADO ===
        // Asume que updatePlanLimits configura los límites a ILIMITADO (-1) para 'Free'.
        updatePlanLimits(newUser, 'Free'); 
        // === FIN ASIGNACIÓN ===

        // 4. Guardar el usuario en la base de datos
        await newUser.save(); // Guarda el usuario con el plan y límites ya asignados

        // 5. Generar JWT
        const token = jwt.sign(
            {
                userId: newUser._id,
                email: newUser.email,
                name: newUser.name,
                level: newUser.level,
                coherentDecisions: newUser.coherentDecisions,
                structuralPatterns: newUser.structuralPatterns,
                ineffectiveCycles: newUser.ineffectiveCycles,
                plan: newUser.plan,
            },
            JWT_SECRET,
            { expiresIn: '1h' } // El token expira en 1 hora
        );

        res.status(201).json({
            message: 'Usuario registrado con éxito',
            token,
            user: { // <-- Información del usuario en la respuesta
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                level: newUser.level,
                coherentDecisions: newUser.coherentDecisions,
                structuralPatterns: newUser.structuralPatterns,
                ineffectiveCycles: newUser.ineffectiveCycles,
                plan: newUser.plan,
            },
        });

    } catch (error) {
        console.error('Error al registrar usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor al registrar usuario', error: error.message });
    }
});

// Ruta de inicio de sesión de usuario
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Validar campos
        if (!email || !password) {
            return res.status(400).json({ message: 'Email y contraseña son requeridos.' });
        }

        // 2. Encontrar al usuario por email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'Credenciales inválidas.' });
        }

        // 3. Comparar contraseñas
        // Asume que el modelo User tiene un método `matchPassword`
        const isMatch = await user.matchPassword(password); 
        if (!isMatch) {
            return res.status(404).json({ message: 'Credenciales inválidas.' });
        }

        // 4. Generar JWT
        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                name: user.name,
                level: user.level,
                coherentDecisions: user.coherentDecisions,
                structuralPatterns: user.structuralPatterns,
                ineffectiveCycles: user.ineffectiveCycles,
                plan: user.plan,
            },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: 'Inicio de sesión exitoso',
            token,
            user: { // <-- Información del usuario en la respuesta
                id: user._id,
                name: user.name,
                email: user.email,
                level: user.level,
                coherentDecisions: user.coherentDecisions,
                structuralPatterns: user.structuralPatterns,
                ineffectiveCycles: user.ineffectiveCycles,
                plan: user.plan,
            },
        });

    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        res.status(500).json({ message: 'Error interno del servidor al iniciar sesión', error: error.message });
    }
});

module.exports = router;

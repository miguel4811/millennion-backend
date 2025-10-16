// userController.js

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { updatePlanLimits } = require('./subscriptionController'); 

// Constante para definir el límite ilimitado para usuarios autenticados
const UNLIMITED_AUTH_LIMIT = -1;

// @desc    Registrar un nuevo usuario
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
    const { userName, email, password } = req.body;

    if (!userName || !email || !password) {
        return res.status(400).json({ message: 'Por favor, introduce todos los campos: nombre de usuario, email y contraseña.' });
    }

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'Ya existe un usuario con este email.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
            userName,
            email,
            password: hashedPassword,
        });

        // Configurar los límites a ILIMITADOS (-1) para el plan "Free"
        user.plan = 'Free';
        user.creanovaMonthlyLimit = UNLIMITED_AUTH_LIMIT; // <-- ILIMITADO
        user.limenMonthlyLimit = UNLIMITED_AUTH_LIMIT;    // <-- ILIMITADO
        
        // Módulo "APRENDE DE NEGOCIOS" configurado como ILIMITADO
        user.aprendeNegociosMonthlyLimit = UNLIMITED_AUTH_LIMIT; // <-- ILIMITADO
        user.aprendeNegociosCurrentMonthUsage = 0;
        
        // Propiedades adicionales
        user.level = 1;
        user.coherentDecisions = 0;
        user.structuralPatterns = 0;
        user.ineffectiveCycles = 0;

        await user.save();

        const token = jwt.sign(
            { id: user._id, email: user.email, userName: user.userName },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(201).json({
            message: 'Registro exitoso',
            user: {
                id: user._id,
                userName: user.userName,
                email: user.email,
                plan: user.plan,
                creanovaMonthlyLimit: user.creanovaMonthlyLimit,
                limenMonthlyLimit: user.limenMonthlyLimit,
                // Devolvemos los límites ilimitados en la respuesta
                aprendeNegociosMonthlyLimit: user.aprendeNegociosMonthlyLimit,
                aprendeNegociosCurrentMonthUsage: user.aprendeNegociosCurrentMonthUsage,
                level: user.level,
                coherentDecisions: user.coherentDecisions,
                structuralPatterns: user.structuralPatterns,
                ineffectiveCycles: user.ineffectiveCycles,
            },
            token,
        });

    } catch (error) {
        console.error('Error en el registro de usuario:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'Error interno del servidor al registrar usuario.' });
    }
};

// @desc    Autenticar un usuario y obtener token
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Por favor, introduce email y contraseña.' });
    }

    try {
        // Asegúrate de que los campos con select: false se carguen (ej: password)
        const user = await User.findOne({ email }).select('+password'); 
        if (!user) {
            return res.status(400).json({ message: 'Credenciales inválidas (email no encontrado).' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Credenciales inválidas (contraseña incorrecta).' });
        }

        const token = jwt.sign(
            { id: user._id, email: user.email, userName: user.userName },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: 'Inicio de sesión exitoso',
            user: {
                id: user._id,
                userName: user.userName,
                email: user.email,
                plan: user.plan,
                creanovaMonthlyLimit: user.creanovaMonthlyLimit,
                limenMonthlyLimit: user.limenMonthlyLimit,
                // Devolvemos los límites
                aprendeNegociosMonthlyLimit: user.aprendeNegociosMonthlyLimit || UNLIMITED_AUTH_LIMIT,
                aprendeNegociosCurrentMonthUsage: user.aprendeNegociosCurrentMonthUsage || 0,
                paypalSubscriptionId: user.paypalSubscriptionId,
                paypalSubscriptionStatus: user.paypalSubscriptionStatus,
                level: user.level,
                coherentDecisions: user.coherentDecisions,
                structuralPatterns: user.structuralPatterns,
                ineffectiveCycles: user.ineffectiveCycles,
            },
            token,
        });

    } catch (error) {
        console.error('Error en el inicio de sesión:', error);
        res.status(500).json({ message: 'Error interno del servidor al iniciar sesión.' });
    }
};

// @desc    Obtener datos del perfil del usuario (requiere autenticación)
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error('Error al obtener el perfil del usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener el perfil.' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
};

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Importamos updatePlanLimits desde subscriptionController
const { updatePlanLimits } = require('./subscriptionController'); 

// @desc    Registrar un nuevo usuario
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
    const { userName, email, password } = req.body; // userName viene del frontend

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
            userName, // Aquí se asigna el userName del request al campo userName del modelo
            email,
            password: hashedPassword,
        });

        // --- CAMBIO IMPORTANTE AQUÍ ---
        // Configurar los límites del plan "Gratuito" directamente para evitar el error.
        user.plan = 'Gratuito';
        user.creanovaMonthlyLimit = 10;
        user.limenMonthlyLimit = 15;
        
        // Propiedades adicionales
        user.level = 1;
        user.coherentDecisions = 0;
        user.structuralPatterns = 0;
        user.ineffectiveCycles = 0;

        await user.save();

        const token = jwt.sign(
            { id: user._id, email: user.email, userName: user.userName }, // Correcto: user.userName
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(201).json({
            message: 'Registro exitoso',
            user: {
                id: user._id,
                userName: user.userName, // Correcto: user.userName
                email: user.email,
                plan: user.plan,
                creanovaMonthlyLimit: user.creanovaMonthlyLimit,
                limenMonthlyLimit: user.limenMonthlyLimit,
                level: user.level,
                coherentDecisions: user.coherentDecisions,
                structuralPatterns: user.structuralPatterns,
                ineffectiveCycles: user.ineffectiveCycles,
            },
            token,
        });

    } catch (error) {
        console.error('Error en el registro de usuario:', error);
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
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(400).json({ message: 'Credenciales inválidas (email no encontrado).' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Credenciales inválidas (contraseña incorrecta).' });
        }

        const token = jwt.sign(
            { id: user._id, email: user.email, userName: user.userName }, // ¡CORRECCIÓN AQUÍ!
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: 'Inicio de sesión exitoso',
            user: {
                id: user._id,
                userName: user.userName, // ¡CORRECCIÓN AQUÍ!
                email: user.email,
                plan: user.plan,
                creanovaMonthlyLimit: user.creanovaMonthlyLimit,
                limenMonthlyLimit: user.limenMonthlyLimit,
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

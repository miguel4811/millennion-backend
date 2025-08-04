const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    userName: { // <-- ¡Asegúrate de que este campo exista y se llame 'userName'!
        type: String,
        required: [true, 'Por favor, añade un nombre de usuario'],
        unique: true,
        trim: true,
        minlength: 3
    },
    email: {
        type: String,
        required: [true, 'Por favor, añade un email'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)@\w+([\.-]?\w+)(\.\w{2,3})+$/,
            'Por favor, añade un email válido'
        ]
    },
    password: {
        type: String,
        required: [true, 'Por favor, añade una contraseña'],
        minlength: 6,
        select: false // Para que la contraseña no se devuelva en las consultas por defecto
    },
    plan: {
        type: String,
        enum: ['Free', 'Essential', 'Forjador', 'Visionario'],
        default: 'Free'
    },
    // Límites de uso para Creanova
    creanovaMonthlyLimit: {
        type: Number,
        default: 5 // Ejemplo: 5 usos gratis al mes
    },
    creanovaCurrentMonthUsage: {
        type: Number,
        default: 0
    },
    creanovaLastReset: {
        type: Date,
        default: Date.now
    },
    // Límites de uso para Limen
    limenMonthlyLimit: {
        type: Number,
        default: 12 // Ejemplo: 12 usos gratis al mes
    },
    limenCurrentMonthUsage: {
        type: Number,
        default: 0
    },
    limenLastReset: {
        type: Date,
        default: Date.now
    },
    // Campos para la integración con PayPal
    paypalSubscriptionId: {
        type: String,
        default: null
    },
    paypalSubscriptionStatus: {
        type: String,
        enum: ['ACTIVE', 'APPROVED', 'CANCELLED', 'RESUMED', 'SUSPENDED', 'EXPIRED', 'PENDING', null],
        default: null
    },
    // Métricas adicionales del usuario
    level: {
        type: Number,
        default: 1
    },
    coherentDecisions: {
        type: Number,
        default: 0
    },
    structuralPatterns: {
        type: Number,
        default: 0
    },
    ineffectiveCycles: {
        type: Number,
        default: 0
    },
}, {
    timestamps: true // Añade createdAt y updatedAt automáticamente
});

module.exports = mongoose.model('User', UserSchema);

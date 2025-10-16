// millennion/backend/models/AnonymousUser.js

const mongoose = require('mongoose');

const AnonymousUserSchema = new mongoose.Schema({
    anonymousId: {
        type: String,
        required: true,
        unique: true,
        index: true // Para búsquedas rápidas por anonymousId
    },
    creanovaCurrentMonthUsage: {
        type: Number,
        default: 0
    },
    limenCurrentMonthUsage: {
        type: Number,
        default: 0
    },
    // **CAMBIO AÑADIDO:** Campo para el uso de Aprende de Negocios
    aprendeNegociosCurrentMonthUsage: {
        type: Number,
        default: 0
    },
    lastReset: { // Para saber cuándo fue el último reseteo de este usuario anónimo
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('AnonymousUser', AnonymousUserSchema);

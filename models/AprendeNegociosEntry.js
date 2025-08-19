const mongoose = require('mongoose');

// Definir el esquema para el módulo de Aprende de Negocios
const aprendeNegociosEntrySchema = new mongoose.Schema({
    // Referencia al usuario autenticado (si existe)
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
        required: false, // No es obligatorio si el usuario es anónimo
    },
    // Referencia al usuario anónimo (si existe)
    anonymousId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AnonymousUser',
        index: true,
        required: false, // No es obligatorio si el usuario está autenticado
    },
    // Tipo de interacción (por ejemplo, 'chat')
    type: {
        type: String,
        enum: ['chat'],
        required: true,
    },
    // El prompt o la consulta que envió el usuario
    query: {
        type: String,
        required: true,
    },
    // La respuesta generada por la IA
    response: {
        type: String,
        required: true,
    },
    // Fecha y hora de la creación del registro
    createdAt: {
        type: Date,
        default: Date.now,
    },
    // Metadatos adicionales si se necesitan (opcional)
    metadata: mongoose.Schema.Types.Mixed,
});

// Crear y exportar el modelo
const AprendeNegociosEntry = mongoose.model('AprendeNegociosEntry', aprendeNegociosEntrySchema);

module.exports = AprendeNegociosEntry;

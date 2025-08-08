const mongoose = require('mongoose');

const limenEntrySchema = new mongoose.Schema({
    userId: {
        type: String,
        required: false, // Ahora es opcional
        index: true
    },
    anonymousId: {
        type: String,
        required: false, // Campo para usuarios anónimos
        index: true
    },
    type: {
        type: String,
        // Enum expandido para incluir los nuevos tipos de interacción
        enum: ['revelation', 'doubt_response', 'impulse_resonance', 'ritual_activation'],
        required: true
    },
    query: {
        type: String,
        // El campo `query` ahora es requerido para `doubt_response` e `impulse_resonance`
        required: function() { 
            return this.type === 'doubt_response' || this.type === 'impulse_resonance';
        }
    },
    response: {
        type: String,
        required: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Middleware para actualizar la fecha de modificación antes de guardar
limenEntrySchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    
    // Custom validator para asegurar que haya un userId o un anonymousId
    if (!this.userId && !this.anonymousId) {
        return next(new Error('Una entrada de Límen debe tener un userId o un anonymousId.'));
    }
    next();
});

const LimenEntry = mongoose.model('LimenEntry', limenEntrySchema);

module.exports = LimenEntry;

const mongoose = require('mongoose');

const limenEntrySchema = new mongoose.Schema({
    userId: {
        type: String, // Coincide con el userId de tu Idea.js y authMiddleware
        required: true,
        index: true
    },
    type: {
        type: String, // 'revelation' o 'doubt_response'
        enum: ['revelation', 'doubt_response'], // Restringe los valores posibles
        required: true
    },
    query: {
        type: String, // La pregunta del usuario si el type es 'doubt_response'
        required: function() { return this.type === 'doubt_response'; } // Requerido solo si es una respuesta a duda
    },
    response: {
        type: String, // La revelación o la respuesta simbólica de la IA
        required: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed, // Para guardar cualquier información adicional relevante de la IA o el proceso
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
    next();
});

const LimenEntry = mongoose.model('LimenEntry', limenEntrySchema);

module.exports = LimenEntry;
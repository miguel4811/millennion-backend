const mongoose = require('mongoose');

const CreanovaEntrySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Referencia al modelo User
        required: true
    },
    userName: { // Para facilitar la consulta por nombre de usuario
        type: String,
        required: true
    },
    type: { // Por ejemplo: 'project_idea', 'ecosystem_plan', 'mvp_blueprint'
        type: String,
        required: true,
        default: 'project_idea'
    },
    prompt: { // El prompt original del usuario
        type: String,
        required: true
    },
    response: { // La respuesta generada por la IA
        type: String,
        required: true
    },
    conversation: { // Opcional: para guardar el historial completo del chat
        type: Array,
        default: []
    },
    metadata: { // Para cualquier dato adicional que quieras guardar
        type: Object,
        default: {}
    }
}, {
    timestamps: true // Añade createdAt y updatedAt automáticamente
});

module.exports = mongoose.model('CreanovaEntry', CreanovaEntrySchema);

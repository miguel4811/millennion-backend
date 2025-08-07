const mongoose = require('mongoose');

const CreanovaEntrySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
        // Ya no es 'required'
    },
    anonymousId: {
        type: String
        // Nuevo campo para usuarios anónimos
    },
    userName: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
        default: 'project_idea'
    },
    prompt: {
        type: String,
        required: true
    },
    response: {
        type: String,
        required: true
    },
    conversation: {
        type: Array,
        default: []
    },
    metadata: {
        type: Object,
        default: {}
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('CreanovaEntry', CreanovaEntrySchema);

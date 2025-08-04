const mongoose = require('mongoose');

const ideaSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  tags: {
    type: [String],
    default: []
  },
  // --- ¡NUEVOS CAMPOS! ---
  innovativePotential: {
    type: String, // O un Number, dependiendo de cómo quieras representarlo (ej. "Alto", "Medio")
    required: false // No es requerido si la idea es manual
  },
  isGeneratedByAI: {
    type: Boolean,
    default: false // Por defecto, una idea no es generada por IA
  },
  // --- FIN NUEVOS CAMPOS ---
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

ideaSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Idea = mongoose.model('Idea', ideaSchema);

module.exports = Idea;
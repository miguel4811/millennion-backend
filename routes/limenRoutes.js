// millennion/backend/routes/limenRoutes.js

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware'); // Asegúrate de importar protect
const User = require('../models/User'); // Importa el modelo de usuario
// const { getRevelationFromAI } = require('../services/aiService'); // Asume que tienes un servicio de IA

// @desc    Obtener una revelación/guía con IA
// @route   POST /api/limen/get-revelation  <-- ¡AJUSTA ESTA RUTA A LA QUE USAS REALMENTE!
// @access  Private
router.post('/get-revelation', protect, async (req, res) => {
    const { userDoubt, context } = req.body; // Ajusta según lo que reciba tu API de Limen

    // === VERIFICACIÓN DE LÍMITES PARA LÍMEN ===
    const user = req.user; // Obtenido del middleware 'protect'

    // Lógica de reseteo mensual (redundante si ya lo haces en /me/plan, pero buena práctica como fallback)
    const now = new Date();
    const limenResetDate = new Date(user.limenLastReset);
    const nextLimenResetDue = new Date(limenResetDate.setMonth(limenResetDate.getMonth() + 1));
    if (now >= nextLimenResetDue) {
        user.limenCurrentMonthUsage = 0;
        user.limenLastReset = now;
        await user.save(); // Guarda el reseteo inmediatamente
    }

    // Comprobar si el usuario ha alcanzado su límite para Limen
    if (user.limenMonthlyLimit !== -1 && user.limenCurrentMonthUsage >= user.limenMonthlyLimit) {
        return res.status(403).json({
            message: 'Has alcanzado tu límite de 12 revelaciones de Límen para este mes. Actualiza tu plan para recibir más guía y claridad.'
        });
    }

    try {
        // --- Aquí iría tu lógica real para llamar a la API de LLM (Gemini) para Límen ---
        // const revelation = await getRevelationFromAI(userDoubt, context);
        // Por ahora, un ejemplo de respuesta
        const revelation = `[Revelación IA] Tu duda sobre "${userDoubt.substring(0, 30)}..." te indica que debes ${context}.`;
        // --- FIN de la lógica de LLM ---

        // === INCREMENTO DE USO Y GUARDADO ===
        user.limenCurrentMonthUsage += 1;
        await user.save(); // Guarda el uso actualizado del usuario

        res.status(200).json({ revelation: revelation, message: 'Revelación obtenida con éxito.' });

    } catch (error) {
        console.error('Error al obtener revelación de Límen:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener la revelación.' });
    }
});

// ... (otras rutas existentes, si las tienes, también deben usar protect)

module.exports = router;
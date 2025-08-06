// millennion/backend/controllers/adminController.js

const User = require('../models/User');
const { updatePlanLimits } = require('./subscriptionController'); // Importa la función para resetear límites

// @desc   Resetear los límites de uso mensuales para todos los usuarios
// @route   POST /api/admin/reset-monthly-usage (Esta ruta será llamada por un cron job)
// @access  Private (Solo accesible internamente o con un token de administrador/API específico)
const resetMonthlyUsage = async (req, res) => {
    try {
        // En un entorno real, aquí podrías añadir una verificación de token de API
        // o un secreto para asegurar que solo Render Cron Job pueda llamar a esta ruta.
        // Por ahora, la protección será a nivel de la ruta en adminRoutes.js si lo deseas.

        const users = await User.find({}); // Encuentra todos los usuarios

        let updatedCount = 0;
        for (const user of users) {
            // Solo resetear si el uso actual es mayor que 0 o si la fecha de reset es del mes anterior
            // La lógica de updatePlanLimits ya resetea los contadores a 0.
            // Aquí, queremos resetear el uso actual y la fecha de reset para el mes en curso.
            const now = new Date();
            const lastReset = user.creanovaLastReset || new Date(0); // Usa 0 para usuarios sin fecha
            
            // Comprueba si el último reseteo fue en un mes diferente al actual
            if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
                user.creanovaCurrentMonthUsage = 0;
                user.limenCurrentMonthUsage = 0;
                user.creanovaLastReset = now; // Actualiza la fecha de último reseteo
                user.limenLastReset = now;   // Actualiza la fecha de último reseteo
                await user.save();
                updatedCount++;
            }
        }

        console.log(`[CRON JOB] Límites mensuales reseteados para ${updatedCount} usuarios.`);
        res.status(200).json({ message: `Límites mensuales reseteados para ${updatedCount} usuarios.`, updatedCount });

    } catch (error) {
        console.error('Error en el cron job de reseteo de límites:', error);
        res.status(500).json({ message: 'Error interno del servidor al resetear límites mensuales.' });
    }
};

module.exports = {
    resetMonthlyUsage,
};

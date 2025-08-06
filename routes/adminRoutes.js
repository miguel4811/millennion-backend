// millennion/backend/routes/adminRoutes.js

const express = require('express');
const router = express.Router();
const { resetMonthlyUsage } = require('../controllers/adminController');

// Middleware simple para proteger la ruta del cron job
// En un entorno de producción, esto debería ser un token de API secreto
// conocido solo por Render Cron Job y tu backend.
const protectCronJob = (req, res, next) => {
    // Ejemplo: Verifica un secreto en el encabezado
    const cronSecret = req.headers['x-cron-secret'];
    if (cronSecret === process.env.CRON_JOB_SECRET) { // DEBES DEFINIR CRON_JOB_SECRET EN RENDER
        next();
    } else {
        res.status(403).json({ message: 'Acceso denegado al cron job. Secreto inválido.' });
    }
};

// @desc   Ruta para el cron job de reseteo de límites mensuales
// @route   POST /api/admin/reset-monthly-usage
// @access  Protegido por un secreto de cron job
router.post('/reset-monthly-usage', protectCronJob, resetMonthlyUsage);

module.exports = router;

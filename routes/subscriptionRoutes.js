// millennion/backend/routes/subscriptionRoutes.js

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware'); 
const {
    changeUserPlan,
    createPayPalSubscription,
    executePayPalSubscription, // <-- ¡IMPORTADO AHORA!
    handlePayPalWebhook
} = require('../controllers/subscriptionController');

// @desc    Cambiar el plan de un usuario (para uso administrativo o webhooks de pago)
// @route   POST /api/subscriptions/change-plan
// @access  Private (requiere autenticación y posiblemente admin privileges)
router.post('/change-plan', protect, changeUserPlan);

// === RUTAS DE PAYPAL ===

// @desc    Crea una suscripción de PayPal y devuelve la URL de aprobación
// @route   POST /api/subscriptions/create-paypal-subscription
// @access  Private (solo usuarios autenticados pueden iniciar una suscripción)
router.post('/create-paypal-subscription', protect, createPayPalSubscription);

// @desc    Ejecuta una suscripción de PayPal después de la aprobación del usuario
// @route   POST /api/subscriptions/execute-paypal-subscription
// @access  Private (requiere autenticación para confirmar la suscripción)
router.post('/execute-paypal-subscription', protect, executePayPalSubscription); // <-- ¡NUEVA RUTA!

// @desc    Endpoint para webhooks de PayPal
// @route   POST /api/subscriptions/paypal-webhook
// @access  Public (PayPal envía aquí, la verificación de la firma se hace dentro del controlador)
router.post('/paypal-webhook', handlePayPalWebhook);

// === FIN RUTAS DE PAYPAL ===

module.exports = router;

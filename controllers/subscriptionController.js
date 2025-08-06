// millennion/backend/controllers/subscriptionController.js

const User = require('../models/User');
const axios = require('axios'); // Para hacer peticiones HTTP a la API de PayPal

// Función auxiliar para actualizar los límites del usuario según el plan
const updatePlanLimits = (user, planName) => {
    switch (planName) {
        case 'Free':
            user.creanovaMonthlyLimit = 10; // ¡ACTUALIZADO: 10 usos mensuales para Creanova!
            user.limenMonthlyLimit = 15;   // ¡ACTUALIZADO: 15 usos mensuales para Limen!
            break;
        case 'Essential':
            user.creanovaMonthlyLimit = 50;
            user.limenMonthlyLimit = 80;
            break;
        case 'Forjador':
            user.creanovaMonthlyLimit = 200;
            user.limenMonthlyLimit = 320;
            break;
        case 'Visionario':
            user.creanovaMonthlyLimit = -1; // -1 significa ilimitado
            user.limenMonthlyLimit = -1;
            break;
        default:
            user.creanovaMonthlyLimit = 10; // Valor por defecto para Free
            user.limenMonthlyLimit = 15;   // Valor por defecto para Free
            planName = 'Free';
    }
    user.plan = planName;
    user.creanovaCurrentMonthUsage = 0;
    user.limenCurrentMonthUsage = 0;
    user.creanovaLastReset = new Date();
    user.limenLastReset = new Date();
};

// Controlador de ejemplo para "simular" un cambio de plan (para uso administrativo o tests)
const changeUserPlan = async (req, res) => {
    const { userId, newPlan } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) { return res.status(404).json({ message: 'Usuario no encontrado.' }); }
        const validPlans = ['Free', 'Essential', 'Forjador', 'Visionario'];
        if (!validPlans.includes(newPlan)) { return res.status(400).json({ message: 'Plan no válido.' }); }
        updatePlanLimits(user, newPlan);
        await user.save();
        res.status(200).json({ message: `Plan de usuario actualizado a ${newPlan}`, user: user });
    } catch (error) {
        console.error('Error al cambiar el plan del usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor al actualizar el plan.' });
    }
};


// === FUNCIONES Y CONTROLADORES PARA PAYPAL ===

// Función para obtener un Access Token de PayPal
const generateAccessToken = async () => {
    const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString('base64');
    try {
        // IMPORTANTE: Asegúrate de que PAYPAL_API_BASE esté configurado en Render
        // Para Sandbox: https://api-m.sandbox.paypal.com
        // Para Producción (LIVE): https://api-m.paypal.com
        const response = await axios.post(
            `${process.env.PAYPAL_API_BASE}/v1/oauth2/token`,
            'grant_type=client_credentials',
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );
        return response.data.access_token;
    } catch (error) {
        console.error('Error al generar token de acceso de PayPal:', error.response ? error.response.data : error.message);
        throw new Error('No se pudo generar el token de acceso de PayPal.');
    }
};

// Mapeo de tus planes a los Plan IDs de PayPal (LIVE)
// ¡IMPORTANTE! ESTOS SON LOS IDs REALES QUE OBTUVISTE DE PAYPAL LIVE.
const planToPayPalPlanId = {
    Essential: 'P-3VR86834ML9882119NCDHUUY', // ¡ID REAL DEL PLAN ESSENTIAL DE LIVE!
    Forjador: 'P-5RL977229K126853LNCDHXPQ',   // ¡ID REAL DEL PLAN FORJADOR DE LIVE!
    Visionario: 'P-01W50725YJ103935FNCDHYGQ', // ¡ID REAL DEL PLAN VISIONARIO DE LIVE!
};

// @desc    Crear una suscripción de PayPal para un usuario
// @route   POST /api/subscriptions/create-paypal-subscription
// @access  Private (requiere que el usuario esté autenticado)
const createPayPalSubscription = async (req, res) => {
    const { planName } = req.body; 
    const userId = req.user._id; 
    const userEmail = req.user.email;

    const paypalPlanId = planToPayPalPlanId[planName];
    if (!paypalPlanId) {
        return res.status(400).json({ message: 'Plan seleccionado no válido o no configurado en PayPal.' });
    }

    try {
        const accessToken = await generateAccessToken();

        const subscriptionPayload = {
            plan_id: paypalPlanId,
            subscriber: {
                name: {
                    given_name: req.user.userName || 'Usuario', 
                    surname: 'Millennion' 
                },
                email_address: userEmail, 
            },
            application_context: {
                return_url: process.env.PAYPAL_RETURN_URL, 
                cancel_url: process.env.PAYPAL_CANCEL_URL,  
                brand_name: 'Millennion', 
                locale: 'es-DO', 
                shipping_preference: 'NO_SHIPPING',
                user_action: 'SUBSCRIBE_NOW' 
            },
        };
        console.log('Payload enviado a PayPal para crear suscripción:', JSON.stringify(subscriptionPayload, null, 2));

        const subscription = await axios.post(
            `${process.env.PAYPAL_API_BASE}/v1/billing/subscriptions`,
            subscriptionPayload, 
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const approveLink = subscription.data.links.find(link => link.rel === 'approve');
        if (!approveLink) {
            throw new Error('No se encontró el enlace de aprobación en la respuesta de PayPal.');
        }

        // Guarda el ID de la suscripción de PayPal en el usuario temporalmente o para referencia
        const user = await User.findById(userId);
        if (user) {
            user.paypalSubscriptionId = subscription.data.id;
            user.paypalSubscriptionStatus = 'PENDING'; 
            await user.save();
        }

        res.json({ approvalUrl: approveLink.href, paypalSubscriptionId: subscription.data.id });

    } catch (error) {
        console.error('Error al crear suscripción de PayPal:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Error interno del servidor al iniciar la suscripción con PayPal.' });
    }
};

// @desc    Ejecutar una suscripción de PayPal después de la aprobación del usuario
// @route   POST /api/subscriptions/execute-paypal-subscription
// @access  Private (requiere que el usuario esté autenticado)
const executePayPalSubscription = async (req, res) => {
    const { token, subscriptionId } = req.body; 
    const userId = req.user._id; 

    if (!token || !subscriptionId) {
        return res.status(400).json({ message: 'Faltan parámetros de token o ID de suscripción.' });
    }

    try {
        const accessToken = await generateAccessToken();

        const subscriptionDetails = await axios.get(
            `${process.env.PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const paypalSubscription = subscriptionDetails.data;
        
        console.log(`Email de PayPal (suscriptor): ${paypalSubscription.subscriber.email_address}`);
        console.log(`Email del usuario autenticado (req.user.email): ${req.user.email}`);

        // Solo verificar el estado de la suscripción
        if (paypalSubscription.status === 'APPROVED' || paypalSubscription.status === 'ACTIVE') {
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado para actualizar el plan.' });
            }

            let planNameFromPayPal = null;
            for (const planKey in planToPayPalPlanId) {
                if (planToPayPalPlanId[planKey] === paypalSubscription.plan_id) {
                    planNameFromPayPal = planKey;
                    break;
                }
            }

            if (planNameFromPayPal) {
                user.paypalSubscriptionId = paypalSubscription.id;
                user.paypalSubscriptionStatus = paypalSubscription.status; 
                updatePlanLimits(user, planNameFromPayPal); 
                await user.save();
                console.log(`Usuario ${user.email} actualizado a plan ${user.plan} tras ejecución de PayPal.`);
                return res.status(200).json({ message: 'Suscripción ejecutada y plan actualizado con éxito.', user: user });
            } else {
                console.warn(`Plan ID de PayPal ${paypalSubscription.plan_id} no mapeado a un plan conocido durante la ejecución.`);
                return res.status(400).json({ message: 'Plan de PayPal no reconocido.' });
            }
        } else {
            console.warn(`Suscripción ${subscriptionId} no aprobada. Estado: ${paypalSubscription.status}`);
            return res.status(400).json({ message: 'Suscripción no aprobada.' });
        }

    } catch (error) {
        console.error('Error al ejecutar suscripción de PayPal:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Error interno del servidor al ejecutar la suscripción con PayPal.' });
    }
};


// @desc    Manejar eventos de Webhook de PayPal
// @route   POST /api/subscriptions/paypal-webhook
// @access  Public (PayPal envía aquí)
const handlePayPalWebhook = async (req, res) => {
    const webhookEvent = req.body;

    // --- Paso de verificación del webhook (¡Crucial para la seguridad!) ---
    if (!process.env.PAYPAL_WEBHOOK_ID) {
        console.error('PAYPAL_WEBHOOK_ID no está configurado en las variables de entorno.');
        return res.status(500).send('Webhook ID no configurado en el servidor.');
    }

    try {
        const accessToken = await generateAccessToken();
        const verificationResponse = await axios.post(
            `${process.env.PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
            {
                auth_algo: req.headers['paypal-auth-algo'],
                cert_url: req.headers['paypal-cert-url'],
                transmission_id: req.headers['paypal-transmission-id'],
                transmission_sig: req.headers['paypal-transmission-sig'],
                transmission_time: req.headers['paypal-transmission-time'],
                webhook_id: process.env.PAYPAL_WEBHOOK_ID, 
                webhook_event: webhookEvent 
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (verificationResponse.data.verification_status !== 'SUCCESS') {
            console.warn('Fallo en la verificación de firma de webhook de PayPal:', verificationResponse.data.verification_status);
            return res.status(400).send('Firma de webhook inválida.');
        }
    } catch (error) {
        console.error('Error de verificación de firma de webhook de PayPal:', error.response ? error.response.data : error.message);
        return res.status(400).send('Error durante la verificación de firma del webhook.');
    }

    // --- Lógica para manejar los eventos de PayPal ---
    switch (webhookEvent.event_type) {
        case 'BILLING.SUBSCRIPTION.ACTIVATED':
            const activatedSubscription = webhookEvent.resource;
            console.log(`PayPal Subscription Activated: ${activatedSubscription.id}`);
            try {
                const user = await User.findOne({ email: activatedSubscription.subscriber.email_address });
                if (user) {
                    user.paypalSubscriptionId = activatedSubscription.id;
                    user.paypalSubscriptionStatus = activatedSubscription.status; 
                    
                    let planNameFromPayPal = null;
                    for (const planKey in planToPayPalPlanId) {
                        if (planToPayPalPlanId[planKey] === activatedSubscription.plan_id) {
                            planNameFromPayPal = planKey;
                            break;
                        }
                    }

                    if (planNameFromPayPal) {
                        updatePlanLimits(user, planNameFromPayPal);
                        await user.save();
                        console.log(`Usuario ${user.email} actualizado a plan ${user.plan} via PayPal webhook.`);
                    } else {
                        console.warn(`Plan ID de PayPal ${activatedSubscription.plan_id} no mapeado a un plan conocido.`);
                    }
                } else {
                    console.warn(`Usuario no encontrado para email: ${activatedSubscription.subscriber.email_address} en BILLING.SUBSCRIPTION.ACTIVATED`);
                }
            } catch (err) {
                console.error('Error al actualizar usuario en PAYPAL.SUBSCRIPTION.ACTIVATED:', err.message);
            }
            break;

        case 'BILLING.SUBSCRIPTION.CANCELLED':
        case 'BILLING.SUBSCRIPTION.EXPIRED':
        case 'BILLING.SUBSCRIPTION.SUSPENDED':
            const changedSubscription = webhookEvent.resource;
            console.log(`PayPal Subscription ${webhookEvent.event_type}: ${changedSubscription.id}`);
            try {
                const user = await User.findOne({ paypalSubscriptionId: changedSubscription.id });
                if (user) {
                    user.paypalSubscriptionStatus = changedSubscription.status;
                    // Si se cancela, expira o suspende, degradar al plan gratuito
                    updatePlanLimits(user, 'Free');
                    // Opcional: limpiar paypalSubscriptionId si la suscripción ya no es válida
                    if (webhookEvent.event_type === 'BILLING.SUBSCRIPTION.CANCELLED' || webhookEvent.event_type === 'BILLING.SUBSCRIPTION.EXPIRED') {
                        user.paypalSubscriptionId = undefined; // O null
                    }
                    await user.save();
                    console.log(`Usuario ${user.email} degradado a plan Free por estado de suscripción: ${changedSubscription.status}`);
                }
            } catch (err) {
                console.error(`Error al manejar ${webhookEvent.event_type}:`, err.message);
            }
            break;

        // Puedes añadir más casos para otros eventos importantes:
        // case 'PAYMENT.SALE.COMPLETED': // para cobros de suscripción exitosos
        // case 'PAYMENT.SALE.DENIED':
        // case 'PAYMENT.SALE.REFUNDED':

        default:
            console.log(`Evento PayPal no manejado: ${webhookEvent.event_type}`);
    }

    res.status(200).send('Webhook recibido y procesado.');
};

module.exports = {
    changeUserPlan,
    updatePlanLimits, 
    createPayPalSubscription,
    executePayPalSubscription, 
    handlePayPalWebhook,
};

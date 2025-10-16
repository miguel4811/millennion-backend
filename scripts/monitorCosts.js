// millennion/backend/scripts/monitorCosts.js

const dotenv = require('dotenv').config(); // Para cargar variables de entorno
const mongoose = require('mongoose'); // NECESARIO para manejar la conexión de Mongoose.
const connectDB = require('../config/db'); // Para conectar a tu base de datos
const User = require('../models/User'); // Tu modelo de usuario

// Asegúrate de que tienes una forma de enviar emails si quieres alertas automáticas
// const nodemailer = require('nodemailer'); // Ejemplo de librería para emails

// Conectar a la base de datos
connectDB();

// Costo estimado de LLM API por usuario gratuito al mes (revisa tu cálculo más reciente)
const COST_PER_FREE_USER_LLM_MONTHLY = 0.03871; // USD

async function monitorMillennionCosts() {
    try {
        const freeUsers = await User.find({ plan: 'Free' }).countDocuments();
        const paidUsers = await User.find({ plan: { $in: ['Essential', 'Forjador', 'Visionario'] } });

        let totalFreeUserLLMCost = freeUsers * COST_PER_FREE_USER_LLM_MONTHLY;

        let totalPaidSubscriptionRevenue = 0;
        paidUsers.forEach(user => {
            switch (user.plan) {
                case 'Essential':
                    totalPaidSubscriptionRevenue += 9.99;
                    break;
                case 'Forjador':
                    totalPaidSubscriptionRevenue += 29.99;
                    break;
                case 'Visionario':
                    // Si tienes precios personalizados para Visionario, asegúrate de que el usuario.customPlanPrice exista
                    totalPaidSubscriptionRevenue += user.customPlanPrice || 99.00; // Asume un mínimo si no está
                    break;
            }
        });

        // Umbral de advertencia: Costo de Free Users > 25% de los ingresos de Paid Users
        const WARNING_THRESHOLD_PERCENTAGE = 0.25;
        const warningThresholdAmount = totalPaidSubscriptionRevenue * WARNING_THRESHOLD_PERCENTAGE;

        let alertMessage = '';

        if (totalFreeUserLLMCost > warningThresholdAmount && totalPaidSubscriptionRevenue > 0) {
            alertMessage = `
            🚨 ¡ALERTA CRÍTICA DE COSTOS DE USUARIOS GRATUITOS EN MILLENNION! 🚨

            Fecha: ${new Date().toLocaleString()}
            Total de Usuarios Gratuitos: ${freeUsers}
            Total de Usuarios Pagos: ${paidUsers.length}

            Costo total estimado de LLM para Usuarios Gratuitos este mes: $${totalFreeUserLLMCost.toFixed(2)} USD
            Ingresos totales por Suscripciones Pagas este mes: $${totalPaidSubscriptionRevenue.toFixed(2)} USD

            ¡El costo de tus usuarios gratuitos ($${totalFreeUserLLMCost.toFixed(2)}) supera el ${WARNING_THRESHOLD_PERCENTAGE * 100}% de tus ingresos pagados ($${totalPaidSubscriptionRevenue.toFixed(2)})!

            Esto es una señal de que necesitas revisar tu estrategia de conversión, límites del plan gratuito o modelo de precios.
            
            Acciones recomendadas:
            - Evaluar la tasa de conversión de Free a Paid.
            - Considerar ajustar los límites del plan Free.
            - Mejorar los llamados a la acción para la suscripción.
            - Investigar picos de uso inusuales.
            `;
        } else if (freeUsers > 1000 && paidUsers.length < 10 && totalPaidSubscriptionRevenue === 0) {
            // Una alerta adicional si hay muchos usuarios gratuitos sin ingresos
            alertMessage = `
            ⚠️ ¡ADVERTENCIA: ALTO VOLUMEN DE USUARIOS GRATUITOS SIN INGRESOS! ⚠️

            Fecha: ${new Date().toLocaleString()}
            Total de Usuarios Gratuitos: ${freeUsers}
            Total de Usuarios Pagos: ${paidUsers.length}
            Ingresos de Suscripciones: $${totalPaidSubscriptionRevenue.toFixed(2)} USD

            Tienes un alto número de usuarios gratuitos sin suficiente compensación por ingresos.
            Considera impulsar la conversión a planes de pago.
            `;
        }

        if (alertMessage) {
            console.warn(alertMessage);
            // --- AQUÍ IRÍA LA LÓGICA PARA ENVIAR LA ALERTA POR EMAIL ---
            // Ejemplo (requiere configurar nodemailer):
            /*
            const transporter = nodemailer.createTransport({
                service: 'gmail', // o tu proveedor SMTP
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: 'tu_email_de_alerta@ejemplo.com', // ¡Cambia esto por tu email!
                subject: 'Alerta de Costos de Millennion',
                text: alertMessage
            };

            await transporter.sendMail(mailOptions);
            console.log('Alerta por email enviada.');
            */
            // --- FIN LÓGICA DE EMAIL ---
        } else {
            console.log('Monitoreo de costos: Todo bajo control.');
        }

        // Desconectar de la BD al finalizar (si este script se ejecuta de forma independiente)
        mongoose.connection.close();

    } catch (error) {
        console.error('Error en el script de monitoreo de costos:', error);
        mongoose.connection.close(); // Asegurarse de cerrar la conexión incluso en error
    }
}

monitorMillennionCosts();

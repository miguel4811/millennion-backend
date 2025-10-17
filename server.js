// Importamos los módulos necesarios
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Ya importado, ¡excelente!

// Importaciones de rutas existentes
const userRoutes = require('./routes/Users');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const limenRoutes = require('./routes/limenRoutes');
const creanovaRoutes = require('./routes/creanovaRoutes');
const aprendeNegociosRoutes = require('./routes/aprendeNegociosRoutes');

// Importaciones de las nuevas rutas para Engine, y el orquestador Sigma
const engineRoutes = require('./routes/engineRoutes');
const Sigma = require('./routes/sigmaRoutes'); 
const { checkUsage } = require('./middleware/usageMiddleware');

const app = express();

// --- CONFIGURACIÓN DE CORS CORREGIDA Y OPTIMIZADA ---
// Permitir las variantes con y sin 'www', además del dominio de Render para pruebas (si fuera necesario).
const allowedOrigins = [
    'https://millennionbdd.com', 
    'https://www.millennionbdd.com',
    'https://millennion-backend.onrender.com' // Si necesitas que el backend acceda a sí mismo o para pruebas.
];

const corsOptions = {
    origin: allowedOrigins,
    // El status 204 es el estándar para respuestas pre-vuelo exitosas (preflight)
    optionsSuccessStatus: 204, 
    exposedHeaders: ['X-Set-Anonymous-ID']
    // No usamos 'credentials: true' a menos que realmente se usen cookies/sesiones
};

app.use(cors(corsOptions));
app.use(express.json()); // Middleware para parsear JSON en el body

// -------------------------------------------------------------------------

// Conexión a MongoDB
const mongoUri = process.env.MONGO_URI;

mongoose.connect(mongoUri)
    .then(() => console.log('✅ MongoDB conectado con éxito.'))
    .catch(err => {
        console.error('❌ Error al conectar a MongoDB:', err.message);
        process.exit(1);
    });

// Uso de rutas de la API
app.use('/api/users', userRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/limen', checkUsage, limenRoutes);
app.use('/api/creanova', checkUsage, creanovaRoutes);
app.use('/api/aprende-negocios', checkUsage, aprendeNegociosRoutes);

// Middleware para manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Algo salió mal en el servidor!' });
});

// *** Nuevo: Inicializar Sigma con los módulos de chat ***
Sigma.registerModules({
    limen: limenRoutes,
    creanova: creanovaRoutes,
    aprendeNegocios: aprendeNegociosRoutes
});

const PORT = process.env.PORT || 3001;

// Inicio del servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor de Millennion BDD corriendo en el puerto ${PORT}`);
});

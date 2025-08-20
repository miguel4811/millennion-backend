// Importamos los módulos necesarios
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Importaciones de rutas existentes
const userRoutes = require('./routes/Users');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const limenRoutes = require('./routes/limenRoutes');
const creanovaRoutes = require('./routes/creanovaRoutes');
const aprendeNegociosRoutes = require('./routes/aprendeNegociosRoutes');

// Importaciones de las nuevas rutas para Engine, y el orquestador Sigma
const engineRoutes = require('./routes/engineRoutes');
const Sigma = require('./routes/sigmaRoutes'); // Importamos la instancia de la clase Sigma
const { checkUsage } = require('./middleware/usageMiddleware');

const app = express();

// Configuración de CORS
const corsOptions = {
    origin: ['https://millennionbdd.com', 'https://www.millennionbdd.com'],
    optionsSuccessStatus: 200,
    exposedHeaders: ['X-Set-Anonymous-ID']
};
app.use(cors(corsOptions));
app.use(express.json());

// Conexión a MongoDB
const mongoUri = process.env.MONGO_URI;

mongoose.connect(mongoUri)
    .then(() => console.log('✅ MongoDB conectado con éxito.'))
    .catch(err => {
        console.error('❌ Error al conectar a MongoDB:', err.message);
        process.exit(1);
    });

// Uso de rutas de la API. Aquí es donde se eliminó la línea problemática.
app.use('/api/users', userRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/limen', checkUsage, limenRoutes);
app.use('/api/creanova', checkUsage, creanovaRoutes);
app.use('/api/aprende-negocios', checkUsage, aprendeNegociosRoutes);
app.use('/api/engine', checkUsage, engineRoutes);

// Middleware para manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Algo salió mal en el servidor!' });
});

const PORT = process.env.PORT || 3001;

// Inicio del servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor de Millennion BDD corriendo en el puerto ${PORT}`);
});

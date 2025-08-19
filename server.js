// server.js (para depuración)

// 1. Importar módulos necesarios
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Importar rutas y middlewares
const userRoutes = require('./routes/Users');
const subscriptionRoutes = require('./routes/subscriptionRoutes'); // COMENTADA TEMPORALMENTE
const adminRoutes = require('./routes/adminRoutes'); // COMENTADA TEMPORALMENTE
const limenRoutes = require('./routes/limenRoutes'); // COMENTADA TEMPORALMENTE
const creanovaRoutes = require('./routes/creanovaRoutes'); // COMENTADA TEMPORALMENTE
const aprendeNegociosRoutes = require('./routes/aprendeNegociosRoutes'); // COMENTADA TEMPORALMENTE

const { checkUsage } = require('./middleware/usageMiddleware'); // COMENTADA TEMPORALMENTE

// 2. Inicializar la aplicación Express
const app = express();

// 3. Configuración de middlewares
const corsOptions = {
    origin: ['https://millennionbdd.com', 'https://www.millennionbdd.com'],
    optionsSuccessStatus: 200,
    exposedHeaders: ['X-Set-Anonymous-ID']
};
app.use(cors(corsOptions));
app.use(express.json());

// 4. Conexión a la base de datos MongoDB
const mongoUri = process.env.MONGO_URI;

mongoose.connect(mongoUri)
    .then(() => console.log('MongoDB conectado con éxito.'))
    .catch(err => {
        console.error('Error al conectar a MongoDB:', err.message);
        process.exit(1);
    });

// 5. Configuración de la clave secreta de JWT (ya está en .env y se usa en middleware)

// 6. Definición de Rutas de la API
// Rutas que no requieren 'checkUsage'
app.use('/api/users', userRoutes);
// app.use('/api/subscriptions', subscriptionRoutes); // COMENTADA
// app.use('/api/admin', adminRoutes); // COMENTADA

// Rutas de los sistemas que usan 'checkUsage'
// app.use('/api/limen', checkUsage, limenRoutes); // COMENTADA
// app.use('/api/creanova', checkUsage, creanovaRoutes); // COMENTADA
// app.use('/api/aprende-negocios', checkUsage, aprendeNegociosRoutes); // COMENTADA

// 7. Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '..', 'frontend', 'dist', 'index.html'));
});

// 8. Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Algo salió mal en el servidor!' });
});

// 9. Iniciar el servidor
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Servidor de Millennion BDD corriendo en el puerto ${PORT}`);
    console.log(`URL del backend: http://localhost:${PORT}`);
});

// 1. Importar módulos necesarios
require('dotenv').config(); // Carga las variables de entorno desde .env al inicio
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Importa el módulo CORS
const path = require('path'); // Módulo nativo para trabajar con rutas de archivos

// Importar rutas y middlewares
// Rutas de la API principal y sus sistemas
const userRoutes = require('./routes/Users'); // Rutas para gestión de usuarios (login, register, profile)
const subscriptionRoutes = require('./routes/subscriptionRoutes'); // Rutas de suscripción (PayPal)
const adminRoutes = require('./routes/adminRoutes'); // Rutas de administración (para cron jobs, etc.)

// Rutas de los sistemas de Millennion
const limenRoutes = require('./routes/limenRoutes');
const creanovaRoutes = require('./routes/creanovaRoutes');
const aprendeNegociosRoutes = require('./routes/aprendeNegociosRoutes'); // NUEVO MÓDULO

// Rutas de sistemas que se asumen en la carpeta 'systems'
const sigmaRoutes = require('./systems/sigma'); 
const nexusRoutes = require('./systems/nexus');
const financeRoutes = require('./systems/finance');
const engineRoutes = require('./systems/engine');

// Middleware para verificar uso (anónimo/autenticado)
const { checkUsage } = require('./middleware/usageMiddleware'); 

// 2. Inicializar la aplicación Express
const app = express();

// 3. Configuración de middlewares
// Configuración de CORS para permitir solicitudes solo desde tus frontends
const corsOptions = {
    // Acepta ambos dominios para el frontend
    origin: ['https://millennionbdd.com', 'https://www.millennionbdd.com'], 
    optionsSuccessStatus: 200, // Para navegadores antiguos
    // Permite que el frontend lea este encabezado para manejar sesiones anónimas
    exposedHeaders: ['X-Set-Anonymous-ID']
};
app.use(cors(corsOptions)); // Habilita CORS con las opciones definidas
app.use(express.json()); // Permite a Express parsear cuerpos de petición JSON

// 4. Conexión a la base de datos MongoDB
const mongoUri = process.env.MONGO_URI;

mongoose.connect(mongoUri)
    .then(() => console.log('MongoDB conectado con éxito.'))
    .catch(err => {
        console.error('Error al conectar a MongoDB:', err.message);
        process.exit(1); // Es buena práctica salir si la DB no se conecta
    });

// 5. Configuración de la clave secreta de JWT (ya está en .env y se usa en middleware)

// 6. Definición de Rutas de la API
// Rutas que no requieren 'checkUsage'
app.use('/api/users', userRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/admin', adminRoutes);

// Rutas de los sistemas que usan 'checkUsage' para permitir acceso anónimo limitado.
// Este middleware verifica si el usuario es anónimo o autenticado y ajusta los límites.
app.use('/api/limen', checkUsage, limenRoutes); 
app.use('/api/creanova', checkUsage, creanovaRoutes); 
app.use('/api/aprende-negocios', checkUsage, aprendeNegociosRoutes);

// Rutas de los sistemas que asumen una autenticación completa (protegidas por el middleware 'protect')
app.use('/api/sigma', sigmaRoutes);
app.use('/api/nexus', nexusRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/engine', engineRoutes);


// 7. Servir archivos estáticos del frontend
// Esto es crucial para que Render sepa dónde encontrar tu aplicación React
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

// Para manejar el enrutamiento de React, cualquier ruta no reconocida por el backend
// se redirige a index.html. Esto evita los errores 404 en el frontend.
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '..', 'frontend', 'dist', 'index.html'));
});

// 8. Manejo de errores (middleware de último recurso)
// Es crucial que este middleware esté después de todas tus rutas
app.use((err, req, res, next) => {
    console.error(err.stack); // Registra el stack trace del error
    // Se envía una respuesta de error en formato JSON al cliente
    res.status(500).json({ message: 'Algo salió mal en el servidor!' });
});

// 9. Iniciar el servidor
const PORT = process.env.PORT || 3001; // Puerto del servidor, usa el de .env o 3001 por defecto

app.listen(PORT, () => {
    console.log(`Servidor de Millennion BDD corriendo en el puerto ${PORT}`);
    console.log(`URL del backend: http://localhost:${PORT}`);
});

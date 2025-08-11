// 1. Importar módulos necesarios
require('dotenv').config(); // Carga las variables de entorno desde .env al inicio
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Importa el módulo CORS

// Importar rutas y middlewares
const userRoutes = require('./routes/Users'); // Rutas para gestión de usuarios (login, register, profile)
const subscriptionRoutes = require('./routes/subscriptionRoutes'); // Rutas de suscripción (PayPal)
const adminRoutes = require('./routes/adminRoutes'); // Rutas de administración (para cron jobs, etc.)

// Importar todas las rutas de los sistemas
const limenRoutes = require('./routes/limenRoutes');
const creanovaRoutes = require('./routes/creanovaRoutes');
// IMPORTACIÓN DEL NUEVO MÓDULO
const aprendeNegociosRoutes = require('./routes/aprendeNegociosRoutes');

const sigmaRoutes = require('./systems/sigma'); // Asumo que estos siguen en systems
const nexusRoutes = require('./systems/nexus');
const financeRoutes = require('./systems/finance');
const engineRoutes = require('./systems/engine');

const { checkUsage } = require('./middleware/usageMiddleware'); // ¡NUEVO! Middleware para verificar uso (anónimo/autenticado)

// 2. Inicializar la aplicación Express
const app = express();

// 3. Configuración de middlewares
// Configuración de CORS: Permite solicitudes solo desde tus frontends
const corsOptions = {
    origin: ['https://millennionbdd.com', 'https://www.millennionbdd.com'], // ¡AQUÍ ESTÁ EL CAMBIO! Ahora acepta ambos dominios.
    optionsSuccessStatus: 200, // Para navegadores antiguos
    exposedHeaders: ['X-Set-Anonymous-ID'] // ¡IMPORTANTE! Exponer este encabezado para que el frontend pueda leerlo
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
app.use('/api/users', userRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/admin', adminRoutes);

// Rutas de los sistemas. Ahora usan 'checkUsage' para permitir acceso anónimo limitado.
// NOTA: Si sigma, nexus, finance, engine también deben permitir uso anónimo,
// necesitarás aplicar 'checkUsage' y adaptar su lógica de límites.
app.use('/api/limen', checkUsage, limenRoutes); // Aplica checkUsage a las rutas de Limen
app.use('/api/creanova', checkUsage, creanovaRoutes); // Aplica checkUsage a las rutas de Creanova
// RUTA DEL NUEVO MÓDULO "APRENDE DE NEGOCIOS"
app.use('/api/aprende-negocios', checkUsage, aprendeNegociosRoutes);


// Asumo que estas rutas siguen requiriendo autenticación completa por ahora
app.use('/api/sigma', sigmaRoutes);
app.use('/api/nexus', nexusRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/engine', engineRoutes);


// Ruta de bienvenida (opcional, para verificar que el servidor está corriendo)
app.get('/', (req, res) => {
    res.send('Servidor de Millennion BDD funcionando. Accede a las rutas de API.');
});

// 7. Manejo de errores (middleware de último recurso)
// Es crucial que este middleware esté después de todas tus rutas
app.use((err, req, res, next) => {
    console.error(err.stack); // Registra el stack trace del error
    // CAMBIO IMPORTANTE: Ahora enviamos un objeto JSON con el error.
    res.status(500).json({ message: 'Algo salió mal en el servidor!' });
});

// 8. Iniciar el servidor
const PORT = process.env.PORT || 3001; // Puerto del servidor, usa el de .env o 3001 por defecto

app.listen(PORT, () => {
    console.log(`Servidor de Millennion BDD corriendo en el puerto ${PORT}`);
    console.log(`URL del backend: http://localhost:${PORT}`);
});

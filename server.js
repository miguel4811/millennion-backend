// millennion/backend/server.js

// 1. Importar módulos necesarios
require('dotenv').config(); // Carga las variables de entorno desde .env al inicio
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Importa el módulo CORS

// Importar rutas
// ¡CORRECCIÓN AQUÍ! Asegúrate de que la 'U' de Users sea mayúscula para coincidir con el nombre del archivo
const userRoutes = require('./routes/Users'); // Rutas para gestión de usuarios (login, register, profile)
const subscriptionRoutes = require('./routes/subscriptionRoutes'); // Rutas de suscripción (PayPal)

// Importar todas las rutas de los sistemas
const limenRoutes = require('./systems/limen');
const creanovaRoutes = require('./systems/creanova');
const sigmaRoutes = require('./systems/sigma');
const nexusRoutes = require('./systems/nexus');
const financeRoutes = require('./systems/finance');
const engineRoutes = require('./systems/engine');

// 2. Inicializar la aplicación Express
const app = express();

// 3. Configuración de middlewares
// Configuración de CORS: Permite solicitudes solo desde tu frontend
const corsOptions = {
    origin: 'https://millennionbdd.com', // ¡AQUÍ SE ESPECIFICA LA URL DE TU FRONTEND!
    optionsSuccessStatus: 200 // Para navegadores antiguos
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
// Las rutas de autenticación y usuario están consolidadas en userRoutes.js
// y este archivo ya maneja qué rutas son públicas y cuáles protegidas.
app.use('/api/users', userRoutes);

// Las rutas de suscripciones también manejan su propia protección internamente
app.use('/api/subscriptions', subscriptionRoutes);

// Rutas de los sistemas. Cada archivo de sistema ya usa 'protect' internamente
// para sus rutas individuales cuando es necesario.
app.use('/api/limen', limenRoutes);
app.use('/api/creanova', creanovaRoutes);
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
    // Puedes personalizar la respuesta de error según el entorno (producción vs desarrollo)
    res.status(500).send('Algo salió mal en el servidor!');
});

// 8. Iniciar el servidor
const PORT = process.env.PORT || 3001; // Puerto del servidor, usa el de .env o 3001 por defecto

app.listen(PORT, () => {
    // ¡CORREGIDO AQUÍ! Se usaban paréntesis normales, ahora son backticks
    console.log(`Servidor de Millennion BDD corriendo en el puerto ${PORT}`);
    console.log(`URL del backend: http://localhost:${PORT}`);
});

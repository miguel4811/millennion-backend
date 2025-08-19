require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const userRoutes = require('./routes/Users');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const adminRoutes = require('./routes/adminRoutes');

const limenRoutes = require('./routes/limenRoutes');
const creanovaRoutes = require('./routes/creanovaRoutes');
const aprendeNegociosRoutes = require('./routes/aprendeNegociosRoutes');

const { checkUsage } = require('./middleware/usageMiddleware');

const app = express();

const corsOptions = {
    origin: ['https://millennionbdd.com', 'https://www.millennionbdd.com'], 
    optionsSuccessStatus: 200,
    exposedHeaders: ['X-Set-Anonymous-ID']
};
app.use(cors(corsOptions));
app.use(express.json());

const mongoUri = process.env.MONGO_URI;

mongoose.connect(mongoUri)
    .then(() => console.log('MongoDB conectado con éxito.'))
    .catch(err => {
        console.error('Error al conectar a MongoDB:', err.message);
        process.exit(1);
    });

app.use('/api/users', userRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api/limen', checkUsage, limenRoutes); 
app.use('/api/creanova', checkUsage, creanovaRoutes); 
app.use('/api/aprende-negocios', checkUsage, aprendeNegociosRoutes);

app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

// Ruta comodín corregida con una expresión regular
// Esto evita el error de "Missing parameter name"
app.get(/.*/, (req, res) => {
    res.sendFile(path.resolve(__dirname, '..', 'frontend', 'dist', 'index.html'));
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Algo salió mal en el servidor!' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Servidor de Millennion BDD corriendo en el puerto ${PORT}`);
    console.log(`URL del backend: http://localhost:${PORT}`);
});

// Importa el módulo 'mongoose' para interactuar con la base de datos de MongoDB.
const mongoose = require('mongoose');

// Esta función asíncrona se encargará de conectar a la base de datos.
const connectDB = async () => {
  try {
    // Intenta conectar a la base de datos usando la URL de conexión.
    // La URL de conexión se obtiene de una variable de entorno llamada MONGO_URI.
    // Asegúrate de tener esta variable definida en un archivo .env
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Estas opciones son para evitar advertencias de mongoose en la consola.
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Si la conexión es exitosa, muestra un mensaje de confirmación.
    console.log(`MongoDB Conectado: ${conn.connection.host}`);
  } catch (error) {
    // Si hay un error en la conexión, muestra el error y termina el proceso de la aplicación.
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Exporta la función para que pueda ser importada en otros archivos, como server.js.
module.exports = connectDB;

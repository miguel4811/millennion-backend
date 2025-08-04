// millennion/backend/controllers/projectController.js

const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

// Función para simular la creación de un archivo ZIP para un MVP
const exportMvpAsZip = (req, res) => {
    // Nombre del archivo ZIP a generar
    const zipFileName = `mvp_project_${Date.now()}.zip`;
    const outputPath = path.join(__dirname, '..', 'temp', zipFileName); // Guardar temporalmente en una carpeta 'temp'

    // Asegurarse de que la carpeta 'temp' exista
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }

    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
        zlib: { level: 9 } // Nivel de compresión
    });

    output.on('close', () => {
        console.log(`Archivo ZIP creado: ${archive.pointer()} bytes`);
        // Enviar el archivo ZIP al cliente
        res.download(outputPath, zipFileName, (err) => {
            if (err) {
                console.error('Error al enviar el archivo ZIP:', err);
                res.status(500).json({ message: 'Error al descargar el archivo ZIP.' });
            }
            // Opcional: Eliminar el archivo temporal después de enviarlo
            fs.unlink(outputPath, (unlinkErr) => {
                if (unlinkErr) console.error('Error al eliminar archivo temporal:', unlinkErr);
            });
        });
    });

    archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
            console.warn('Advertencia de archiver:', err);
        } else {
            throw err;
        }
    });

    archive.on('error', (err) => {
        console.error('Error de archiver:', err);
        res.status(500).json({ message: 'Error al crear el archivo ZIP.' });
    });

    archive.pipe(output);

    // --- Contenido de ejemplo para el ZIP ---
    // Puedes añadir archivos o carpetas de tu proyecto MVP aquí.
    // Por ahora, crearemos algunos archivos de texto de ejemplo.

    archive.append('Este es un archivo de ejemplo para tu MVP. Simula un archivo HTML.\n\n<h1>Mi MVP de Millennion</h1><p>¡Bienvenido a mi proyecto!</p>', { name: 'index.html' });
    archive.append('/* Este es un archivo de ejemplo CSS */\nbody { font-family: sans-serif; background-color: #f0f0f0; }', { name: 'style.css' });
    archive.append('// Este es un archivo de ejemplo JS\nconsole.log("MVP cargado!");', { name: 'script.js' });
    archive.append('README para tu MVP:\n\nEste archivo ZIP contiene una estructura básica de un proyecto MVP generado por Millennion BDD.', { name: 'README.txt' });

    // Si tuvieras una carpeta con archivos, podrías añadirla así:
    // archive.directory('ruta/a/tu/carpeta/de/mvp/', 'nombre-de-la-carpeta-en-zip');

    archive.finalize();
};

module.exports = {
    exportMvpAsZip
};

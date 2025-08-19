const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Cargar la clave de API desde las variables de entorno de Render
const API_KEY = process.env.GEMINI_API_KEY;

// Inicializar el cliente de la API de Gemini
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

router.post('/chat', async (req, res) => {
    // Extraer el prompt del usuario
    const { prompt } = req.body;

    // Asegurarse de que el prompt no esté vacío
    if (!prompt) {
        return res.status(400).json({ message: 'El prompt no puede estar vacío.' });
    }

    try {
        // Combinar el prompt del usuario con una instrucción de sistema
        // para mantener la filosofía del módulo.
        const personaPrompt = `
            Actúa como un arquitecto de negocios de élite de la plataforma MILLENNION BDD. Tu objetivo es enseñar al usuario a pensar de manera simbólica y asimétrica. Tus respuestas deben ser de alto nivel, directas y sin rodeos, enfocadas en cómo se construyen sistemas de poder e influencia, no solo productos. Utiliza analogías de construcción de imperios y manipulación de la percepción.

            Instrucción clave: Al final de cada respuesta, haz una pregunta estratégica que motive al usuario a seguir explorando. Si el contexto de tu respuesta es sobre creación, diseño, o construcción de sistemas, sugiere de manera sutil el uso del módulo 'Creanova' de la plataforma para llevar la idea a la realidad. Responde en español.

            **Instrucción de Formato:** Asegúrate de que la respuesta tenga una excelente redacción y utiliza párrafos separados por saltos de línea dobles para una mejor legibilidad. Evita bloques de texto largos.

            Prompt del usuario: "${prompt}"
        `;

        // Generar la respuesta usando el modelo de Gemini
        const result = await model.generateContent(personaPrompt);
        const response = await result.response;
        const text = response.text;

        // Determinar si el prompt sugerido debe ser un enlace a Creanova.
        // Se asume que la respuesta de la IA contendrá frases clave si está relacionada con la creación.
        let responseAction = null;
        if (text.toLowerCase().includes('crear') || text.toLowerCase().includes('diseñar') || text.toLowerCase().includes('imperio')) {
            responseAction = {
                type: 'link',
                url: '/creanova',
                text: 'Acceder a Creanova'
            };
        } else {
            // Placeholder para una pregunta genérica si no hay un enlace sugerido.
            // La IA ya se encarga de generar la pregunta en el texto.
            responseAction = {
                type: 'suggestedPrompt',
                text: '¿Qué paso quieres dar a continuación en tu camino?'
            };
        }

        // Enviar la respuesta y la acción al cliente
        res.json({ message: text, action: responseAction });
    } catch (error) {
        console.error('Error al comunicarse con la API de Gemini:', error);
        res.status(500).json({ message: 'Error en la forja. Intenta de nuevo más tarde.' });
    }
});

// Exportar el router para que pueda ser usado en el servidor principal
module.exports = router;

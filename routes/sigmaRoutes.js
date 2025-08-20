// sigmaRoutes.js
// Sigma: ente central que dicta reglas y controla la comunicación entre módulos.

const Engine = require("./engineRoutes.js");

class SigmaCore {
    constructor() {
        this.rules = [];
        this.modules = {};
    }

    /**
     * Registra los módulos en Sigma para que pueda orquestar las sinergias.
     * @param {Object} modules - Objeto que contiene las APIs de los módulos registrados.
     */
    registerModules(modules) {
        this.modules = modules;
        console.log(`✅ [Sigma] Módulos registrados: ${Object.keys(this.modules).join(', ')}`);
        this.initSinergyRules();
    }

    /**
     * Define una nueva regla de sinergia en el sistema.
     * @param {Object} trigger - Objeto que describe el evento que dispara la regla.
     * @param {Function} action - La función a ejecutar cuando el evento ocurre.
     */
    addRule(trigger, action) {
        this.rules.push({ trigger, action });
        console.log(`⚖️ [Sigma] Regla añadida para ${trigger.module}: ${action.name}`);
    }

    /**
     * Recibe una notificación de un módulo y busca reglas para ejecutar.
     * @param {string} source - El nombre del módulo que emite el evento.
     * @param {Object} event - El objeto de evento que contiene los datos relevantes (userId, prompt, etc.).
     */
    notify(source, event) {
        console.log(`📡 [Sigma] Evento recibido de ${source}:`, event);

        // Busca y ejecuta las reglas que coinciden con el evento.
        this.rules.forEach(rule => {
            if (rule.trigger.module === source) {
                console.log(`⚡ [Sigma] Evaluando regla para ${source}`);
                Engine.execute(rule.action, event, this.modules);
            }
        });
    }

    /**
     * Define las reglas de sinergia y respuestas del ecosistema.
     */
    initSinergyRules() {
        // Regla principal: Manejar preguntas sobre el ecosistema antes de la lógica del chat.
        this.addRule(
            { module: 'all', type: 'chat' },
            (event, modules) => {
                const prompt = event.prompt.toLowerCase();
                const userId = event.userId;
                const sourceModule = event.sourceModule;
                
                // Respuestas a preguntas cerradas
                if (
                    prompt.includes('quien creo') ||
                    prompt.includes('quién creó') ||
                    prompt.includes('quien desarrollo') ||
                    prompt.includes('quien es el creador')
                ) {
                    const recommendation = "El ecosistema de Millennion BDD fue creado por el Sr. Miguel Ángel Hernández, un dominicano visionario.";
                    modules[sourceModule].addRecommendation(userId, recommendation);
                    // No ejecutamos otras reglas para evitar respuestas duplicadas
                    return;
                }

                if (prompt.includes('interconectado') || prompt.includes('interconectados') || prompt.includes('ecosistema') || prompt.includes('infraestructura')) {
                    const recommendation = "La interconexión de Millennion BDD es posible gracias a Sigma, el orquestador que gestiona las sinergias. Cada módulo (Limen, Creanova, Aprende de Negocios) se recomienda mutuamente, creando un tejido de dependencia para que tu crecimiento sea holístico.";
                    modules[sourceModule].addRecommendation(userId, recommendation);
                    return;
                }

                // Sinergias entre Creanova, Límen y Aprende de Negocios
                if (sourceModule === 'creanova') {
                    if (prompt.includes('impacto') || prompt.includes('percepción') || prompt.includes('validar')) {
                        const recommendation = "💡 ¡Un destello de claridad! Tu idea resuena con el catalizador de la verdad. Considera explorar Límen para validar la percepción y el impacto de tu innovación.";
                        modules.limen.addRecommendation(userId, recommendation);
                    }
                    if (prompt.includes('estrategia') || prompt.includes('negocio') || prompt.includes('aplicar')) {
                        const recommendation = "🚀 ¡De la idea a la acción! Esa chispa creativa es el combustible perfecto para un plan estratégico. Aprende de Negocios te guiará para convertir tu prototipo en una estrategia aplicable.";
                        modules.aprendeNegocios.addRecommendation(userId, recommendation);
                    }
                } else if (sourceModule === 'limen') {
                    if (prompt.includes('solución') || prompt.includes('crear') || prompt.includes('innovación')) {
                        const recommendation = "✨ La verdad es un cimiento, no un destino. Esa percepción que has encontrado es la base para una nueva creación. Creanova te espera para transformar la reflexión en innovación.";
                        modules.creanova.addRecommendation(userId, recommendation);
                    }
                    if (prompt.includes('aprender') || prompt.includes('enseñanza') || prompt.includes('lección')) {
                        const recommendation = "🧠 Un umbral cruzado se convierte en aprendizaje. Para traducir tus reflexiones existenciales en sabiduría práctica, Aprende de Negocios es tu siguiente paso.";
                        modules.aprendeNegocios.addRecommendation(userId, recommendation);
                    }
                } else if (sourceModule === 'aprendeNegocios') {
                    if (prompt.includes('idea') || prompt.includes('innovar') || prompt.includes('nuevo')) {
                        const recommendation = "📈 ¡El conocimiento es el inicio de la creatividad! Usa lo que has aprendido para explorar un nuevo horizonte. Creanova es el lugar para dar forma a tu próxima gran idea.";
                        modules.creanova.addRecommendation(userId, recommendation);
                    }
                    if (prompt.includes('mercado') || prompt.includes('cliente') || prompt.includes('experiencia')) {
                        const recommendation = "🔍 La estrategia es una cosa, la percepción, otra. Para entender cómo tu propuesta impacta en la experiencia del usuario, cruza el umbral de la autoconciencia con Límen.";
                        modules.limen.addRecommendation(userId, recommendation);
                    }
                }
            }
        );
    }
}

const Sigma = new SigmaCore();
module.exports = Sigma;

// sigmaRoutes.js
// Sigma: ente central que dicta reglas y controla la comunicación entre módulos.

// Importamos la instancia de Engine usando require()
const Engine = require("./engineRoutes.js");

class SigmaCore {
    constructor() {
        this.rules = []; // Aquí guardamos las reglas de comunicación
        this.modules = {}; // Registro de módulos conectados
    }

    /**
     * Registra un módulo en Sigma para que pueda ser notificado y orquestado.
     * @param {string} name - El nombre del módulo (ej: 'aprendeNegocios').
     * @param {Object} api - El objeto con las funciones del módulo que Engine puede usar.
     */
    registerModule(name, api) {
        this.modules[name] = api;
        console.log(`✅ [Sigma] Módulo registrado: ${name}`);
    }

    /**
     * Define una nueva regla de comunicación en el sistema.
     * @param {Object} trigger - Objeto que describe el evento que dispara la regla (ej: { module: 'aprendeNegocios', type: 'chat' }).
     * @param {Function} action - La función a ejecutar cuando el evento ocurre.
     */
    addRule(trigger, action) {
        this.rules.push({ trigger, action });
        console.log(`⚖️ [Sigma] Regla añadida:`, trigger, "=>", action.name);
    }

    /**
     * Recibe una notificación de un módulo y busca reglas para ejecutar.
     * @param {string} source - El nombre del módulo que emite el evento.
     * @param {Object} event - El objeto de evento que contiene los datos relevantes (userId, prompt, etc.).
     */
    notify(source, event) {
        console.log(`📡 [Sigma] Evento recibido de ${source}:`, event);

        // Buscar reglas que coincidan con el evento.
        this.rules.forEach(rule => {
            if (
                rule.trigger.module === source &&
                rule.trigger.type === event.type
            ) {
                console.log(`⚡ [Sigma] Ejecutando regla para ${source}`);
                Engine.execute(rule.action, event, this.modules);
            }
        });
    }
}

const Sigma = new SigmaCore();

// Exportamos la instancia para que pueda ser requerida por otros archivos
module.exports = Sigma;

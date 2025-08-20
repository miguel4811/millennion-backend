// engineRoutes.js
// Engine: ejecutor técnico de las órdenes de Sigma.

class EngineCore {
    /**
     * Ejecuta una acción definida en Sigma.
     * @param {Function} action - La función de acción a ejecutar.
     * @param {Object} event - El objeto de evento que contiene los datos relevantes.
     * @param {Object} modules - Objeto que contiene las APIs de los módulos registrados.
     */
    async execute(action, event, modules) {
        console.log(`🔧 [Engine] Ejecutando acción: ${action.name}`);
        try {
            await action(event, modules);
        } catch (error) {
            console.error("❌ [Engine] Error al ejecutar acción:", error);
        }
    }

    /**
     * Entrega una recomendación a un módulo de destino.
     * Esta función es el "puente" que Sigma llama para que Engine la ejecute.
     * @param {Object} data - Objeto que contiene los detalles de la recomendación.
     * @param {string} data.targetModule - El nombre del módulo al que se enviará la recomendación.
     * @param {Object} data.recommendation - El contenido de la recomendación.
     * @param {string} data.userId - El ID del usuario.
     * @param {Object} modules - Objeto que contiene las APIs de los módulos.
     */
    async deliverRecommendation(data, modules) {
        const { targetModule, recommendation, userId } = data;
        
        const targetApi = modules[targetModule];
        if (!targetApi || typeof targetApi.addRecommendation !== 'function') {
            console.error(`❌ [Engine] Módulo de destino '${targetModule}' no encontrado o no tiene un método 'addRecommendation'.`);
            return;
        }

        targetApi.addRecommendation(userId, recommendation);
        console.log(`📬 [Engine] Recomendación entregada a '${targetModule}' para el usuario '${userId}'.`);
    }
}

const Engine = new EngineCore();
export default Engine;

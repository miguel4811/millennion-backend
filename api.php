<?php
// PHP Script para devolver una respuesta JSON.
// Esto funciona en tu plan de hosting sin necesidad de instalar nada.

// Asegúrate de que el navegador sepa que estamos enviando JSON.
header('Content-Type: application/json');

// Crea el array de datos que queremos enviar.
$data = [
    'message' => '¡Hola desde el backend de PHP!',
    'timestamp' => date('c')
];

// Convierte el array a formato JSON y lo imprime.
echo json_encode($data);
?>

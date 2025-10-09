const { callDecisionEngine } = require('../dist/services/callDecisionEngine');

/**
 * Test específico para validar la clasificación correcta de "Cambio fecha de efecto"
 * 
 * CASO PROBLEMA:
 * - Cliente dice: "quería cambiar la fecha a la que entra en vigor el seguro que he contratado"
 * - Agente responde: "entiendo que quieres cambiar la fecha de efecto de tu póliza"
 * - Cliente especifica: "para el 1 de noviembre"
 * - Agente: "he tomado nota de la nueva fecha... Un compañero revisará tu solicitud"
 * 
 * RESULTADO ESPERADO: "Modificación póliza emitida" + "Cambio fecha de efecto"
 * RESULTADO ACTUAL: "Llamada gestión comercial" + "LLam gestión comerc"
 */

async function testCambioFechaEfecto() {
  console.log('🧪 INICIANDO TEST: Cambio fecha de efecto');
  console.log('=' .repeat(60));

  const transcripts = [
    {
      conversation_id: 'test-cambio-fecha-efecto',
      speaker: 'agent',
      message: 'Hola soy Carlos, su agente virtual en la Correduría de Seguros Nogal, dígame por favor su nombre y apellido y si es usted un cliente, dígame por favor su DNI.',
      timestamp: new Date().toISOString(),
      tool_results: []
    },
    {
      conversation_id: 'test-cambio-fecha-efecto',
      speaker: 'user',
      message: 'Hola, buenas. Mideleyes 29, 75, 58, 72, Jota.',
      timestamp: new Date().toISOString(),
      tool_results: []
    },
    {
      conversation_id: 'test-cambio-fecha-efecto',
      speaker: 'agent',
      message: 'Perfecto, dame un momento que te encuentre...',
      timestamp: new Date().toISOString(),
      tool_results: []
    },
    {
      conversation_id: 'test-cambio-fecha-efecto',
      speaker: 'agent',
      message: '[Tool Call: identificar_cliente]',
      timestamp: new Date().toISOString(),
      tool_results: []
    },
    {
      conversation_id: 'test-cambio-fecha-efecto',
      speaker: 'agent',
      message: '[Tool Result: identificar_cliente]',
      timestamp: new Date().toISOString(),
      tool_results: [
        {
          tool_name: 'identificar_cliente',
          result_value: JSON.stringify({
            status: 'success',
            message: 'Cliente encontrado exitosamente',
            data: {
              clientes: [{
                campaña: '',
                codigo_cliente: '29755872F00',
                email_cliente: 'manuel@email.com',
                nif_cliente: '29755872J',
                nombre_cliente: 'MANUEL GARCIA LOPEZ',
                telefono_1: '666777888',
                telefono_2: '',
                telefono_3: ''
              }],
              detalle_polizas: [{
                codigo_cliente: '29755872F00',
                matricula: 'ABC1234',
                modelo: 'FOCUS',
                poliza: 'AU0420245310016',
                ramo: 'Coche'
              }],
              vtos_polizas: [{
                codigo_cliente: '29755872F00',
                compañia: 'REALE',
                estado: 'Contratada',
                fecha_efecto: '15.10.24',
                importe_poliza: '245,50',
                mes_vencimiento: 'Octubre',
                poliza: 'AU0420245310016',
                'poliza/suplemento': 'Póliza',
                ramo: 'Coche',
                reemplaza_a: ''
              }]
            }
          }),
          is_error: false
        }
      ]
    },
    {
      conversation_id: 'test-cambio-fecha-efecto',
      speaker: 'user',
      message: 'Buenos días. Buenos días. Buenos días.',
      timestamp: new Date().toISOString(),
      tool_results: []
    },
    {
      conversation_id: 'test-cambio-fecha-efecto',
      speaker: 'agent',
      message: 'Buenos días, Manuel... veo que tienes contratada con nosotros una póliza de coche... ¿Quieres que te ayude con alguna gestión de esta póliza o se trata de una nueva contratación?',
      timestamp: new Date().toISOString(),
      tool_results: []
    },
    {
      conversation_id: 'test-cambio-fecha-efecto',
      speaker: 'user',
      message: 'Bueno, en este caso quería cambiar la fecha a la que entra en vigor el seguro que he contratado. No sé si me puedes ayudar con eso.',
      timestamp: new Date().toISOString(),
      tool_results: []
    },
    {
      conversation_id: 'test-cambio-fecha-efecto',
      speaker: 'agent',
      message: 'Claro, Manuel... entiendo que quieres cambiar la fecha de efecto de tu póliza... Para poder gestionarlo, necesito que me digas cuál es la nueva fecha que deseas.',
      timestamp: new Date().toISOString(),
      tool_results: []
    },
    {
      conversation_id: 'test-cambio-fecha-efecto',
      speaker: 'user',
      message: 'Pues sería para el 1 de noviembre.',
      timestamp: new Date().toISOString(),
      tool_results: []
    },
    {
      conversation_id: 'test-cambio-fecha-efecto',
      speaker: 'agent',
      message: 'Perfecto, Manuel... he tomado nota de la nueva fecha... Un compañero revisará tu solicitud y se pondrá en contacto contigo para confirmar la gestión.',
      timestamp: new Date().toISOString(),
      tool_results: []
    }
  ];

  try {
    console.log('📋 Conversación de prueba:');
    console.log('- Cliente: "quería cambiar la fecha a la que entra en vigor el seguro"');
    console.log('- Agente: "entiendo que quieres cambiar la fecha de efecto de tu póliza"');
    console.log('- Cliente: "para el 1 de noviembre"');
    console.log('- Agente: "he tomado nota... Un compañero revisará tu solicitud"');
    console.log('');

    console.log('🧠 Analizando con CallDecisionEngine...');
    const decision = await callDecisionEngine.analyzeCall(transcripts, 'test-cambio-fecha-efecto');

    console.log('');
    console.log('📊 RESULTADO DEL ANÁLISIS:');
    console.log('=' .repeat(40));
    console.log(`Tipo: ${decision.incidentAnalysis.primaryIncident.type}`);
    console.log(`Motivo: ${decision.incidentAnalysis.primaryIncident.reason}`);
    console.log(`Confianza: ${decision.incidentAnalysis.primaryIncident.confidence}`);
    console.log(`Descripción: ${decision.incidentAnalysis.primaryIncident.description}`);
    console.log('');

    // VALIDACIÓN
    const esCorrectoTipo = decision.incidentAnalysis.primaryIncident.type === 'Modificación póliza emitida';
    const esCorrectoMotivo = decision.incidentAnalysis.primaryIncident.reason === 'Cambio fecha de efecto';

    console.log('✅ VALIDACIÓN:');
    console.log(`- Tipo correcto (Modificación póliza emitida): ${esCorrectoTipo ? '✅ SÍ' : '❌ NO'}`);
    console.log(`- Motivo correcto (Cambio fecha de efecto): ${esCorrectoMotivo ? '✅ SÍ' : '❌ NO'}`);
    console.log('');

    if (esCorrectoTipo && esCorrectoMotivo) {
      console.log('🎉 TEST EXITOSO: La clasificación es correcta');
      console.log('');
      console.log('📝 DATOS EXTRAÍDOS:');
      console.log(`- Cliente: ${decision.clientInfo.extractedData.nombreCompleto || 'No extraído'}`);
      console.log(`- DNI: ${decision.clientInfo.extractedData.codigoCliente || 'No extraído'}`);
      console.log(`- Póliza: ${decision.clientInfo.extractedData.numeroPoliza || 'No extraída'}`);
      console.log(`- Nueva fecha: ${decision.clientInfo.extractedData.fechaEfecto || 'No extraída'}`);
    } else {
      console.log('❌ TEST FALLIDO: La clasificación es incorrecta');
      console.log('');
      console.log('🔍 ANÁLISIS DEL PROBLEMA:');
      
      if (!esCorrectoTipo) {
        console.log(`- Se clasificó como "${decision.incidentAnalysis.primaryIncident.type}" en lugar de "Modificación póliza emitida"`);
        
        if (decision.incidentAnalysis.primaryIncident.type === 'Llamada gestión comercial') {
          console.log('- CAUSA PROBABLE: El agente dice "Un compañero revisará" → se interpreta como transferencia');
          console.log('- SOLUCIÓN: Mejorar la detección para priorizar la solicitud específica del cliente');
        }
      }
      
      if (!esCorrectoMotivo) {
        console.log(`- Se clasificó como "${decision.incidentAnalysis.primaryIncident.reason}" en lugar de "Cambio fecha de efecto"`);
        
        if (decision.incidentAnalysis.primaryIncident.reason === 'LLam gestión comerc') {
          console.log('- CAUSA PROBABLE: No se detectaron las frases específicas de cambio de fecha');
          console.log('- FRASES CLAVE NO DETECTADAS: "cambiar la fecha", "entra en vigor", "fecha de efecto"');
        }
      }
      
      console.log('');
      console.log('📋 RECOMENDACIONES:');
      console.log('1. Ampliar las frases de detección para "cambio fecha de efecto"');
      console.log('2. Priorizar la solicitud específica sobre la respuesta del agente');
      console.log('3. Mejorar la detección de fechas específicas (ej: "1 de noviembre")');
    }

    console.log('');
    console.log('📄 NARRATIVA GENERADA:');
    console.log(decision.metadata.processingRecommendation);

    return {
      success: esCorrectoTipo && esCorrectoMotivo,
      decision,
      expectedType: 'Modificación póliza emitida',
      expectedReason: 'Cambio fecha de efecto',
      actualType: decision.incidentAnalysis.primaryIncident.type,
      actualReason: decision.incidentAnalysis.primaryIncident.reason
    };

  } catch (error) {
    console.error('❌ ERROR EN TEST:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Ejecutar el test si se llama directamente
if (require.main === module) {
  testCambioFechaEfecto()
    .then(result => {
      console.log('');
      console.log('🏁 TEST COMPLETADO');
      console.log('=' .repeat(60));
      
      if (result.success) {
        console.log('✅ RESULTADO: EXITOSO');
        process.exit(0);
      } else {
        console.log('❌ RESULTADO: FALLIDO');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 ERROR FATAL:', error);
      process.exit(1);
    });
}

module.exports = { testCambioFechaEfecto };

const { nogalAnalysisService } = require('../dist/services/nogalAnalysisService.js');

// 🧪 CASOS DE PRUEBA ESPECÍFICOS PARA MÚLTIPLES TICKETS
const casosCriticos = {
  // CASO CRÍTICO 1: Fraccionamiento corregido
  fraccionamiento_anual_mensual: {
    name: "CRÍTICO: Fraccionamiento anual → mensual",
    transcript: [
      {
        role: 'agent',
        message: 'Hola soy Carlos, su agente virtual en la Correduría de Seguros Nogal, ¿en qué puedo ayudarle?'
      },
      {
        role: 'user',
        message: 'Hola, tengo una póliza que pago anualmente y me gustaría cambiar a pago mensual'
      },
      {
        role: 'agent',
        message: 'Perfecto, puedo ayudarle con el fraccionamiento de su póliza. Su póliza actual es de pago anual y quiere cambiar a mensual, ¿correcto?'
      },
      {
        role: 'user',
        message: 'Exacto, es más cómodo para mí pagar mensualmente'
      },
      {
        role: 'agent',
        message: 'Entendido, procederemos con el cambio de forma de pago de anual a mensual'
      }
    ],
    expected: {
      tipo: "Llamada gestión comercial",
      motivo: "Cambio forma de pago",
      multipleGestiones: false
    }
  },

  // CASO CRÍTICO 2: Múltiples gestiones
  multiples_gestiones_cuenta_duplicado: {
    name: "CRÍTICO: Múltiples gestiones - Cuenta + Duplicado",
    transcript: [
      {
        role: 'agent',
        message: 'Hola soy Carlos, ¿en qué puedo ayudarle?'
      },
      {
        role: 'user',
        message: 'Hola, quiero cambiar mi cuenta bancaria Y también necesito el duplicado de la póliza por email'
      },
      {
        role: 'agent',
        message: 'Perfecto, registro el cambio de cuenta bancaria y le envío el duplicado por email'
      }
    ],
    expected: {
      multipleGestiones: true,
      totalGestiones: 2,
      incidenciaPrincipal: {
        tipo: "Modificación póliza emitida",
        motivo: "Cambio nº de cuenta"
      },
      incidenciasSecundarias: [
        {
          tipo: "Solicitud duplicado póliza",
          motivo: "Email"
        }
      ]
    }
  },

  // CASO CRÍTICO 3: Rechazo IA anula múltiples gestiones
  rechazo_ia_anula_multiples: {
    name: "CRÍTICO: Rechazo IA anula múltiples gestiones",
    transcript: [
      {
        role: 'agent',
        message: 'Hola soy Carlos, su agente virtual'
      },
      {
        role: 'user',
        message: 'No quiero hablar con una máquina, quiero cambiar mi cuenta Y también el duplicado por email'
      },
      {
        role: 'agent',
        message: 'Claro, le paso con uno de nuestros compañeros'
      }
    ],
    expected: {
      tipo: "Llamada gestión comercial",
      motivo: "Reenvío agentes humanos no quiere IA",
      multipleGestiones: false
    }
  },

  // CASO CRÍTICO 4: Pago recibo
  pago_recibo_transferencia: {
    name: "CRÍTICO: Pago recibo → Transferencia",
    transcript: [
      {
        role: 'agent',
        message: 'Hola soy Carlos, ¿en qué puedo ayudarle?'
      },
      {
        role: 'user',
        message: 'Quiero pagar un recibo que tengo pendiente'
      },
      {
        role: 'agent',
        message: 'Le transfiero con atención al cliente para gestionar el pago'
      }
    ],
    expected: {
      tipo: "Llamada gestión comercial",
      motivo: "Reenvío agentes humanos",
      multipleGestiones: false
    }
  },

  // CASO CRÍTICO 5: Cambio pago no anual
  cambio_pago_no_anual: {
    name: "CRÍTICO: Cambio pago no anual (trimestral → semestral)",
    transcript: [
      {
        role: 'agent',
        message: 'Hola soy Carlos, ¿en qué puedo ayudarle?'
      },
      {
        role: 'user',
        message: 'Tengo pago trimestral y quiero cambiar a semestral'
      },
      {
        role: 'agent',
        message: 'Perfecto, registro el cambio de periodicidad de trimestral a semestral'
      }
    ],
    expected: {
      tipo: "Modificación póliza emitida",
      motivo: "Cambio forma de pago",
      multipleGestiones: false
    }
  }
};

// 🧪 FUNCIÓN PRINCIPAL DE TESTING
async function testMultiplesTickets() {
  console.log('🧪 ===============================================');
  console.log('🎯 TESTING REAL: MÚLTIPLES TICKETS');
  console.log('🧪 ===============================================\n');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const [testKey, testCase] of Object.entries(casosCriticos)) {
    totalTests++;
    console.log(`🔥 TEST ${totalTests}: ${testCase.name}`);
    console.log(`🔍 Caso: ${testKey}`);
    
    try {
      // Ejecutar análisis
      const result = await nogalAnalysisService.analyzeCallForNogal(
        testCase.transcript,
        `test-${testKey}`
      );

      console.log('\n📊 RESULTADO OBTENIDO:');
      console.log(`   Tipo: ${result.incidenciaPrincipal.tipo}`);
      console.log(`   Motivo: ${result.incidenciaPrincipal.motivo}`);
      console.log(`   Múltiples gestiones: ${result.multipleGestiones || false}`);
      console.log(`   Total gestiones: ${result.totalGestiones || 1}`);
      
      if (result.incidenciasSecundarias?.length > 0) {
        console.log('   Incidencias secundarias:');
        result.incidenciasSecundarias.forEach((inc, i) => {
          console.log(`     ${i+1}. ${inc.tipo} - ${inc.motivo}`);
        });
      }

      // Validar resultados
      const validation = validateResult(result, testCase.expected);
      
      if (validation.success) {
        console.log(`✅ PASSED: ${validation.message}`);
        passedTests++;
      } else {
        console.log(`❌ FAILED: ${validation.message}`);
        failedTests++;
      }
      
    } catch (error) {
      console.log(`💥 ERROR: ${error.message}`);
      failedTests++;
    }
    
    console.log(''); // Línea en blanco
  }

  // Resumen final
  console.log('🧪 ===============================================');
  console.log('📊 RESUMEN FINAL');
  console.log('🧪 ===============================================');
  console.log(`📈 Total tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📊 Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (failedTests === 0) {
    console.log('🎉 ¡TODOS LOS TESTS CRÍTICOS PASARON!');
    console.log('✅ La funcionalidad de múltiples tickets está funcionando correctamente');
  } else {
    console.log(`⚠️  ${failedTests} tests fallaron. Revisar implementación.`);
  }

  return {
    totalTests,
    passedTests,
    failedTests,
    successRate: (passedTests / totalTests) * 100
  };
}

// 🔍 FUNCIÓN DE VALIDACIÓN
function validateResult(result, expected) {
  // Validar casos simples
  if (expected.tipo && result.incidenciaPrincipal.tipo !== expected.tipo) {
    return {
      success: false,
      message: `Tipo esperado: ${expected.tipo}, obtenido: ${result.incidenciaPrincipal.tipo}`
    };
  }

  if (expected.motivo && result.incidenciaPrincipal.motivo !== expected.motivo) {
    return {
      success: false,
      message: `Motivo esperado: ${expected.motivo}, obtenido: ${result.incidenciaPrincipal.motivo}`
    };
  }

  // Validar múltiples gestiones
  if (expected.multipleGestiones !== undefined && result.multipleGestiones !== expected.multipleGestiones) {
    return {
      success: false,
      message: `multipleGestiones esperado: ${expected.multipleGestiones}, obtenido: ${result.multipleGestiones}`
    };
  }

  if (expected.totalGestiones && result.totalGestiones !== expected.totalGestiones) {
    return {
      success: false,
      message: `totalGestiones esperado: ${expected.totalGestiones}, obtenido: ${result.totalGestiones}`
    };
  }

  // Validar incidencia principal en casos múltiples
  if (expected.incidenciaPrincipal) {
    if (result.incidenciaPrincipal.tipo !== expected.incidenciaPrincipal.tipo) {
      return {
        success: false,
        message: `Tipo principal esperado: ${expected.incidenciaPrincipal.tipo}, obtenido: ${result.incidenciaPrincipal.tipo}`
      };
    }

    if (result.incidenciaPrincipal.motivo !== expected.incidenciaPrincipal.motivo) {
      return {
        success: false,
        message: `Motivo principal esperado: ${expected.incidenciaPrincipal.motivo}, obtenido: ${result.incidenciaPrincipal.motivo}`
      };
    }
  }

  // Validar incidencias secundarias
  if (expected.incidenciasSecundarias) {
    if (!result.incidenciasSecundarias || result.incidenciasSecundarias.length !== expected.incidenciasSecundarias.length) {
      return {
        success: false,
        message: `Número de incidencias secundarias esperado: ${expected.incidenciasSecundarias.length}, obtenido: ${result.incidenciasSecundarias?.length || 0}`
      };
    }

    for (let i = 0; i < expected.incidenciasSecundarias.length; i++) {
      const expectedSecondary = expected.incidenciasSecundarias[i];
      const resultSecondary = result.incidenciasSecundarias[i];

      if (resultSecondary.tipo !== expectedSecondary.tipo) {
        return {
          success: false,
          message: `Tipo secundario ${i + 1} esperado: ${expectedSecondary.tipo}, obtenido: ${resultSecondary.tipo}`
        };
      }

      if (resultSecondary.motivo !== expectedSecondary.motivo) {
        return {
          success: false,
          message: `Motivo secundario ${i + 1} esperado: ${expectedSecondary.motivo}, obtenido: ${resultSecondary.motivo}`
        };
      }
    }
  }

  return {
    success: true,
    message: 'Todas las validaciones pasaron correctamente'
  };
}

// 🚀 EJECUTAR TESTS
testMultiplesTickets().catch(console.error);

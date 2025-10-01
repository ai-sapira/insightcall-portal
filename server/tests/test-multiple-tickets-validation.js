#!/usr/bin/env node

/**
 * 🧪 TEST COMPLETO: VALIDACIÓN DE MÚLTIPLES TICKETS
 * 
 * Este test valida exhaustivamente la nueva funcionalidad de múltiples tickets
 * implementada en nogalAnalysisService.ts
 */

import { nogalAnalysisService } from '../src/services/nogalAnalysisService.js';

// 🎯 CASOS DE PRUEBA PARA MÚLTIPLES TICKETS
const testCases = {
  
  // ===== GRUPO 1: MÚLTIPLES GESTIONES BÁSICAS =====
  dos_gestiones_independientes: {
    name: "Dos gestiones independientes - Cambio cuenta + Duplicado",
    transcript: [
      { role: 'user', message: 'Hola, quiero cambiar mi cuenta bancaria Y también necesito el duplicado de la póliza por email' },
      { role: 'agent', message: 'Perfecto, registro el cambio de cuenta y le envío el duplicado por email' }
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

  tres_gestiones_diferentes: {
    name: "Tres gestiones diferentes - Nueva contratación + Modificación + Duplicado",
    transcript: [
      { role: 'user', message: 'Quiero contratar un seguro de vida, Y también cambiar la dirección del coche, Y además necesito el duplicado del hogar por email' },
      { role: 'agent', message: 'Le ayudo con las tres gestiones' }
    ],
    expected: {
      multipleGestiones: true,
      totalGestiones: 3,
      incidenciaPrincipal: { 
        tipo: "Nueva contratación de seguros", 
        motivo: "Contratación Póliza",
        ramo: "VIDA"
      },
      incidenciasSecundarias: [
        { 
          tipo: "Modificación póliza emitida", 
          motivo: "Cambio dirección postal" 
        },
        { 
          tipo: "Solicitud duplicado póliza", 
          motivo: "Email" 
        }
      ]
    }
  },

  multiples_modificaciones_misma_poliza: {
    name: "Múltiples modificaciones en la misma póliza",
    transcript: [
      { role: 'user', message: 'En mi póliza del hogar quiero añadir a mi hijo Y también cambiar la cuenta bancaria' },
      { role: 'agent', message: 'Registro ambas modificaciones en su póliza del hogar' }
    ],
    expected: {
      multipleGestiones: true,
      totalGestiones: 2,
      incidenciaPrincipal: { 
        tipo: "Modificación póliza emitida", 
        motivo: "Modificación nº asegurados" 
      },
      incidenciasSecundarias: [
        { 
          tipo: "Modificación póliza emitida", 
          motivo: "Cambio nº de cuenta" 
        }
      ]
    }
  },

  // ===== GRUPO 2: CASOS CRÍTICOS QUE ANULAN MÚLTIPLES GESTIONES =====
  rechazo_ia_anula_multiples: {
    name: "Rechazo IA anula múltiples gestiones",
    transcript: [
      { role: 'user', message: 'No quiero hablar con una máquina, quiero cambiar mi cuenta Y también el duplicado por email' },
      { role: 'agent', message: 'Claro, le paso con uno de nuestros compañeros' }
    ],
    expected: {
      multipleGestiones: false,
      totalGestiones: 1,
      incidenciaPrincipal: { 
        tipo: "Llamada gestión comercial", 
        motivo: "Reenvío agentes humanos no quiere IA" 
      },
      incidenciasSecundarias: []
    }
  },

  no_tomador_anula_multiples: {
    name: "No tomador anula múltiples gestiones",
    transcript: [
      { role: 'user', message: 'Llamo por la póliza de mi hermano, quiero cambiar su cuenta Y también el duplicado' },
      { role: 'agent', message: 'Como no es el tomador, le paso con mis compañeros' }
    ],
    expected: {
      multipleGestiones: false,
      totalGestiones: 1,
      incidenciaPrincipal: { 
        tipo: "Llamada gestión comercial", 
        motivo: "Reenvío agentes humanos no tomador" 
      },
      incidenciasSecundarias: []
    }
  },

  datos_incompletos_anula_multiples: {
    name: "Datos incompletos anula múltiples gestiones",
    transcript: [
      { role: 'user', message: 'Quiero cambiar mi cuenta Y también añadir un asegurado, pero no tengo los datos ahora' },
      { role: 'agent', message: 'Sin los datos no puedo hacer las modificaciones. Vuelva a llamar cuando los tenga' }
    ],
    expected: {
      multipleGestiones: false,
      totalGestiones: 1,
      incidenciaPrincipal: { 
        tipo: "Modificación póliza emitida", 
        motivo: "Datos incompletos" 
      },
      incidenciasSecundarias: []
    }
  },

  // ===== GRUPO 3: CONECTORES Y SEÑALES ESPECÍFICAS =====
  conector_y_tambien: {
    name: "Conector 'Y también'",
    transcript: [
      { role: 'user', message: 'Quiero cambiar mi dirección Y también necesito información sobre mi número de póliza' },
      { role: 'agent', message: 'Cambio su dirección y su número de póliza es AU123456789' }
    ],
    expected: {
      multipleGestiones: true,
      totalGestiones: 2,
      incidenciaPrincipal: { 
        tipo: "Modificación póliza emitida", 
        motivo: "Cambio dirección postal" 
      },
      incidenciasSecundarias: [
        { 
          tipo: "Llamada gestión comercial", 
          motivo: "Consulta cliente" 
        }
      ]
    }
  },

  conector_ademas: {
    name: "Conector 'Además'",
    transcript: [
      { role: 'user', message: 'Necesito el duplicado de mi póliza por email. Además, quiero cambiar la forma de pago de anual a mensual' },
      { role: 'agent', message: 'Le envío el duplicado por email y procedo con el fraccionamiento' }
    ],
    expected: {
      multipleGestiones: true,
      totalGestiones: 2,
      incidenciaPrincipal: { 
        tipo: "Solicitud duplicado póliza", 
        motivo: "Email" 
      },
      incidenciasSecundarias: [
        { 
          tipo: "Llamada gestión comercial", 
          motivo: "Cambio forma de pago" 
        }
      ]
    }
  },

  diferentes_polizas: {
    name: "Diferentes pólizas mencionadas",
    transcript: [
      { role: 'user', message: 'Quiero cambiar la cuenta del coche y también modificar la dirección del hogar' },
      { role: 'agent', message: 'Registro ambos cambios en sus respectivas pólizas' }
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
          tipo: "Modificación póliza emitida", 
          motivo: "Cambio dirección postal" 
        }
      ]
    }
  },

  // ===== GRUPO 4: CASOS LÍMITE Y EDGE CASES =====
  cuatro_gestiones_limite: {
    name: "Cuatro gestiones - Debe agrupar en LLam gestión comerc",
    transcript: [
      { role: 'user', message: 'Quiero cambiar cuenta, Y también duplicado email, Y además cambiar dirección, Y por último añadir un asegurado' },
      { role: 'agent', message: 'Son varias gestiones, tomo nota de todas' }
    ],
    expected: {
      multipleGestiones: true,
      totalGestiones: 3, // Máximo 3, la cuarta se agrupa
      incidenciaPrincipal: { 
        tipo: "Modificación póliza emitida", 
        motivo: "Cambio nº de cuenta" 
      },
      incidenciasSecundarias: [
        { 
          tipo: "Solicitud duplicado póliza", 
          motivo: "Email" 
        },
        { 
          tipo: "Llamada gestión comercial", 
          motivo: "LLam gestión comerc" // Agrupa las gestiones restantes
        }
      ]
    }
  },

  fraccionamiento_con_otra_gestion: {
    name: "Fraccionamiento + otra gestión",
    transcript: [
      { role: 'user', message: 'Tengo pago anual y quiero cambiar a mensual, Y también necesito el duplicado por email' },
      { role: 'agent', message: 'Procedo con el fraccionamiento y le envío el duplicado' }
    ],
    expected: {
      multipleGestiones: true,
      totalGestiones: 2,
      incidenciaPrincipal: { 
        tipo: "Llamada gestión comercial", 
        motivo: "Cambio forma de pago" // Fraccionamiento va a gestión comercial
      },
      incidenciasSecundarias: [
        { 
          tipo: "Solicitud duplicado póliza", 
          motivo: "Email" 
        }
      ]
    }
  },

  // ===== GRUPO 5: CASOS QUE NO SON MÚLTIPLES GESTIONES =====
  una_sola_gestion: {
    name: "Una sola gestión - No debe marcar como múltiple",
    transcript: [
      { role: 'user', message: 'Quiero cambiar mi cuenta bancaria' },
      { role: 'agent', message: 'Perfecto, registro el cambio de cuenta' }
    ],
    expected: {
      multipleGestiones: false,
      totalGestiones: 1,
      incidenciaPrincipal: { 
        tipo: "Modificación póliza emitida", 
        motivo: "Cambio nº de cuenta" 
      },
      incidenciasSecundarias: []
    }
  },

  gestion_compleja_pero_unica: {
    name: "Gestión compleja pero única",
    transcript: [
      { role: 'user', message: 'Quiero hacer una cesión de derechos para mi préstamo hipotecario' },
      { role: 'agent', message: 'Necesito los datos del préstamo para proceder' }
    ],
    expected: {
      multipleGestiones: false,
      totalGestiones: 1,
      incidenciaPrincipal: { 
        tipo: "Modificación póliza emitida", 
        motivo: "Cesión de derechos" 
      },
      incidenciasSecundarias: []
    }
  }
};

// 🧪 FUNCIÓN PRINCIPAL DE TESTING
async function runMultipleTicketsTests() {
  console.log('🧪 ===============================================');
  console.log('🎯 INICIANDO TESTS DE MÚLTIPLES TICKETS');
  console.log('🧪 ===============================================\n');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const [testKey, testCase] of Object.entries(testCases)) {
    totalTests++;
    console.log(`📝 TEST ${totalTests}: ${testCase.name}`);
    console.log(`🔍 Caso: ${testKey}`);
    
    try {
      // Ejecutar análisis
      const result = await nogalAnalysisService.analyzeCallForNogal(
        testCase.transcript,
        `test-multiple-${testKey}`
      );

      // Validar resultados
      const validation = validateMultipleTicketsResult(result, testCase.expected);
      
      if (validation.success) {
        console.log(`✅ PASSED: ${validation.message}`);
        passedTests++;
      } else {
        console.log(`❌ FAILED: ${validation.message}`);
        console.log(`   Expected: ${JSON.stringify(testCase.expected, null, 2)}`);
        console.log(`   Got: ${JSON.stringify({
          multipleGestiones: result.multipleGestiones,
          totalGestiones: result.totalGestiones,
          incidenciaPrincipal: result.incidenciaPrincipal,
          incidenciasSecundarias: result.incidenciasSecundarias
        }, null, 2)}`);
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
  console.log('📊 RESUMEN DE TESTS DE MÚLTIPLES TICKETS');
  console.log('🧪 ===============================================');
  console.log(`📈 Total tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📊 Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (failedTests === 0) {
    console.log('🎉 ¡TODOS LOS TESTS DE MÚLTIPLES TICKETS PASARON!');
  } else {
    console.log(`⚠️  ${failedTests} tests fallaron. Revisar implementación.`);
  }
}

// 🔍 FUNCIÓN DE VALIDACIÓN
function validateMultipleTicketsResult(result, expected) {
  // Validar multipleGestiones
  if (result.multipleGestiones !== expected.multipleGestiones) {
    return {
      success: false,
      message: `multipleGestiones esperado: ${expected.multipleGestiones}, obtenido: ${result.multipleGestiones}`
    };
  }

  // Validar totalGestiones
  if (result.totalGestiones !== expected.totalGestiones) {
    return {
      success: false,
      message: `totalGestiones esperado: ${expected.totalGestiones}, obtenido: ${result.totalGestiones}`
    };
  }

  // Validar incidenciaPrincipal
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

  // Validar incidenciasSecundarias
  if (result.incidenciasSecundarias.length !== expected.incidenciasSecundarias.length) {
    return {
      success: false,
      message: `Número de incidencias secundarias esperado: ${expected.incidenciasSecundarias.length}, obtenido: ${result.incidenciasSecundarias.length}`
    };
  }

  // Validar cada incidencia secundaria
  for (let i = 0; i < expected.incidenciasSecundarias.length; i++) {
    const expectedSecondary = expected.incidenciasSecundarias[i];
    const resultSecondary = result.incidenciasSecundarias[i];

    if (!resultSecondary) {
      return {
        success: false,
        message: `Falta incidencia secundaria ${i + 1}`
      };
    }

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

  return {
    success: true,
    message: 'Todas las validaciones pasaron correctamente'
  };
}

// 🚀 EJECUTAR TESTS
if (import.meta.url === `file://${process.argv[1]}`) {
  runMultipleTicketsTests().catch(console.error);
}

export { runMultipleTicketsTests, testCases };

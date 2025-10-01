#!/usr/bin/env node

/**
 * 🎯 TEST ESPECÍFICO: VALIDACIÓN DE JERARQUÍA DE PRIORIDADES
 * 
 * Este test valida que la jerarquía de prioridades funciona correctamente
 * tanto en casos simples como en múltiples gestiones
 */

import { nogalAnalysisService } from '../src/services/nogalAnalysisService.js';

// 🎯 CASOS DE PRUEBA PARA JERARQUÍA DE PRIORIDADES
const priorityTestCases = {

  // ===== FASE 1: CASOS CRÍTICOS (MÁXIMA PRIORIDAD) =====
  fase1_rechazo_ia_vs_fraccionamiento: {
    name: "FASE 1: Rechazo IA prevalece sobre fraccionamiento",
    transcript: [
      { role: 'user', message: 'No quiero hablar con una máquina, quiero cambiar mi pago anual a mensual' },
      { role: 'agent', message: 'Le paso con uno de nuestros compañeros' }
    ],
    expected: {
      fase: 1,
      tipo: "Llamada gestión comercial",
      motivo: "Reenvío agentes humanos no quiere IA",
      multipleGestiones: false
    }
  },

  fase1_no_tomador_vs_consulta: {
    name: "FASE 1: No tomador prevalece sobre consulta",
    transcript: [
      { role: 'user', message: 'Llamo por la póliza de mi hermano, ¿cuál es el número de póliza?' },
      { role: 'agent', message: 'Como no es el tomador, le paso con mis compañeros' }
    ],
    expected: {
      fase: 1,
      tipo: "Llamada gestión comercial",
      motivo: "Reenvío agentes humanos no tomador",
      multipleGestiones: false
    }
  },

  fase1_datos_incompletos_vs_modificacion: {
    name: "FASE 1: Datos incompletos prevalece sobre modificación",
    transcript: [
      { role: 'user', message: 'Quiero cambiar mi cuenta bancaria pero no tengo el nuevo IBAN ahora' },
      { role: 'agent', message: 'Sin el nuevo IBAN no puedo hacer el cambio. Vuelva a llamar cuando lo tenga' }
    ],
    expected: {
      fase: 1,
      tipo: "Modificación póliza emitida",
      motivo: "Datos incompletos",
      multipleGestiones: false
    }
  },

  // ===== FASE 2: TRANSFERENCIAS (SEGUNDA PRIORIDAD) =====
  fase2_pago_recibo_vs_consulta: {
    name: "FASE 2: Pago recibo prevalece sobre consulta",
    transcript: [
      { role: 'user', message: 'Quiero pagar un recibo pendiente y también saber mi número de póliza' },
      { role: 'agent', message: 'Le transfiero con atención al cliente para el pago' }
    ],
    expected: {
      fase: 2,
      tipo: "Llamada gestión comercial",
      motivo: "Reenvío agentes humanos",
      multipleGestiones: false
    }
  },

  fase2_asistencia_carretera_vs_modificacion: {
    name: "FASE 2: Asistencia carretera prevalece sobre modificación",
    transcript: [
      { role: 'user', message: 'Necesito una grúa urgente y también quiero cambiar mi dirección' },
      { role: 'agent', message: 'Le transfiero inmediatamente con siniestros' }
    ],
    expected: {
      fase: 2,
      tipo: "Llamada asistencia en carretera",
      motivo: "Siniestros",
      multipleGestiones: false
    }
  },

  // ===== FASE 3: FRACCIONAMIENTO (TERCERA PRIORIDAD) =====
  fase3_fraccionamiento_vs_consulta: {
    name: "FASE 3: Fraccionamiento prevalece sobre consulta",
    transcript: [
      { role: 'user', message: 'Tengo pago anual y quiero cambiar a mensual, y también quiero saber mi número de póliza' },
      { role: 'agent', message: 'Procedo con el fraccionamiento y su número es AU123456' }
    ],
    expected: {
      fase: 3,
      multipleGestiones: true,
      incidenciaPrincipal: {
        tipo: "Llamada gestión comercial",
        motivo: "Cambio forma de pago"
      },
      incidenciasSecundarias: [{
        tipo: "Llamada gestión comercial",
        motivo: "Consulta cliente"
      }]
    }
  },

  fase3_cambio_pago_normal: {
    name: "FASE 3: Cambio pago no anual (modificación)",
    transcript: [
      { role: 'user', message: 'Tengo pago trimestral y quiero cambiar a semestral' },
      { role: 'agent', message: 'Registro el cambio de periodicidad' }
    ],
    expected: {
      fase: 3,
      tipo: "Modificación póliza emitida",
      motivo: "Cambio forma de pago",
      multipleGestiones: false
    }
  },

  // ===== FASE 4: CONSULTAS (CUARTA PRIORIDAD) =====
  fase4_consulta_especifica: {
    name: "FASE 4: Consulta específica resuelta",
    transcript: [
      { role: 'user', message: '¿Cuál es la fecha de efecto de mi póliza?' },
      { role: 'agent', message: 'Su póliza comenzó el 15 de enero de 2024' }
    ],
    expected: {
      fase: 4,
      tipo: "Llamada gestión comercial",
      motivo: "Consulta cliente",
      multipleGestiones: false
    }
  },

  fase4_gestion_no_resuelta: {
    name: "FASE 4: Gestión no resuelta",
    transcript: [
      { role: 'user', message: '¿Cuánto pago de prima mensual?' },
      { role: 'agent', message: 'Lo siento, no tengo acceso a esa información. Tomo nota y un compañero le llamará' }
    ],
    expected: {
      fase: 4,
      tipo: "Llamada gestión comercial",
      motivo: "LLam gestión comerc",
      multipleGestiones: false
    }
  },

  // ===== FASE 5: GESTIONES NORMALES =====
  fase5_nueva_contratacion: {
    name: "FASE 5: Nueva contratación",
    transcript: [
      { role: 'user', message: 'Quiero contratar un seguro de hogar' },
      { role: 'agent', message: 'Perfecto, un compañero se pondrá en contacto para el presupuesto' }
    ],
    expected: {
      fase: 5,
      tipo: "Nueva contratación de seguros",
      motivo: "Contratación Póliza",
      ramo: "HOGAR",
      multipleGestiones: false
    }
  },

  fase5_modificacion_normal: {
    name: "FASE 5: Modificación normal",
    transcript: [
      { role: 'user', message: 'Quiero cambiar mi dirección postal' },
      { role: 'agent', message: 'Registro la nueva dirección' }
    ],
    expected: {
      fase: 5,
      tipo: "Modificación póliza emitida",
      motivo: "Cambio dirección postal",
      multipleGestiones: false
    }
  },

  // ===== CASOS COMPLEJOS DE MÚLTIPLES GESTIONES CON PRIORIDADES =====
  multiples_sin_criticos: {
    name: "Múltiples gestiones sin casos críticos",
    transcript: [
      { role: 'user', message: 'Quiero cambiar mi dirección Y también necesito el duplicado por email Y además quiero añadir un asegurado' },
      { role: 'agent', message: 'Registro todas las modificaciones' }
    ],
    expected: {
      multipleGestiones: true,
      totalGestiones: 3,
      incidenciaPrincipal: {
        tipo: "Modificación póliza emitida",
        motivo: "Cambio dirección postal"
      },
      incidenciasSecundarias: [
        {
          tipo: "Solicitud duplicado póliza",
          motivo: "Email"
        },
        {
          tipo: "Modificación póliza emitida",
          motivo: "Modificación nº asegurados"
        }
      ]
    }
  },

  multiples_con_fraccionamiento: {
    name: "Múltiples gestiones con fraccionamiento prioritario",
    transcript: [
      { role: 'user', message: 'Quiero cambiar mi dirección Y también cambiar mi pago anual a mensual' },
      { role: 'agent', message: 'Registro el cambio de dirección y procedo con el fraccionamiento' }
    ],
    expected: {
      multipleGestiones: true,
      totalGestiones: 2,
      incidenciaPrincipal: {
        tipo: "Llamada gestión comercial", // Fraccionamiento tiene prioridad
        motivo: "Cambio forma de pago"
      },
      incidenciasSecundarias: [
        {
          tipo: "Modificación póliza emitida",
          motivo: "Cambio dirección postal"
        }
      ]
    }
  }
};

// 🧪 FUNCIÓN PRINCIPAL DE TESTING
async function runPriorityHierarchyTests() {
  console.log('🎯 ===============================================');
  console.log('⚡ INICIANDO TESTS DE JERARQUÍA DE PRIORIDADES');
  console.log('🎯 ===============================================\n');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const [testKey, testCase] of Object.entries(priorityTestCases)) {
    totalTests++;
    console.log(`📝 TEST ${totalTests}: ${testCase.name}`);
    console.log(`🔍 Caso: ${testKey}`);
    
    try {
      // Ejecutar análisis
      const result = await nogalAnalysisService.analyzeCallForNogal(
        testCase.transcript,
        `test-priority-${testKey}`
      );

      // Validar resultados
      const validation = validatePriorityResult(result, testCase.expected);
      
      if (validation.success) {
        console.log(`✅ PASSED: ${validation.message}`);
        passedTests++;
      } else {
        console.log(`❌ FAILED: ${validation.message}`);
        console.log(`   Expected: ${JSON.stringify(testCase.expected, null, 2)}`);
        console.log(`   Got: ${JSON.stringify({
          tipo: result.incidenciaPrincipal.tipo,
          motivo: result.incidenciaPrincipal.motivo,
          ramo: result.incidenciaPrincipal.ramo,
          multipleGestiones: result.multipleGestiones,
          totalGestiones: result.totalGestiones,
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
  console.log('🎯 ===============================================');
  console.log('📊 RESUMEN DE TESTS DE JERARQUÍA DE PRIORIDADES');
  console.log('🎯 ===============================================');
  console.log(`📈 Total tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📊 Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (failedTests === 0) {
    console.log('🎉 ¡TODOS LOS TESTS DE JERARQUÍA PASARON!');
  } else {
    console.log(`⚠️  ${failedTests} tests fallaron. Revisar jerarquía de prioridades.`);
  }
}

// 🔍 FUNCIÓN DE VALIDACIÓN
function validatePriorityResult(result, expected) {
  // Validar tipo principal
  if (result.incidenciaPrincipal.tipo !== expected.tipo && !expected.incidenciaPrincipal) {
    return {
      success: false,
      message: `Tipo esperado: ${expected.tipo}, obtenido: ${result.incidenciaPrincipal.tipo}`
    };
  }

  // Validar motivo principal
  if (result.incidenciaPrincipal.motivo !== expected.motivo && !expected.incidenciaPrincipal) {
    return {
      success: false,
      message: `Motivo esperado: ${expected.motivo}, obtenido: ${result.incidenciaPrincipal.motivo}`
    };
  }

  // Validar ramo si se especifica
  if (expected.ramo && result.incidenciaPrincipal.ramo !== expected.ramo) {
    return {
      success: false,
      message: `Ramo esperado: ${expected.ramo}, obtenido: ${result.incidenciaPrincipal.ramo}`
    };
  }

  // Validar múltiples gestiones
  if (expected.multipleGestiones !== undefined && result.multipleGestiones !== expected.multipleGestiones) {
    return {
      success: false,
      message: `multipleGestiones esperado: ${expected.multipleGestiones}, obtenido: ${result.multipleGestiones}`
    };
  }

  // Validar casos de múltiples gestiones específicos
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

  // Validar incidencias secundarias si se especifican
  if (expected.incidenciasSecundarias) {
    if (result.incidenciasSecundarias.length !== expected.incidenciasSecundarias.length) {
      return {
        success: false,
        message: `Número de incidencias secundarias esperado: ${expected.incidenciasSecundarias.length}, obtenido: ${result.incidenciasSecundarias.length}`
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
    message: 'Jerarquía de prioridades validada correctamente'
  };
}

// 🚀 EJECUTAR TESTS
if (import.meta.url === `file://${process.argv[1]}`) {
  runPriorityHierarchyTests().catch(console.error);
}

export { runPriorityHierarchyTests, priorityTestCases };

#!/usr/bin/env node

/**
 * 🎯 TEST MAESTRO: VALIDACIÓN COMPLETA DEL PROMPT ACTUALIZADO
 * 
 * Este test ejecuta todas las validaciones:
 * 1. Casos críticos corregidos
 * 2. Múltiples tickets
 * 3. Jerarquía de prioridades
 * 4. Caso específico del fraccionamiento (conv_3701k608mnc4fznbh9pyc9tjkwr4)
 */

import { nogalAnalysisService } from '../src/services/nogalAnalysisService.js';

// 🎯 TEST DEL CASO ESPECÍFICO MENCIONADO
const casoEspecificoFraccionamiento = {
  name: "CASO REAL: conv_3701k608mnc4fznbh9pyc9tjkwr4 - Fraccionamiento corregido",
  transcript: [
    { role: 'user', message: 'Hola, tengo una póliza que pago anualmente y me gustaría cambiar a pago mensual' },
    { role: 'agent', message: 'Perfecto, puedo ayudarle con el fraccionamiento de su póliza. Su póliza actual es de pago anual y quiere cambiar a mensual, ¿correcto?' },
    { role: 'user', message: 'Exacto, es más cómodo para mí pagar mensualmente' },
    { role: 'agent', message: 'Entendido, procederemos con el cambio de forma de pago de anual a mensual' }
  ],
  expected: {
    tipo: "Llamada gestión comercial",
    motivo: "Cambio forma de pago",
    multipleGestiones: false,
    totalGestiones: 1
  },
  criticality: "CRÍTICO - Era el error principal identificado"
};

// 🎯 CASOS CRÍTICOS DE VALIDACIÓN
const casosCriticos = {
  
  // Fraccionamiento vs cambio normal
  fraccionamiento_anual_mensual: {
    name: "Fraccionamiento anual → mensual",
    transcript: [
      { role: 'user', message: 'Tengo pago anual y quiero cambiar a mensual' },
      { role: 'agent', message: 'Procedo con el fraccionamiento' }
    ],
    expected: {
      tipo: "Llamada gestión comercial",
      motivo: "Cambio forma de pago"
    }
  },

  cambio_trimestral_semestral: {
    name: "Cambio trimestral → semestral",
    transcript: [
      { role: 'user', message: 'Tengo pago trimestral y quiero cambiar a semestral' },
      { role: 'agent', message: 'Registro el cambio de periodicidad' }
    ],
    expected: {
      tipo: "Modificación póliza emitida",
      motivo: "Cambio forma de pago"
    }
  },

  // Consultas específicas vs no específicas
  consulta_especifica_numero_poliza: {
    name: "Consulta específica - Número póliza",
    transcript: [
      { role: 'user', message: '¿Cuál es mi número de póliza?' },
      { role: 'agent', message: 'Su número de póliza es AU0420225024935' }
    ],
    expected: {
      tipo: "Llamada gestión comercial",
      motivo: "Consulta cliente"
    }
  },

  consulta_no_especifica_importes: {
    name: "Consulta no específica - Importes",
    transcript: [
      { role: 'user', message: '¿Cuánto pago de prima mensual?' },
      { role: 'agent', message: 'Lo siento, no tengo acceso a esa información. Tomo nota y un compañero le llamará' }
    ],
    expected: {
      tipo: "Llamada gestión comercial",
      motivo: "LLam gestión comerc"
    }
  },

  // Transferencias específicas
  pago_recibo_transferencia: {
    name: "Pago recibo → Transferencia",
    transcript: [
      { role: 'user', message: 'Quiero pagar un recibo que tengo pendiente' },
      { role: 'agent', message: 'Le transfiero con atención al cliente para gestionar el pago' }
    ],
    expected: {
      tipo: "Llamada gestión comercial",
      motivo: "Reenvío agentes humanos"
    }
  },

  // Múltiples gestiones reales
  cambio_cuenta_mas_duplicado: {
    name: "Cambio cuenta + Duplicado email",
    transcript: [
      { role: 'user', message: 'Quiero cambiar mi cuenta bancaria Y también necesito el duplicado de la póliza por email' },
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

  nueva_contratacion_mas_modificacion: {
    name: "Nueva contratación + Modificación existente",
    transcript: [
      { role: 'user', message: 'Quiero contratar un seguro de vida Y también cambiar la dirección en mi póliza del coche' },
      { role: 'agent', message: 'Le ayudo con la nueva contratación y el cambio de dirección' }
    ],
    expected: {
      multipleGestiones: true,
      totalGestiones: 2,
      incidenciaPrincipal: {
        tipo: "Nueva contratación de seguros",
        motivo: "Contratación Póliza",
        ramo: "VIDA"
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

// 🧪 FUNCIÓN PRINCIPAL DE TESTING COMPLETO
async function runCompleteValidation() {
  console.log('🚀 ===============================================');
  console.log('🎯 VALIDACIÓN COMPLETA DEL PROMPT ACTUALIZADO');
  console.log('🚀 ===============================================\n');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  // 1. Test del caso específico crítico
  console.log('🔥 CASO ESPECÍFICO CRÍTICO:');
  totalTests++;
  try {
    const result = await nogalAnalysisService.analyzeCallForNogal(
      casoEspecificoFraccionamiento.transcript,
      'conv_3701k608mnc4fznbh9pyc9tjkwr4'
    );

    const validation = validateCriticalCase(result, casoEspecificoFraccionamiento.expected);
    
    if (validation.success) {
      console.log(`✅ CASO CRÍTICO CORREGIDO: ${validation.message}`);
      passedTests++;
    } else {
      console.log(`❌ CASO CRÍTICO FALLÓ: ${validation.message}`);
      failedTests++;
    }
  } catch (error) {
    console.log(`💥 ERROR EN CASO CRÍTICO: ${error.message}`);
    failedTests++;
  }
  console.log('');

  // 2. Tests de casos críticos
  console.log('🎯 CASOS CRÍTICOS DE CLASIFICACIÓN:');
  for (const [testKey, testCase] of Object.entries(casosCriticos)) {
    totalTests++;
    console.log(`📝 ${testCase.name}`);
    
    try {
      const result = await nogalAnalysisService.analyzeCallForNogal(
        testCase.transcript,
        `test-critical-${testKey}`
      );

      const validation = validateCriticalCase(result, testCase.expected);
      
      if (validation.success) {
        console.log(`✅ PASSED`);
        passedTests++;
      } else {
        console.log(`❌ FAILED: ${validation.message}`);
        failedTests++;
      }
      
    } catch (error) {
      console.log(`💥 ERROR: ${error.message}`);
      failedTests++;
    }
  }
  console.log('');

  // Resumen final
  console.log('🚀 ===============================================');
  console.log('📊 RESUMEN FINAL DE VALIDACIÓN COMPLETA');
  console.log('🚀 ===============================================');
  console.log(`📈 Total tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📊 Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (failedTests === 0) {
    console.log('🎉 ¡VALIDACIÓN COMPLETA EXITOSA!');
    console.log('✅ El prompt está listo para producción');
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

// 🔍 FUNCIÓN DE VALIDACIÓN PARA CASOS CRÍTICOS
function validateCriticalCase(result, expected) {
  if (expected.incidenciaPrincipal) {
    // Validación para múltiples gestiones
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
  } else {
    // Validación para casos simples
    if (result.incidenciaPrincipal.tipo !== expected.tipo) {
      return {
        success: false,
        message: `Tipo esperado: ${expected.tipo}, obtenido: ${result.incidenciaPrincipal.tipo}`
      };
    }

    if (result.incidenciaPrincipal.motivo !== expected.motivo) {
      return {
        success: false,
        message: `Motivo esperado: ${expected.motivo}, obtenido: ${result.incidenciaPrincipal.motivo}`
      };
    }

    if (expected.ramo && result.incidenciaPrincipal.ramo !== expected.ramo) {
      return {
        success: false,
        message: `Ramo esperado: ${expected.ramo}, obtenido: ${result.incidenciaPrincipal.ramo}`
      };
    }

    if (expected.multipleGestiones !== undefined && result.multipleGestiones !== expected.multipleGestiones) {
      return {
        success: false,
        message: `multipleGestiones esperado: ${expected.multipleGestiones}, obtenido: ${result.multipleGestiones}`
      };
    }
  }

  return {
    success: true,
    message: 'Validación exitosa'
  };
}

// 🚀 EJECUTAR VALIDACIÓN COMPLETA
if (import.meta.url === `file://${process.argv[1]}`) {
  runCompleteValidation().catch(console.error);
}

export { runCompleteValidation, casoEspecificoFraccionamiento, casosCriticos };

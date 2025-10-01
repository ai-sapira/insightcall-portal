#!/usr/bin/env node

/**
 * 🧪 TEST SIMPLE: VALIDACIÓN DE MÚLTIPLES TICKETS
 * Compatible con el sistema actual
 */

const { createRequire } = require('module');
const require = createRequire(import.meta.url);

// 🎯 CASOS DE PRUEBA SIMPLIFICADOS
const testCases = [
  {
    name: "CASO CRÍTICO: Fraccionamiento anual → mensual",
    transcript: [
      { role: 'user', message: 'Tengo una póliza que pago anualmente y quiero cambiar a mensual' },
      { role: 'agent', message: 'Perfecto, procederemos con el fraccionamiento de su póliza' }
    ],
    expected: {
      tipo: "Llamada gestión comercial",
      motivo: "Cambio forma de pago",
      description: "CORRIGE el error del caso conv_3701k608mnc4fznbh9pyc9tjkwr4"
    }
  },
  
  {
    name: "Cambio pago no anual (trimestral → semestral)",
    transcript: [
      { role: 'user', message: 'Tengo pago trimestral y quiero cambiar a semestral' },
      { role: 'agent', message: 'Registro el cambio de periodicidad' }
    ],
    expected: {
      tipo: "Modificación póliza emitida",
      motivo: "Cambio forma de pago",
      description: "Cambio entre fraccionados va a modificación"
    }
  },

  {
    name: "Múltiples gestiones: Cuenta + Duplicado",
    transcript: [
      { role: 'user', message: 'Quiero cambiar mi cuenta bancaria Y también el duplicado por email' },
      { role: 'agent', message: 'Registro el cambio de cuenta y le envío el duplicado' }
    ],
    expected: {
      multipleGestiones: true,
      totalGestiones: 2,
      description: "Debe detectar dos gestiones independientes"
    }
  },

  {
    name: "Rechazo IA anula múltiples gestiones",
    transcript: [
      { role: 'user', message: 'No quiero hablar con máquina, quiero cambiar cuenta Y duplicado' },
      { role: 'agent', message: 'Le paso con uno de nuestros compañeros' }
    ],
    expected: {
      tipo: "Llamada gestión comercial",
      motivo: "Reenvío agentes humanos no quiere IA",
      multipleGestiones: false,
      description: "Caso crítico debe anular múltiples gestiones"
    }
  },

  {
    name: "Pago recibo → Reenvío agentes humanos",
    transcript: [
      { role: 'user', message: 'Quiero pagar un recibo que tengo pendiente' },
      { role: 'agent', message: 'Le transfiero con atención al cliente para el pago' }
    ],
    expected: {
      tipo: "Llamada gestión comercial",
      motivo: "Reenvío agentes humanos",
      description: "Pago recibo debe crear ticket de reenvío"
    }
  }
];

// 🧪 FUNCIÓN DE TESTING MANUAL
async function runManualTests() {
  console.log('🧪 ===============================================');
  console.log('🎯 TESTS MANUALES DE VALIDACIÓN');
  console.log('🧪 ===============================================\n');

  console.log('📋 CASOS DE PRUEBA PREPARADOS:');
  console.log('');

  testCases.forEach((testCase, index) => {
    console.log(`🎯 TEST ${index + 1}: ${testCase.name}`);
    console.log(`📝 Descripción: ${testCase.expected.description}`);
    console.log(`💬 Transcript:`);
    testCase.transcript.forEach(msg => {
      console.log(`   ${msg.role.toUpperCase()}: "${msg.message}"`);
    });
    console.log(`🎯 Esperado:`);
    if (testCase.expected.tipo) {
      console.log(`   Tipo: ${testCase.expected.tipo}`);
      console.log(`   Motivo: ${testCase.expected.motivo}`);
    }
    if (testCase.expected.multipleGestiones !== undefined) {
      console.log(`   Múltiples gestiones: ${testCase.expected.multipleGestiones}`);
      console.log(`   Total gestiones: ${testCase.expected.totalGestiones}`);
    }
    console.log('');
  });

  console.log('🚀 INSTRUCCIONES PARA EJECUTAR:');
  console.log('1. Usar estos transcripts en el sistema');
  console.log('2. Verificar que las clasificaciones coincidan');
  console.log('3. Especial atención al caso crítico del fraccionamiento');
  console.log('');

  console.log('🎯 CASOS CRÍTICOS A MONITOREAR:');
  console.log('✅ Fraccionamiento anual → Llamada gestión comercial');
  console.log('✅ Pago recibo → Reenvío agentes humanos');
  console.log('✅ Múltiples gestiones → incidenciasSecundarias pobladas');
  console.log('✅ Casos críticos → Anulan múltiples gestiones');
}

// 🚀 EJECUTAR
runManualTests().catch(console.error);

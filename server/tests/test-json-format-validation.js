// 🧪 TEST DE FORMATO JSON
// Valida que el formato JSON esperado sea correcto para múltiples tickets

// 🎯 CASOS DE RESPUESTA JSON SIMULADOS
const respuestasSimuladas = {
  
  // CASO 1: Fraccionamiento corregido
  fraccionamiento_anual: {
    name: "Fraccionamiento anual → mensual",
    response: {
      incidenciaPrincipal: {
        tipo: "Llamada gestión comercial",
        motivo: "Cambio forma de pago",
        ramo: null,
        esRellamada: false
      },
      incidenciasSecundarias: [],
      confidence: 0.95,
      resumenLlamada: "Cliente solicita cambio de pago anual a mensual",
      datosExtraidos: {
        tipoGestion: "fraccionamiento",
        pagoActual: "anual",
        pagoDeseado: "mensual"
      },
      notasParaNogal: "Fraccionamiento de pago anual a mensual",
      requiereTicket: true,
      prioridad: "MEDIA",
      multipleGestiones: false,
      totalGestiones: 1
    },
    expected: {
      tipo: "Llamada gestión comercial",
      motivo: "Cambio forma de pago",
      multipleGestiones: false,
      totalGestiones: 1
    }
  },

  // CASO 2: Múltiples gestiones
  multiples_gestiones: {
    name: "Múltiples gestiones - Cuenta + Duplicado",
    response: {
      incidenciaPrincipal: {
        tipo: "Modificación póliza emitida",
        motivo: "Cambio nº de cuenta",
        ramo: null,
        esRellamada: false
      },
      incidenciasSecundarias: [
        {
          tipo: "Solicitud duplicado póliza",
          motivo: "Email",
          ramo: null,
          esRellamada: false
        }
      ],
      confidence: 0.92,
      resumenLlamada: "Cliente solicita cambio de cuenta bancaria y duplicado por email",
      datosExtraidos: {
        tipoGestion: "multiple",
        gestiones: ["cambio_cuenta", "duplicado_email"]
      },
      notasParaNogal: "Dos gestiones independientes: cambio cuenta + duplicado",
      requiereTicket: true,
      prioridad: "MEDIA",
      multipleGestiones: true,
      totalGestiones: 2
    },
    expected: {
      multipleGestiones: true,
      totalGestiones: 2,
      incidenciasSecundarias: 1
    }
  },

  // CASO 3: Rechazo IA anula múltiples
  rechazo_ia_anula: {
    name: "Rechazo IA anula múltiples gestiones",
    response: {
      incidenciaPrincipal: {
        tipo: "Llamada gestión comercial",
        motivo: "Reenvío agentes humanos no quiere IA",
        ramo: null,
        esRellamada: false
      },
      incidenciasSecundarias: [],
      confidence: 0.98,
      resumenLlamada: "Cliente rechaza hablar con IA, solicita agente humano",
      datosExtraidos: {
        tipoGestion: "rechazo_ia",
        motivoRechazo: "no_quiere_maquina"
      },
      notasParaNogal: "Cliente rechaza explícitamente la IA",
      requiereTicket: true,
      prioridad: "ALTA",
      multipleGestiones: false,
      totalGestiones: 1
    },
    expected: {
      tipo: "Llamada gestión comercial",
      motivo: "Reenvío agentes humanos no quiere IA",
      multipleGestiones: false,
      totalGestiones: 1
    }
  },

  // CASO 4: Tres gestiones (límite)
  tres_gestiones: {
    name: "Tres gestiones - Límite máximo",
    response: {
      incidenciaPrincipal: {
        tipo: "Modificación póliza emitida",
        motivo: "Cambio dirección postal",
        ramo: null,
        esRellamada: false
      },
      incidenciasSecundarias: [
        {
          tipo: "Solicitud duplicado póliza",
          motivo: "Email",
          ramo: null,
          esRellamada: false
        },
        {
          tipo: "Modificación póliza emitida",
          motivo: "Modificación nº asegurados",
          ramo: null,
          esRellamada: false
        }
      ],
      confidence: 0.88,
      resumenLlamada: "Cliente solicita cambio dirección, duplicado email y añadir asegurado",
      datosExtraidos: {
        tipoGestion: "multiple",
        gestiones: ["cambio_direccion", "duplicado_email", "anadir_asegurado"]
      },
      notasParaNogal: "Tres gestiones independientes en el límite máximo",
      requiereTicket: true,
      prioridad: "MEDIA",
      multipleGestiones: true,
      totalGestiones: 3
    },
    expected: {
      multipleGestiones: true,
      totalGestiones: 3,
      incidenciasSecundarias: 2
    }
  }
};

// 🧪 FUNCIÓN DE VALIDACIÓN DE FORMATO JSON
function validarFormatoJSON() {
  console.log('🧪 ===============================================');
  console.log('🎯 VALIDACIÓN DE FORMATO JSON');
  console.log('🧪 ===============================================\n');

  let totalTests = 0;
  let testsPasados = 0;
  let testsFallidos = 0;

  for (const [key, caso] of Object.entries(respuestasSimuladas)) {
    totalTests++;
    console.log(`📝 TEST ${totalTests}: ${caso.name}`);
    
    const validacion = validarEstructuraRespuesta(caso.response, caso.expected);
    
    if (validacion.success) {
      console.log(`✅ FORMATO VÁLIDO: ${validacion.message}`);
      testsPasados++;
    } else {
      console.log(`❌ FORMATO INVÁLIDO: ${validacion.message}`);
      testsFallidos++;
    }
    
    console.log('');
  }

  // Resumen final
  console.log('🧪 ===============================================');
  console.log('📊 RESUMEN DE VALIDACIÓN DE FORMATO JSON');
  console.log('🧪 ===============================================');
  console.log(`📈 Total tests: ${totalTests}`);
  console.log(`✅ Pasados: ${testsPasados}`);
  console.log(`❌ Fallidos: ${testsFallidos}`);
  console.log(`📊 Porcentaje de éxito: ${((testsPasados / totalTests) * 100).toFixed(1)}%`);
  
  if (testsFallidos === 0) {
    console.log('🎉 ¡FORMATO JSON COMPLETAMENTE VÁLIDO!');
    console.log('✅ El sistema puede procesar correctamente múltiples tickets');
  } else {
    console.log(`⚠️  ${testsFallidos} tests fallaron. Revisar formato JSON.`);
  }

  return {
    totalTests,
    testsPasados,
    testsFallidos,
    porcentajeExito: (testsPasados / totalTests) * 100
  };
}

// 🔍 FUNCIÓN DE VALIDACIÓN DE ESTRUCTURA
function validarEstructuraRespuesta(response, expected) {
  // Validar campos obligatorios
  const camposObligatorios = [
    'incidenciaPrincipal',
    'incidenciasSecundarias',
    'confidence',
    'resumenLlamada',
    'datosExtraidos',
    'requiereTicket',
    'prioridad',
    'multipleGestiones',
    'totalGestiones'
  ];

  for (const campo of camposObligatorios) {
    if (!(campo in response)) {
      return {
        success: false,
        message: `Falta campo obligatorio: ${campo}`
      };
    }
  }

  // Validar estructura de incidenciaPrincipal
  const camposIncidencia = ['tipo', 'motivo', 'ramo', 'esRellamada'];
  for (const campo of camposIncidencia) {
    if (!(campo in response.incidenciaPrincipal)) {
      return {
        success: false,
        message: `Falta campo en incidenciaPrincipal: ${campo}`
      };
    }
  }

  // Validar incidenciasSecundarias es array
  if (!Array.isArray(response.incidenciasSecundarias)) {
    return {
      success: false,
      message: 'incidenciasSecundarias debe ser un array'
    };
  }

  // Validar estructura de incidencias secundarias
  for (let i = 0; i < response.incidenciasSecundarias.length; i++) {
    const incidencia = response.incidenciasSecundarias[i];
    for (const campo of camposIncidencia) {
      if (!(campo in incidencia)) {
        return {
          success: false,
          message: `Falta campo en incidenciasSecundarias[${i}]: ${campo}`
        };
      }
    }
  }

  // Validar coherencia de múltiples gestiones
  if (response.multipleGestiones && response.totalGestiones <= 1) {
    return {
      success: false,
      message: 'Si multipleGestiones es true, totalGestiones debe ser > 1'
    };
  }

  if (!response.multipleGestiones && response.incidenciasSecundarias.length > 0) {
    return {
      success: false,
      message: 'Si multipleGestiones es false, incidenciasSecundarias debe estar vacío'
    };
  }

  if (response.multipleGestiones && response.incidenciasSecundarias.length === 0) {
    return {
      success: false,
      message: 'Si multipleGestiones es true, debe haber incidenciasSecundarias'
    };
  }

  // Validar totalGestiones
  const totalEsperado = 1 + response.incidenciasSecundarias.length;
  if (response.totalGestiones !== totalEsperado) {
    return {
      success: false,
      message: `totalGestiones incorrecto: esperado ${totalEsperado}, obtenido ${response.totalGestiones}`
    };
  }

  // Validar contra expectativas específicas
  if (expected.tipo && response.incidenciaPrincipal.tipo !== expected.tipo) {
    return {
      success: false,
      message: `Tipo esperado: ${expected.tipo}, obtenido: ${response.incidenciaPrincipal.tipo}`
    };
  }

  if (expected.motivo && response.incidenciaPrincipal.motivo !== expected.motivo) {
    return {
      success: false,
      message: `Motivo esperado: ${expected.motivo}, obtenido: ${response.incidenciaPrincipal.motivo}`
    };
  }

  if (expected.multipleGestiones !== undefined && response.multipleGestiones !== expected.multipleGestiones) {
    return {
      success: false,
      message: `multipleGestiones esperado: ${expected.multipleGestiones}, obtenido: ${response.multipleGestiones}`
    };
  }

  if (expected.totalGestiones && response.totalGestiones !== expected.totalGestiones) {
    return {
      success: false,
      message: `totalGestiones esperado: ${expected.totalGestiones}, obtenido: ${response.totalGestiones}`
    };
  }

  if (expected.incidenciasSecundarias !== undefined && response.incidenciasSecundarias.length !== expected.incidenciasSecundarias) {
    return {
      success: false,
      message: `Número de incidenciasSecundarias esperado: ${expected.incidenciasSecundarias}, obtenido: ${response.incidenciasSecundarias.length}`
    };
  }

  return {
    success: true,
    message: 'Formato JSON completamente válido'
  };
}

// 🚀 EJECUTAR VALIDACIÓN
validarFormatoJSON();

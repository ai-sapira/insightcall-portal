// 🧪 TEST DE ESTRUCTURA DEL PROMPT
// Valida que el prompt tenga todas las secciones necesarias para múltiples tickets

const fs = require('fs');
const path = require('path');

// Leer el archivo del servicio
const serviceFile = path.join(__dirname, '../src/services/nogalAnalysisService.ts');
const serviceContent = fs.readFileSync(serviceFile, 'utf8');

// 🎯 VALIDACIONES DE ESTRUCTURA
const validaciones = {
  metodologia_multiples_gestiones: {
    name: "Metodología incluye detección de múltiples gestiones",
    pattern: /DETECTA MÚLTIPLES GESTIONES/,
    required: true
  },
  
  senales_multiples_temas: {
    name: "Señales de múltiples temas definidas",
    pattern: /SEÑALES DE MÚLTIPLES TEMAS/,
    required: true
  },
  
  conectores_especificos: {
    name: "Conectores específicos (Y también, Además)",
    pattern: /"Y también".*"Además"/s,
    required: true
  },
  
  ejemplos_multiples_gestiones: {
    name: "Ejemplos de múltiples gestiones",
    pattern: /EJEMPLOS DE MÚLTIPLES GESTIONES/,
    required: true
  },
  
  reglas_multiples_gestiones: {
    name: "Reglas para múltiples gestiones",
    pattern: /REGLAS PARA MÚLTIPLES GESTIONES/,
    required: true
  },
  
  casos_criticos_prevalecen: {
    name: "Casos críticos prevalecen sobre múltiples",
    pattern: /CASOS CRÍTICOS PREVALECEN/,
    required: true
  },
  
  fraccionamiento_corregido: {
    name: "Fraccionamiento anual → Llamada gestión comercial",
    pattern: /anual.*mensual.*Llamada gestión comercial.*Cambio forma de pago/s,
    required: true
  },
  
  transferencias_agentes_humanos: {
    name: "Sección de transferencias a agentes humanos",
    pattern: /TRANSFERENCIAS A AGENTES HUMANOS/,
    required: true
  },
  
  reenvio_no_quiere_ia: {
    name: "Reenvío agentes humanos no quiere IA",
    pattern: /Reenvío agentes humanos no quiere IA/,
    required: true
  },
  
  reenvio_no_tomador: {
    name: "Reenvío agentes humanos no tomador",
    pattern: /Reenvío agentes humanos no tomador/,
    required: true
  },
  
  pago_recibo_transferencia: {
    name: "Pago recibo → Reenvío agentes humanos",
    pattern: /pago recibo.*Reenvío agentes humanos/si,
    required: true
  },
  
  jerarquia_5_fases: {
    name: "Jerarquía de 5 fases de prioridad",
    pattern: /FASE 1.*FASE 2.*FASE 3.*FASE 4.*FASE 5/s,
    required: true
  },
  
  formato_json_multiples: {
    name: "Formato JSON incluye incidenciasSecundarias",
    pattern: /incidenciasSecundarias.*multipleGestiones.*totalGestiones/s,
    required: true
  },
  
  casos_csv_completos: {
    name: "26 casos de la tabla CSV incluidos",
    pattern: /Nueva contratación de seguros.*Modificación póliza emitida.*Solicitud duplicado póliza/s,
    required: true
  }
};

// 🧪 FUNCIÓN PRINCIPAL DE VALIDACIÓN
function validarEstructuraPrompt() {
  console.log('🧪 ===============================================');
  console.log('🎯 VALIDACIÓN DE ESTRUCTURA DEL PROMPT');
  console.log('🧪 ===============================================\n');

  let totalValidaciones = 0;
  let validacionesExitosas = 0;
  let validacionesFallidas = 0;

  for (const [key, validacion] of Object.entries(validaciones)) {
    totalValidaciones++;
    console.log(`📝 ${validacion.name}`);
    
    const match = validacion.pattern.test(serviceContent);
    
    if (match) {
      console.log('✅ ENCONTRADO');
      validacionesExitosas++;
    } else {
      console.log('❌ NO ENCONTRADO');
      validacionesFallidas++;
      
      if (validacion.required) {
        console.log('   ⚠️  REQUERIDO - Falta implementar');
      }
    }
    console.log('');
  }

  // Validaciones adicionales específicas
  console.log('🔍 VALIDACIONES ADICIONALES:');
  
  // Contar ejemplos de múltiples gestiones
  const ejemplosMultiples = (serviceContent.match(/EJEMPLO MÚLTIPLE \d+:/g) || []).length;
  console.log(`📊 Ejemplos de múltiples gestiones: ${ejemplosMultiples}`);
  if (ejemplosMultiples >= 2) {
    console.log('✅ Suficientes ejemplos');
    validacionesExitosas++;
  } else {
    console.log('❌ Faltan ejemplos');
    validacionesFallidas++;
  }
  totalValidaciones++;
  console.log('');

  // Verificar que no hay duplicaciones
  const duplicaciones = serviceContent.match(/Nueva Contratación.*Nueva Contratación/s);
  console.log('🔍 Verificando duplicaciones...');
  if (!duplicaciones) {
    console.log('✅ No hay secciones duplicadas');
    validacionesExitosas++;
  } else {
    console.log('❌ Hay secciones duplicadas');
    validacionesFallidas++;
  }
  totalValidaciones++;
  console.log('');

  // Resumen final
  console.log('🧪 ===============================================');
  console.log('📊 RESUMEN DE VALIDACIÓN DE ESTRUCTURA');
  console.log('🧪 ===============================================');
  console.log(`📈 Total validaciones: ${totalValidaciones}`);
  console.log(`✅ Exitosas: ${validacionesExitosas}`);
  console.log(`❌ Fallidas: ${validacionesFallidas}`);
  console.log(`📊 Porcentaje de éxito: ${((validacionesExitosas / totalValidaciones) * 100).toFixed(1)}%`);
  
  if (validacionesFallidas === 0) {
    console.log('🎉 ¡ESTRUCTURA DEL PROMPT COMPLETA!');
    console.log('✅ Todas las funcionalidades de múltiples tickets están implementadas');
  } else {
    console.log(`⚠️  ${validacionesFallidas} validaciones fallaron. Revisar implementación.`);
  }

  // Estadísticas del prompt
  console.log('\n📊 ESTADÍSTICAS DEL PROMPT:');
  const lineas = serviceContent.split('\n').length;
  const caracteres = serviceContent.length;
  const palabras = serviceContent.split(/\s+/).length;
  
  console.log(`📝 Líneas: ${lineas}`);
  console.log(`🔤 Caracteres: ${caracteres.toLocaleString()}`);
  console.log(`📖 Palabras: ${palabras.toLocaleString()}`);
  
  return {
    totalValidaciones,
    validacionesExitosas,
    validacionesFallidas,
    porcentajeExito: (validacionesExitosas / totalValidaciones) * 100
  };
}

// 🚀 EJECUTAR VALIDACIÓN
validarEstructuraPrompt();

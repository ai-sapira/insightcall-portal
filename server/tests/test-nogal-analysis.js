const { nogalAnalysisService } = require('../dist/services/nogalAnalysisService.js');

// 📝 TRANSCRIPCIONES DE PRUEBA
const transcripciones = {
  nueva_contratacion_hogar: [
    {
      role: 'agent',
      message: 'Hola soy Carlos, su agente virtual en la Correduría de Seguros Nogal, dígame por favor su nombre y apellido y si es usted un cliente, dígame por favor su DNI.'
    },
    {
      role: 'user', 
      message: 'Hola, me llamo Javier García, mi DNI es 03-473-587-N de Navarra.'
    },
    {
      role: 'agent',
      message: 'Perfecto, dame un momento que te encuentre...'
    },
    {
      role: 'system',
      message: '[Tool Call: identificar_cliente]'
    },
    {
      role: 'system',
      message: '[Tool Result: identificar_cliente] Cliente encontrado: Javier García Rodríguez, código cliente: 78175T08, pólizas: [AUTO: 123456-A]'
    },
    {
      role: 'agent',
      message: 'Javier García Rodríguez... veo que tiene contratada con nosotros una póliza de coche... ¿Quiere que le ayude con alguna gestión de alguna de estas pólizas o se trata de una nueva contratación?'
    },
    {
      role: 'user',
      message: '¿Es para una nueva contratación de una póliza de hogar?'
    },
    {
      role: 'agent',
      message: 'Claro... para una nueva contratación de una póliza de hogar, un compañero se pondrá en contacto con usted para ofrecerle un presupuesto y revisar su caso.'
    },
    {
      role: 'user',
      message: 'Vale, perfecto. Muchas gracias.'
    },
    {
      role: 'agent',
      message: 'Espero haberle sido de ayuda... Cualquier otra cosa que necesite, estamos a su disposición. Que tenga un buen día.'
    }
  ],

  datos_incompletos: [
    {
      role: 'agent',
      message: 'Hola, soy Carlos de Correduría Nogal. ¿En qué puedo ayudarle?'
    },
    {
      role: 'user',
      message: 'Hola, quiero cambiar el DNI de mi esposa en la póliza de coche.'
    },
    {
      role: 'agent',
      message: 'Perfecto, necesito el DNI actual de su esposa y el nuevo DNI para hacer el cambio.'
    },
    {
      role: 'user',
      message: 'El nuevo DNI sí lo tengo, es 12345678Z.'
    },
    {
      role: 'agent',
      message: '¿Y cuál es el DNI actual que figura en la póliza?'
    },
    {
      role: 'user',
      message: 'Ese no me lo sé de memoria.'
    },
    {
      role: 'agent',
      message: 'Sin el DNI actual no puedo hacer la modificación. Necesitaría que vuelva a llamar cuando tenga esa información.'
    },
    {
      role: 'user',
      message: 'Vale, entonces llamaré cuando lo tenga. Gracias.'
    }
  ],

  consulta_sin_respuesta: [
    {
      role: 'agent',
      message: 'Buenos días, le atiende Carlos de Nogal. ¿En qué puedo ayudarle?'
    },
    {
      role: 'user',
      message: 'Quería saber si mi seguro de hogar cubre daños por filtraciones de agua.'
    },
    {
      role: 'agent',
      message: 'Déjeme ver... no tengo acceso a ese detalle específico de coberturas en mi sistema.'
    },
    {
      role: 'user',
      message: '¿Y cuándo podría saberlo?'
    },
    {
      role: 'agent',
      message: 'Tendría que consultarlo en el sistema interno. Le llamaremos en 24-48 horas con la respuesta exacta.'
    },
    {
      role: 'user',
      message: 'Vale, perfecto. Espero su llamada entonces.'
    }
  ],

  multiple_gestiones: [
    {
      role: 'agent',
      message: 'Hola, le atiende Carlos de Nogal.'
    },
    {
      role: 'user',
      message: 'Hola, me han llamado por mi incidencia de hogar y estaba esperando a que me devolvieran otra vez la llamada.'
    },
    {
      role: 'agent',
      message: 'Perfecto, paso nota a mis compañeros para que le llamen sobre su incidencia de hogar.'
    },
    {
      role: 'user',
      message: 'Ya aprovechando la llamada, me gustaría ver si me podían mandar al correo electrónico un duplicado de la póliza de vida.'
    },
    {
      role: 'agent',
      message: 'Sin problema, le enviamos el duplicado por email. ¿Confirma su email?'
    },
    {
      role: 'user',
      message: 'Sí, es javier@email.com'
    },
    {
      role: 'agent',
      message: 'Perfecto, le llegará en las próximas horas.'
    }
  ]
};

// 🎯 RESULTADOS ESPERADOS
const resultadosEsperados = {
  nueva_contratacion_hogar: {
    tipo: 'Nueva contratación de seguros',
    motivo: 'Contratación Póliza',
    ramo: 'HOGAR'
  },
  datos_incompletos: {
    tipo: 'Modificación póliza emitida',
    motivo: 'Datos incompletos'
  },
  consulta_sin_respuesta: {
    tipo: 'Llamada gestión comercial',
    motivo: 'LLam gestión comerc'
  },
  multiple_gestiones: {
    multipleGestiones: true,
    totalGestiones: 2
  }
};

// 📊 FUNCIÓN PRINCIPAL DE ANÁLISIS
async function analizarTranscripcion(nombre, transcripcion, esperado = null) {
  console.log(`\n🧪 ======= ANÁLISIS: ${nombre.toUpperCase()} =======`);
  console.log(`📝 Mensajes: ${transcripcion.length}`);
  
  try {
    const resultado = await nogalAnalysisService.analyzeCallForNogal(
      transcripcion,
      `test-${nombre}`
    );
    
    console.log('\n✅ RESULTADO OBTENIDO:');
    console.log('🎯 Incidencia Principal:');
    console.log(`   - Tipo: ${resultado.incidenciaPrincipal.tipo}`);
    console.log(`   - Motivo: ${resultado.incidenciaPrincipal.motivo}`);
    console.log(`   - Ramo: ${resultado.incidenciaPrincipal.ramo || 'N/A'}`);
    console.log(`   - Es Rellamada: ${resultado.incidenciaPrincipal.esRellamada}`);
    
    if (resultado.incidenciasSecundarias?.length > 0) {
      console.log('\n🎯 Incidencias Secundarias:');
      resultado.incidenciasSecundarias.forEach((inc, i) => {
        console.log(`   ${i+1}. ${inc.tipo} - ${inc.motivo}`);
      });
    }
    
    console.log(`\n📊 Métricas:`);
    console.log(`   - Confianza: ${resultado.confidence}`);
    console.log(`   - Múltiples Gestiones: ${resultado.multipleGestiones || false}`);
    console.log(`   - Total Gestiones: ${resultado.totalGestiones || 1}`);
    console.log(`   - Requiere Ticket: ${resultado.requiereTicket}`);
    console.log(`   - Prioridad: ${resultado.prioridad}`);
    
    console.log(`\n📋 Datos Extraídos:`);
    Object.entries(resultado.datosExtraidos).forEach(([key, value]) => {
      if (value) console.log(`   - ${key}: ${value}`);
    });
    
    console.log(`\n📝 Resumen: ${resultado.resumenLlamada}`);
    
    if (resultado.notasParaNogal) {
      console.log(`\n📋 Notas para Nogal: ${resultado.notasParaNogal}`);
    }
    
    // 🚨 VERIFICACIÓN CON RESULTADO ESPERADO
    if (esperado) {
      console.log('\n🔍 VERIFICACIÓN:');
      let correcto = true;
      
      if (esperado.tipo && resultado.incidenciaPrincipal.tipo !== esperado.tipo) {
        console.log(`❌ TIPO: Esperado "${esperado.tipo}", obtenido "${resultado.incidenciaPrincipal.tipo}"`);
        correcto = false;
      }
      
      if (esperado.motivo && resultado.incidenciaPrincipal.motivo !== esperado.motivo) {
        console.log(`❌ MOTIVO: Esperado "${esperado.motivo}", obtenido "${resultado.incidenciaPrincipal.motivo}"`);
        correcto = false;
      }
      
      if (esperado.ramo && resultado.incidenciaPrincipal.ramo !== esperado.ramo) {
        console.log(`❌ RAMO: Esperado "${esperado.ramo}", obtenido "${resultado.incidenciaPrincipal.ramo}"`);
        correcto = false;
      }
      
      if (esperado.multipleGestiones !== undefined && resultado.multipleGestiones !== esperado.multipleGestiones) {
        console.log(`❌ MÚLTIPLES GESTIONES: Esperado ${esperado.multipleGestiones}, obtenido ${resultado.multipleGestiones}`);
        correcto = false;
      }
      
      console.log(correcto ? '✅ RESULTADO CORRECTO' : '❌ RESULTADO INCORRECTO');
      return correcto;
    }
    
    return true;
    
  } catch (error) {
    console.log('\n💥 ERROR EN ANÁLISIS:');
    console.error(error);
    
    if (error.message?.includes('Gemini') || error.message?.includes('API')) {
      console.log('\n🚨 POSIBLES CAUSAS:');
      console.log('1. API Key de Gemini no válida o caducada');
      console.log('2. Límite de rate limit alcanzado');
      console.log('3. Problema de conectividad');
      console.log('4. Prompt demasiado largo para el modelo');
    }
    
    return false;
  }
}

// 🏁 FUNCIÓN PRINCIPAL
async function ejecutarPruebas() {
  console.log('🏁 INICIANDO BATERÍA DE PRUEBAS DE NOGAL ANALYSIS');
  console.log('=' .repeat(60));
  
  const resultados = {};
  let totalPruebas = 0;
  let pruebasCorrectas = 0;
  
  for (const [nombre, transcripcion] of Object.entries(transcripciones)) {
    const esperado = resultadosEsperados[nombre];
    const correcto = await analizarTranscripcion(nombre, transcripcion, esperado);
    
    resultados[nombre] = correcto;
    totalPruebas++;
    if (correcto) pruebasCorrectas++;
    
    // Pausa entre pruebas para evitar rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n🏁 RESUMEN FINAL:');
  console.log('=' .repeat(60));
  console.log(`📊 Total Pruebas: ${totalPruebas}`);
  console.log(`✅ Correctas: ${pruebasCorrectas}`);
  console.log(`❌ Incorrectas: ${totalPruebas - pruebasCorrectas}`);
  console.log(`📈 Porcentaje de Éxito: ${Math.round((pruebasCorrectas / totalPruebas) * 100)}%`);
  
  console.log('\n📋 Detalle por Prueba:');
  Object.entries(resultados).forEach(([nombre, correcto]) => {
    console.log(`   ${correcto ? '✅' : '❌'} ${nombre}`);
  });
  
  if (pruebasCorrectas === totalPruebas) {
    console.log('\n🎉 ¡TODAS LAS PRUEBAS PASARON!');
  } else {
    console.log('\n🚨 HAY PRUEBAS FALLANDO - REVISAR PROMPT O LÓGICA');
  }
}

// 🎮 MODO INTERACTIVO
async function modoInteractivo() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('\n🎮 MODO INTERACTIVO ACTIVADO');
  console.log('Opciones disponibles:');
  console.log('  - Nombre de prueba (nueva_contratacion_hogar, datos_incompletos, etc.)');
  console.log('  - "todas" para ejecutar todas las pruebas');
  console.log('  - "exit" para salir');
  
  const pregunta = () => {
    rl.question('\n¿Qué prueba quieres ejecutar? ', async (respuesta) => {
      const input = respuesta.trim().toLowerCase();
      
      if (input === 'exit') {
        console.log('👋 ¡Hasta luego!');
        rl.close();
        return;
      }
      
      if (input === 'todas') {
        await ejecutarPruebas();
        pregunta();
        return;
      }
      
      if (transcripciones[input]) {
        const esperado = resultadosEsperados[input];
        await analizarTranscripcion(input, transcripciones[input], esperado);
        pregunta();
      } else {
        console.log('❌ Prueba no encontrada. Opciones disponibles:');
        console.log(Object.keys(transcripciones).join(', '));
        pregunta();
      }
    });
  };
  
  pregunta();
}

// 🚀 EJECUCIÓN
const args = process.argv.slice(2);

if (args.includes('--interactive') || args.includes('-i')) {
  modoInteractivo();
} else if (args.length > 0) {
  // Ejecutar prueba específica
  const nombrePrueba = args[0];
  if (transcripciones[nombrePrueba]) {
    const esperado = resultadosEsperados[nombrePrueba];
    analizarTranscripcion(nombrePrueba, transcripciones[nombrePrueba], esperado)
      .then(() => process.exit(0))
      .catch(error => {
        console.error('💥 Error:', error);
        process.exit(1);
      });
  } else {
    console.log('❌ Prueba no encontrada. Opciones disponibles:');
    console.log(Object.keys(transcripciones).join(', '));
    process.exit(1);
  }
} else {
  // Ejecutar todas las pruebas por defecto
  ejecutarPruebas()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('💥 Error:', error);
      process.exit(1);
    });
} 
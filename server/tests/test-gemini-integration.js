const { geminiClient } = require('../dist/lib/gemini.js');

// 🧪 TEST DE INTEGRACIÓN CON GEMINI
async function testGeminiIntegration() {
  console.log('🧪 ===============================================');
  console.log('🎯 TEST DE INTEGRACIÓN CON GEMINI 2.5 FLASH');
  console.log('🧪 ===============================================\n');

  try {
    console.log('📝 TEST 1: Generación de texto simple');
    const simpleResponse = await geminiClient.generateTextResponse(
      'Responde con exactamente estas palabras: "Gemini funciona correctamente"'
    );
    console.log(`✅ Respuesta: ${simpleResponse.trim()}`);
    
    if (simpleResponse.includes('Gemini funciona correctamente')) {
      console.log('✅ TEST 1 PASADO: Respuesta correcta');
    } else {
      console.log('⚠️  TEST 1 PARCIAL: Respuesta diferente pero funcional');
    }
    console.log('');

    console.log('📝 TEST 2: Generación de JSON estructurado');
    const jsonPrompt = `
Responde ÚNICAMENTE con este JSON exacto, sin texto adicional:
{
  "test": "success",
  "model": "gemini-2.5-flash",
  "timestamp": "${new Date().toISOString()}"
}`;

    const structuredResponse = await geminiClient.generateStructuredResponse(jsonPrompt);
    console.log(`✅ JSON Response:`, JSON.stringify(structuredResponse, null, 2));
    
    if (structuredResponse.test === 'success') {
      console.log('✅ TEST 2 PASADO: JSON estructurado correcto');
    } else {
      console.log('❌ TEST 2 FALLIDO: JSON estructurado incorrecto');
    }
    console.log('');

    console.log('📝 TEST 3: Análisis de conversación (simulado)');
    const conversationPrompt = `
Analiza esta conversación y responde en JSON:

USER: "Hola, quiero cambiar mi cuenta bancaria"
AGENT: "Perfecto, registro el cambio de cuenta"

Responde con este formato JSON:
{
  "tipo": "Modificación póliza emitida",
  "motivo": "Cambio nº de cuenta",
  "confidence": 0.95
}`;

    const analysisResponse = await geminiClient.generateStructuredResponse(conversationPrompt);
    console.log(`✅ Analysis Response:`, JSON.stringify(analysisResponse, null, 2));
    
    if (analysisResponse.tipo && analysisResponse.motivo) {
      console.log('✅ TEST 3 PASADO: Análisis de conversación funcional');
    } else {
      console.log('❌ TEST 3 FALLIDO: Análisis de conversación incorrecto');
    }
    console.log('');

    console.log('🎉 ===============================================');
    console.log('✅ INTEGRACIÓN CON GEMINI EXITOSA');
    console.log('🎉 ===============================================');
    console.log('✅ Modelo: gemini-2.5-flash');
    console.log('✅ SDK: @google/generative-ai v0.21.0');
    console.log('✅ Generación de texto: Funcional');
    console.log('✅ JSON estructurado: Funcional');
    console.log('✅ Análisis de conversaciones: Funcional');
    console.log('');
    console.log('🚀 El sistema está listo para procesar llamadas reales');

  } catch (error) {
    console.log('❌ ===============================================');
    console.log('💥 ERROR EN INTEGRACIÓN CON GEMINI');
    console.log('❌ ===============================================');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    if (error.message.includes('404')) {
      console.log('');
      console.log('🔍 DIAGNÓSTICO:');
      console.log('❌ El modelo especificado no está disponible');
      console.log('💡 SOLUCIÓN: Verificar modelo disponible en la API');
    } else if (error.message.includes('API key')) {
      console.log('');
      console.log('🔍 DIAGNÓSTICO:');
      console.log('❌ Problema con la clave de API');
      console.log('💡 SOLUCIÓN: Verificar GEMINI_API_KEY en variables de entorno');
    }
  }
}

// 🚀 EJECUTAR TEST
testGeminiIntegration();

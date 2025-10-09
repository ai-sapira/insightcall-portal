import { CallTranscript } from '../types/calls.types';
import { generateStructuredResponse } from '../lib/gemini';

/**
 * 🎯 CALL DECISION ENGINE
 * 
 * Filosofía: Un solo LLM call extrae TODA la información y toma decisiones claras
 * 
 * Input: Transcripción completa (incluyendo tool_results)
 * Output: Decisiones estructuradas + datos extraídos
 */

export interface CallDecision {
  // === INFORMACIÓN DEL CLIENTE ===
  clientInfo: {
    // Tipo de cliente detectado
    clientType: 'existing' | 'lead' | 'new' | 'unknown';
    
    // Datos extraídos de la conversación Y tool_results
    extractedData: {
      nombreCompleto?: string;
      telefono?: string;
      email?: string;
      numeroPoliza?: string;           // CRÍTICO: extraer de tool_results si cliente existente
      codigoCliente?: string;          // Si se encontró en tool_results
      direccion?: string;
      ramo?: string;                   // Del cliente existente o nuevo contrato
      cuentaBancaria?: string;         // CRÍTICO: nuevo IBAN para cambios de cuenta
    };
    
    // Info de cliente existente (de tool_results)
    existingClientInfo?: {
      clientId: string;
      clientName: string;
      numeroPoliza: string;            // DEBE estar presente si es cliente existente
      codigoCliente?: string;
      otrosDatos?: any;                // Datos adicionales de tool_results
    };
    
    // Info de Lead (de tool_results)
    leadInfo?: {
      leadId: string;
      campaignName: string;
      ramo: string;
      telefono?: string;
      email?: string;
    };
  };
  
  // === ANÁLISIS DE LA INCIDENCIA ===
  incidentAnalysis: {
    primaryIncident: {
      type: string;                    // "Nueva contratación de seguros", etc.
      reason: string;                  // "Contratación Póliza", etc.
      ramo?: string;                   // Para nuevas contrataciones
      description: string;             // Qué necesita el cliente
      confidence: number;              // 0-1
      numeroPolizaAfectada?: string;   // Si la gestión es sobre póliza específica
    };
    
    // Para casos complejos - múltiples gestiones en una llamada
    secondaryIncidents?: Array<{
      type: string;
      reason: string;
      ramo?: string;
      description: string;
      numeroPolizaAfectada?: string;
    }>;
    
    // Rellamadas (más flexible)
    followUpInfo: {
      isFollowUp: boolean;             // ¿Es rellamada?
      relatedTicketId?: string;        // Ticket al que da seguimiento
      createNewTicket: boolean;        // ¿Crear ticket nuevo además de la rellamada?
      followUpReason?: string;         // Razón del seguimiento
    };
  };
  
  // === DECISIONES FINALES ===
  decisions: {
    // Decisiones sobre cliente
    clientDecision: {
      shouldCreateClient: boolean;     // ¿Crear nuevo cliente?
      useExistingClient: boolean;      // ¿Usar cliente existente?
      useLeadData: boolean;            // ¿Crear desde lead?
      clientDataSource: 'extracted' | 'tool_results' | 'lead' | 'mixed';
    };
    
    // Decisiones sobre tickets
    ticketDecision: {
      shouldCreateTickets: boolean;    // ¿Crear ticket(s)?
      ticketCount: number;             // Cuántos tickets crear
      ticketsInfo: Array<{
        type: 'primary' | 'secondary';
        incident: any;                 // Referencia a la incidencia
        useClientId: string;           // ID del cliente a usar (asegurar consistencia)
        numeroPoliza?: string;         // Póliza específica si es gestión existente
      }>;
    };
    
    // Decisiones sobre rellamadas
    followUpDecision: {
      shouldCreateFollowUp: boolean;   // ¿Crear rellamada?
      followUpOnly: boolean;           // ¿Solo rellamada, sin ticket?
      relatedTicket?: string;          // Ticket al que da seguimiento
    };
    
    priority: 'low' | 'medium' | 'high';
    requiresImmediate: boolean;
  };
  
  // === METADATOS ===
  metadata: {
    confidence: number;
    processingRecommendation: string;
    ticketNotes?: string;              // Notas generadas por LLM para el ticket
    warnings?: string[];
    toolResultsFound: boolean;         // ¿Se encontraron tool_results?
    clientSearchResults?: any;         // Info de búsquedas encontradas
  };
}

class CallDecisionEngine {
  
  private readonly COMPREHENSIVE_ANALYSIS_PROMPT = `
🎯 ERES UN ANALISTA EXPERTO EN SEGUROS QUE PROCESA LLAMADAS TELEFÓNICAS

Tu trabajo es analizar UNA SOLA VEZ la transcripción completa (incluyendo tool_results) y extraer TODA la información para tomar decisiones.

## 📋 METODOLOGÍA:

1. **LEE LA CONVERSACIÓN COMPLETA** de principio a fin
2. **REVISA TODOS LOS TOOL_RESULTS** - aquí está la info del cliente
3. **IDENTIFICA AL CLIENTE** - ¿Existente (con póliza), Lead, o Nuevo?
4. **ANALIZA LA INCIDENCIA** - ¿Qué necesita? ¿Es rellamada?
5. **TOMA DECISIONES CLARAS** - ¿Qué crear y con qué datos?

## 🔍 IDENTIFICACIÓN DE CLIENTE (ORDEN DE PRIORIDAD):

### 1. CLIENTE EXISTENTE (de tool_results):
- Tool "identificar_cliente" devuelve cliente con póliza
- Tool "buscar_poliza" encuentra póliza existente
- Cliente menciona número de póliza que se confirma
- **EXTRAE**: codigoCliente, numeroPoliza, nombre completo

### 2. LEAD (de tool_results):
- Tool "identificar_cliente" devuelve leads de campaña
- Cliente viene de campaña específica
- **EXTRAE**: leadId, campaignName, ramo, datos de contacto

### 3. CLIENTE NUEVO:
- No se encuentra en tool_results
- Quiere contratar seguro nuevo
- **EXTRAE**: datos de contacto de la conversación

### 4. DESCONOCIDO:
- Sin tool_results claros
- Sin datos suficientes

# ⚠️ CRÍTICO - EXTRACCIÓN DE TOOL_RESULTS:

Busca en los tool_results de cada transcript los resultados de herramientas:

## 🔍 TOOL: identificar_cliente

**EJEMPLO REAL de tool_result exitoso:**
\`\`\`json
{
  "tool_name": "identificar_cliente",
  "result_value": "{\"status\":\"success\",\"message\":\"Cliente encontrado exitosamente\",\"data\":{\"clientes\":[{\"campaña\":\"\",\"codigo_cliente\":\"701795F00\",\"email_cliente\":\"javi.garcia1407@gmail.com\",\"nif_cliente\":\"03473587N\",\"nombre_cliente\":\"JAVIER GARCIA RODRIGUEZ\",\"telefono_1\":\"635361079\",\"telefono_2\":\"\",\"telefono_3\":\"\"}],\"detalle_polizas\":[{\"codigo_cliente\":\"701795F00\",\"matricula\":\"8168DJR\",\"modelo\":\"ELANTRA\",\"poliza\":\"3022300060797\",\"ramo\":\"Coche\"}],\"tipo_busqueda\":\"D\",\"valor_busqueda\":\"03473587N\",\"vtos_polizas\":[{\"codigo_cliente\":\"701795F00\",\"compañia\":\"REALE\",\"estado\":\"Contratada\",\"fecha_efecto\":\"01.05.23\",\"importe_poliza\":\"176,21\",\"mes_vencimiento\":\"Mayo\",\"poliza\":\"3022300060797\",\"poliza/suplemento\":\"Póliza\",\"ramo\":\"Coche\",\"reemplaza_a\":\"050025026\"}]}}",
  "is_error": false
}
\`\`\`

**INTERPRETACIÓN:**
- ✅ **Cliente EXISTENTE encontrado**: \`codigo_cliente: "701795F00"\`  
- ✅ **Nombre completo**: "JAVIER GARCIA RODRIGUEZ"
- ✅ **Email**: "javi.garcia1407@gmail.com"  
- ✅ **Teléfono**: "635361079"
- ✅ **Póliza actual**: "3022300060797" (ramo: Coche)

**SI data.clientes existe y length > 0 → clientType: "existing"**
**SI data.leads existe y length > 0 → clientType: "lead"**
**SI ni clientes ni leads → clientType: "new" o "unknown"**

## 🎯 EJEMPLO DE ANÁLISIS CORRECTO:

**CONVERSACIÓN:**
USER: "Me llamo Javier. Mi DNI es 03-473-587-N"
AGENT: "[Tool Call: identificar_cliente]"
AGENT: "[Tool Result: identificar_cliente]" (con data.clientes encontrado)
AGENT: "Javier, veo que tiene contratada con nosotros una póliza de coche..."
USER: "quería ver si me podían pasar un presupuesto para un seguro de hogar"

**ANÁLISIS CORRECTO:**
\`\`\`json
{
  "clientInfo": {
    "clientType": "existing",
    "extractedData": {
      "nombreCompleto": "JAVIER GARCIA RODRIGUEZ",
      "telefono": "635361079", 
      "email": "javi.garcia1407@gmail.com",
      "codigoCliente": "701795F00"
    },
    "existingClientInfo": {
      "clientId": "701795F00",
      "clientName": "JAVIER GARCIA RODRIGUEZ", 
      "numeroPoliza": "3022300060797",
      "codigoCliente": "701795F00"
    }
  },
  "incidentAnalysis": {
    "primaryIncident": {
      "type": "Nueva contratación de seguros",
      "reason": "Contratación Póliza",
      "ramo": "HOGAR",
      "description": "Cliente existente solicita presupuesto para seguro de hogar",
      "confidence": 0.95
    }
  },
  "decisions": {
    "clientDecision": {
      "shouldCreateClient": false,
      "useExistingClient": true,
      "useLeadData": false,
      "clientDataSource": "tool_results"
    },
    "ticketDecision": {
      "shouldCreateTickets": true,
      "ticketCount": 1,
      "ticketsInfo": [{
        "type": "primary",
        "useClientId": "701795F00",
        "numeroPoliza": ""
      }]
    }
  }
}
\`\`\`

## 🚨 **EJEMPLOS CRÍTICOS DE CASOS ESPECIALES:**

### **EJEMPLO: NO QUIERE IA**
\`\`\`json
{
  "incidentAnalysis": {
    "primaryIncident": {
      "type": "Llamada gestión comercial",
      "reason": "Reenvío agentes humanos no quiere IA",
      "description": "Cliente rechaza explícitamente hablar con IA y solicita agente humano",
      "confidence": 0.9
    }
  }
}
\`\`\`

### **EJEMPLO: DATOS INCOMPLETOS**
\`\`\`json
{
  "incidentAnalysis": {
    "primaryIncident": {
      "type": "Modificación póliza emitida",
      "reason": "Datos incompletos",
      "description": "Cliente solicita modificación pero no dispone de los datos necesarios",
      "confidence": 0.85
    }
  }
}
\`\`\`

### **EJEMPLO: NO TOMADOR**
\`\`\`json
{
  "incidentAnalysis": {
    "primaryIncident": {
      "type": "Llamada gestión comercial",
      "reason": "Reenvío agentes humanos no tomador",
      "description": "Llamante consulta sobre póliza de otra persona",
      "confidence": 0.9
    }
  }
}
\`\`\`

## 🚨 ERRORES A EVITAR:

❌ **NO usar IDs fallback si encontraste cliente real**
❌ **NO poner "No especificado" si el ramo se menciona claramente**  
❌ **NO crear cliente nuevo si ya existe en tool_results**

## ⚠️ **REGLAS PRIORITARIAS CRÍTICAS:**

1. **DETECTA PRIMERO EL RECHAZO A IA**: Si cliente dice "no quiero máquina/robot/IA/hablar con máquina" → SIEMPRE es "Reenvío agentes humanos no quiere IA"
2. **DETECTA DATOS INCOMPLETOS**: Si cliente no tiene datos necesarios para completar gestión → SIEMPRE es "Datos incompletos"  
3. **DETECTA NO TOMADOR**: Si llamante identificado ≠ tomador de póliza consultada → SIEMPRE es "Reenvío agentes humanos no tomador"
4. **DETECTA DUPLICADO TARJETA**: Si cliente menciona "duplicado" + "tarjeta" → SIEMPRE es "Duplicado Tarjeta" (prevalece sobre correo postal)
5. **DETECTA CAMBIO FECHA**: Si cliente menciona "cambiar" + "fecha" + contexto póliza → SIEMPRE es "Cambio fecha de efecto" (prevalece sobre gestión comercial)
6. **DETECTA MODIFICACIÓN ASEGURADOS**: Si cliente menciona "incluir/excluir/añadir/quitar" + "hijo/esposa/familiar/asegurado" → SIEMPRE es "Modificación nº asegurados" (prevalece sobre otras clasificaciones)
7. **DETECTA MODIFICACIÓN COBERTURAS**: Si cliente menciona "cambiar/modificar" + "cobertura/coberturas" + especifica el cambio → SIEMPRE es "Modificación coberturas" (prevalece sobre gestión comercial)
8. **DETECTA CESIÓN CON DATOS**: Si cliente menciona "cesión" + "préstamo/hipoteca" Y proporciona datos específicos → SIEMPRE es "Cesión de derechos"
9. **DETECTA CESIÓN SIN DATOS**: Si cliente menciona "cesión" + "préstamo/hipoteca" pero NO proporciona datos → SIEMPRE es "Cesión de derechos datos incompletos"
10. **PRIORIDAD SOBRE OTRAS CLASIFICACIONES**: Estos 9 casos PREVALECEN sobre cualquier otra clasificación posible

## 🎯 REGLAS DE EXTRACCIÓN:

1. **SIEMPRE parsear result_value como JSON**
2. **SI data.clientes[0] existe → usar codigo_cliente como clientId**
3. **SI usuario menciona ramo específico → extraerlo (HOGAR, AUTO, VIDA, etc.)**
4. **EXTRAER DATOS BANCARIOS**: Buscar IBANs, números de cuenta (ES12 3456 7890 1234 5678 9012)
5. **NUNCA inventar datos que no estén presentes**

## 🎫 TIPOS DE INCIDENCIA COMPLETOS:

### 📋 **NUEVA CONTRATACIÓN DE SEGUROS**:
- **Contratación Póliza**: Cliente quiere contratar nuevo seguro sin incidencia de vencimiento pendiente
- **Póliza anterior suspensión de garantías**: Cliente quiere contratar y tiene reserva de prima en compañía

### 🔧 **MODIFICACIÓN PÓLIZA EMITIDA** (requiere cliente existente + numeroPoliza):
- **Atención al cliente - Modif datos póliza**: Cambios que no varían prima (nombre, apellido, etc.)
- **Cambio nº de cuenta**: Cambiar cuenta bancaria para domiciliación
- **Cambio fecha de efecto**: Modificar fecha entrada en vigor del seguro
- **Cambio forma de pago**: Consolidación (fraccionado → anual) o cambio entre fraccionados
- **Modificación nº asegurados**: Incluir/excluir asegurados en póliza
- **Cambio dirección postal**: Modificar dirección postal de pólizas
- **Modificación coberturas**: Cambiar coberturas (ej: todo riesgo a terceros)
- **Cesión de derechos**: Para préstamo hipotecario (con datos completos)
- **Cesión de derechos datos incompletos**: Para préstamo (sin datos completos)
- **Corrección datos erróneos en póliza**: Corregir errores detectados
- **Datos incompletos**: Cliente quiere cambios pero no tiene datos nuevos

### 🏢 **LLAMADA GESTIÓN COMERCIAL**:
- **LLam gestión comerc**: Gestión sobre póliza (no renovación ni anulación)
- **Consulta cliente**: SOLO consultas específicas que Carlos SÍ puede resolver (fecha efecto, número póliza, compañía, forma pago, próximo recibo)
- **Cambio forma de pago**: Fraccionamiento (anual → fraccionado)
- **Reenvío siniestros**: Cuando se transfiere a cola siniestros
- **Reenvío agentes humanos**: Transferir a humanos (general)
- **Reenvío agentes humanos no quiere IA**: Cliente rechaza IA explícitamente
- **Reenvío agentes humanos no tomador**: Llamante no es el tomador
- ⚠️ **PAGO DE RECIBO**: SIEMPRE es "Reenvío agentes humanos" (transferencia obligatoria)

## 🚨 **DETECCIÓN CRÍTICA DE CASOS ESPECIALES:**

### ⚠️ **DISTINCIÓN CRÍTICA: "Consulta cliente" vs "LLam gestión comerc"**

**✅ "Consulta cliente"** - Carlos SÍ puede responder:
- ¿Cuál es la fecha de efecto de mi póliza? → Carlos da fecha específica
- ¿Cuál es mi número de póliza? → Carlos proporciona el número
- ¿Con qué compañía está emitida? → Carlos indica la compañía  
- ¿Cómo se realiza el pago? → Carlos explica SEPA/tarjeta
- ¿Cuándo se gira el próximo recibo? → Carlos indica mes

**❌ "LLam gestión comerc"** - Carlos NO puede responder:
- Importes/cuotas/primas → "Lo siento, no tengo acceso a esa información"
- Condiciones particulares → "Tomo nota y uno de mis compañeros se pondrá en contacto"
- Detalle de coberturas → "Le llamaremos con la respuesta"
- **CRÍTICO**: Si Carlos dice "no tengo acceso" → ES "LLam gestión comerc"

### ⚠️ **"REENVÍO AGENTES HUMANOS NO QUIERE IA"** ⚠️ CRÍTICO
**DETECTAR SI cliente rechaza explícitamente la IA:**
- Frases cliente: "no quiero hablar con una máquina", "quiero hablar con una persona", "pásame con un humano", "no quiero robot", "prefiero una persona real", "no me gusta la IA"
- Agente responde: "le paso con uno de nuestros compañeros", "claro, le transfiero", "en un momento le paso"
- **RESULTADO**: type: "Llamada gestión comercial", reason: "Reenvío agentes humanos no quiere IA"

### ⚠️ **"DATOS INCOMPLETOS"** ⚠️ CRÍTICO
**DETECTAR SI cliente no tiene datos necesarios para completar gestión:**
- Cliente dice: "no tengo", "no sé", "no me acuerdo", "no lo tengo aquí", "tengo que buscarlo", "no me acuerdo ahora mismo"
- Agente: "sin esos datos no puedo", "necesito que me proporcione", "vuelva a llamar cuando tenga"
- La gestión NO se puede completar en la misma llamada por falta de datos
- **RESULTADO**: type: "Modificación póliza emitida", reason: "Datos incompletos"

### ⚠️ **"REENVÍO AGENTES HUMANOS NO TOMADOR"** ⚠️ CRÍTICO
**DETECTAR SI llamante pregunta por póliza ajena:**
- Cliente menciona: "mi hermano", "mi esposa", "mi hijo", "mi padre", "mi madre", "la póliza de [nombre]", "es sobre la póliza del coche de [persona]"
- Cliente identificado ≠ Propietario de la póliza consultada
- Llamante pregunta por datos de póliza ajena
- **RESULTADO**: type: "Llamada gestión comercial", reason: "Reenvío agentes humanos no tomador"

### 📄 **SOLICITUD DUPLICADO PÓLIZA**:
- **Duplicado Tarjeta**: Tarjetas seguro decesos/salud
  ⚠️ **CRÍTICO**: Si cliente dice "duplicado" + "tarjeta" → ES "Duplicado Tarjeta" (incluso si agente menciona "dirección postal")
- **Email**: Envío por correo electrónico
- **Información recibos declaración renta**: Recibos para declaración renta
- ⚠️ **CORREO ORDINARIO**: SIEMPRE es "Reenvío agentes humanos" (solo si NO es tarjeta)

### 🚨 **OTROS SERVICIOS**:
- **Llamada asistencia en carretera** + **Siniestros**: Cliente necesita grúa
- **Retención cliente** + **Retención cliente**: Ver renovación o anular póliza
- **Baja cliente en BBDD** + **Baja Cliente BBDD**: No quiere más llamadas
- **Reclamación cliente regalo** + **Reclamación atención al cliente**: No recibió regalo prometido

## 🔄 **DETECCIÓN DE RELLAMADAS MEJORADA**:

**BUSCAR EN TOOL_RESULTS** la sección "incidencias":

EJEMPLO:
{
  "incidencias": [
    {
      "codigo_incidencia": "NG3291093",
      "tipo_de_incidencia": "Retención de Cliente Cartera", 
      "motivo_de_incidencia": "Retención de Cliente Cartera Llamada",
      "fecha_creacion_incidencia": "05.06.25",
      "poliza": "AU0420245310016",
      "ramo": "Coche"
    }
  ]
}

**FRASES QUE INDICAN RELLAMADA**:
- "sobre mi caso anterior", "mi incidencia", "el ticket que tengo abierto"
- Menciona código de incidencia específico (ej: "NG3291093")
- "me dijeron que me llamarían", "sobre mi gestión pendiente"
- "la retención que tengo", "mi modificación pendiente"

**SI ES RELLAMADA**:
- isFollowUp: true
- relatedTicketId: "código_incidencia" de las incidencias existentes
- createNewTicket: false (solo seguimiento) O true (seguimiento + nueva gestión)

## 🎯 **LÓGICA DE DECISIÓN**:

### **CLIENTE EXISTENTE + INCIDENCIAS ABIERTAS**:
1. **SI menciona incidencia existente** → RELLAMADA
2. **SI nueva gestión diferente** → NUEVO TICKET + usar su clientId/numeroPoliza
3. **SI solo seguimiento** → SOLO RELLAMADA

### **CLIENTE EXISTENTE + SIN INCIDENCIAS**:
1. **Modificación póliza** → usar numeroPoliza de detalle_polizas relacionada
2. **Nueva contratación** → usar clientId existente
3. **Gestión/Duplicado** → usar clientId + numeroPoliza si aplica

### **CLIENTE NUEVO/LEAD**:
1. **Solo "Nueva contratación"** disponible
2. **Crear cliente primero** → crear ticket con nuevo clientId

## 📞 RELLAMADAS:

**DETECCIÓN**: Solo si cliente menciona EXPLÍCITAMENTE:
- "tengo un caso abierto", "sobre mi incidencia anterior"
- "me dijeron que me llamarían"
- Menciona número de ticket específico

**TIPOS**:
- **Solo seguimiento**: createNewTicket: false
- **Seguimiento + nueva gestión**: createNewTicket: true

## 🎯 CONSISTENCIA DE DATOS:

### SI ES CLIENTE EXISTENTE (tool_results con data.clientes):
- ✅ Usar codigo_cliente del tool_result 
- ✅ Extraer numeroPoliza de detalle_polizas si es gestión sobre póliza existente
- ❌ NO crear cliente nuevo

### SI ES LEAD (tool_results con data.leads):
- ✅ Usar leadId del tool_result
- ✅ Crear cliente desde lead

### SI ES CLIENTE NUEVO (sin tool_results o sin matches):
- ✅ Crear cliente con datos extraídos de conversación

## 🎯 **EJEMPLOS CRÍTICOS:**

**EJEMPLO 1 - REENVÍO NO QUIERE IA (CORRECTO)** ⚠️:
USER: "No, pero en serio, por favor. ¿No me puedes pasar con una persona? De verdad, no quiero hablar con una máquina, quiero hablar con una persona."
AGENT: "Claro. En este caso le paso con uno de nuestros compañeros..."
**CLASIFICACIÓN**: type: "Llamada gestión comercial", reason: "Reenvío agentes humanos no quiere IA"

**EJEMPLO 2 - DATOS INCOMPLETOS (CORRECTO)** ⚠️:
USER: "Quiero cambiar el DNI de mi esposa en la póliza"
AGENT: "Necesito el DNI actual y el nuevo DNI"
USER: "No me acuerdo del DNI actual ahora mismo"
AGENT: "Sin el DNI actual no puedo hacer la modificación. Llame cuando lo tenga"
**CLASIFICACIÓN**: type: "Modificación póliza emitida", reason: "Datos incompletos"

**EJEMPLO 3 - REENVÍO NO TOMADOR (CORRECTO)** ⚠️:
USER: "Mi nombre es Javier, mi DNI es 03-473-587-N"
AGENT: "[Tool Call: identificar_cliente]" [encuentra a Javier]
USER: "Es sobre la póliza del coche de mi hermano. Se llama Jesús, el DNI de mi hermano es 03 472 505 B y necesito información sobre las coberturas"
**CLASIFICACIÓN**: type: "Llamada gestión comercial", reason: "Reenvío agentes humanos no tomador"
**RAZÓN**: Javier (identificado) ≠ Jesús (propietario póliza consultada)

**EJEMPLO 4 - CONSULTA CLIENTE RESUELTA (CORRECTO)**:
USER: "¿Cuál es mi número de póliza?"
AGENT: "Es AU0420225024935. Guarda este número: te lo pedirán en gestiones y partes"
**CLASIFICACIÓN**: type: "Llamada gestión comercial", reason: "Consulta cliente"

**EJEMPLO 5 - GESTIÓN NO RESUELTA - IMPORTES (CORRECTO)**:
USER: "quiero saber el importe de mis cuotas para las polizas"
AGENT: "Lo siento, no tengo acceso a esa información ahora mismo. Tomo nota y uno de mis compañeros se pondrá en contacto para revisarlo con usted"
**CLASIFICACIÓN**: type: "Llamada gestión comercial", reason: "LLam gestión comerc"
**RAZÓN**: Carlos NO puede proporcionar importes/cuotas específicos

**EJEMPLO 6 - GESTIÓN NO RESUELTA - COBERTURAS (CORRECTO)**:
USER: "¿Mi póliza cubre filtraciones de agua?"
AGENT: "Lo siento, no tengo acceso a esa información ahora mismo. Tomo nota y uno de mis compañeros se pondrá en contacto"
**CLASIFICACIÓN**: type: "Llamada gestión comercial", reason: "LLam gestión comerc"

**EJEMPLO 7 - DUPLICADO TARJETA CON DIRECCIÓN POSTAL (CORRECTO)** ⚠️:
USER: "Quiero recibir un duplicado de mi tarjeta"
AGENT: "Perfecto, he tomado nota... se lo enviamos a su dirección postal"
**CLASIFICACIÓN**: type: "Solicitud duplicado póliza", reason: "Duplicado Tarjeta"
**RAZÓN**: Cliente dice "duplicado" + "tarjeta" → PREVALECE sobre "dirección postal"

**EJEMPLO 8 - CAMBIO FECHA DE EFECTO CON TRANSFERENCIA (CORRECTO)** ⚠️:
USER: "quería cambiar la fecha a la que entra en vigor el seguro que he contratado"
AGENT: "entiendo que quieres cambiar la fecha de efecto de tu póliza... Para poder gestionarlo, necesito que me digas cuál es la nueva fecha"
USER: "para el 1 de noviembre"
AGENT: "he tomado nota de la nueva fecha... Un compañero revisará tu solicitud"
**CLASIFICACIÓN**: type: "Modificación póliza emitida", reason: "Cambio fecha de efecto"
**RAZÓN**: Cliente dice "cambiar" + "fecha" + "entra en vigor" → PREVALECE sobre "compañero revisará"

**EJEMPLO 9 - FRACCIONAMIENTO DE PAGO (CORRECTO)** ⚠️:
USER: "Tengo pago anual y me gustaría cambiarlo a mensual"
AGENT: "Perfecto, procederemos con el fraccionamiento de su póliza"
**CLASIFICACIÓN**: type: "Llamada gestión comercial", reason: "Cambio forma de pago"
**RAZÓN**: Fraccionamiento (anual → fraccionado) requiere gestión comercial

**EJEMPLO 10 - CONSOLIDACIÓN DE PAGO (CORRECTO)** ⚠️:
USER: "Tengo pago trimestral y quiero cambiar a pago anual"
AGENT: "Registramos el cambio a pago anual"
**CLASIFICACIÓN**: type: "Modificación póliza emitida", reason: "Cambio forma de pago"
**RAZÓN**: Consolidación (fraccionado → anual) es modificación directa de póliza

**EJEMPLO 11 - INCLUIR ASEGURADO (CORRECTO)** ⚠️:
USER: "Quiero añadir a mi hijo en la póliza de salud"
AGENT: "Perfecto, necesito los datos de su hijo para incluirlo"
USER: "Se llama Carlos García López, DNI 12345678A, nacido el 15 de marzo de 2010"
**CLASIFICACIÓN**: type: "Modificación póliza emitida", reason: "Modificación nº asegurados"
**RAZÓN**: Cliente dice "añadir" + "hijo" → ES "Modificación nº asegurados"

**EJEMPLO 12 - EXCLUIR ASEGURADO (CORRECTO)** ⚠️:
USER: "Necesito quitar a mi ex-esposa de la póliza de decesos"
AGENT: "Entiendo, procederemos a excluir a su ex-esposa de la póliza"
**CLASIFICACIÓN**: type: "Modificación póliza emitida", reason: "Modificación nº asegurados"
**RAZÓN**: Cliente dice "quitar" + "ex-esposa" → ES "Modificación nº asegurados"

**EJEMPLO 13 - MODIFICACIÓN COBERTURAS CON TRANSFERENCIA (CORRECTO)** ⚠️:
USER: "me gustaría modificar una parte de las coberturas y pasar de todo riesgo a terceros"
AGENT: "Perfecto, he tomado nota... Para poder gestionar el cambio de coberturas de todo riesgo a terceros, necesito saber desde qué fecha"
USER: "desde el 1 de noviembre"
AGENT: "he tomado nota... Un compañero revisará su solicitud"
**CLASIFICACIÓN**: type: "Modificación póliza emitida", reason: "Modificación coberturas"
**RAZÓN**: Cliente dice "modificar" + "coberturas" + "todo riesgo a terceros" → PREVALECE sobre "compañero revisará"

**EJEMPLO 14 - CESIÓN DERECHOS CON DATOS (CORRECTO)** ⚠️:
USER: "necesito una cesión de derechos para mi préstamo hipotecario"
AGENT: "Perfecto, necesito los datos del préstamo"
USER: "es un préstamo del Santander por 200.000 euros, número de expediente 12345678"
AGENT: "Perfecto, procederemos con la cesión"
**CLASIFICACIÓN**: type: "Modificación póliza emitida", reason: "Cesión de derechos"
**RAZÓN**: Cliente dice "cesión" + "préstamo hipotecario" Y proporciona datos específicos (banco, importe, número)

**EJEMPLO 15 - CESIÓN DERECHOS SIN DATOS (CORRECTO)** ⚠️:
USER: "me pide el banco una cesión de derechos para la hipoteca"
AGENT: "Necesito los datos del préstamo: entidad, importe y número de expediente"
USER: "no tengo esos datos, solo me dijeron que os llamara"
AGENT: "Debe contactar con su banco para obtener los datos y volver a llamar"
**CLASIFICACIÓN**: type: "Modificación póliza emitida", reason: "Cesión de derechos datos incompletos"
**RAZÓN**: Cliente dice "cesión" + "hipoteca" pero NO proporciona datos necesarios

## 📝 **CÓMO ESCRIBIR EL ANÁLISIS NARRATIVO:**

### **ESTRUCTURA OBLIGATORIA del processingRecommendation:**

**INICIO**: "El usuario contactó para [motivo principal de la llamada]."

**DESARROLLO**: "Durante la conversación, [describir cronológicamente qué pasó]:
- Primero [acción inicial del cliente]
- El agente [respuesta del agente] 
- Luego [siguiente desarrollo]
- [Mencionar datos proporcionados: nombre, DNI, email, etc.]"

**RESULTADO**: "[Explicar qué se logró o por qué se transfirió]:
- Se completó [gestión] exitosamente
- O: Se transfirió a agente humano porque [motivo específico]
- O: No se pudo completar porque [razón específica]"

**CLASIFICACIÓN**: "Por tanto, se clasifica como [tipo] + [motivo] debido a [justificación]."

### **EJEMPLOS DE NARRATIVAS:**

**EJEMPLO DUPLICADO EMAIL:**
"El usuario contactó para solicitar un duplicado de su póliza por correo electrónico. Durante la conversación, se identificó como Manuel García con DNI 12345678A y proporcionó su email manuel@email.com como destino para el envío. El agente confirmó sus datos y procedió a enviar el duplicado digitalmente. La gestión se completó exitosamente sin necesidad de intervención humana. Por tanto, se clasifica como Solicitud duplicado póliza + Email debido a que la gestión fue resuelta directamente por el agente virtual."

**EJEMPLO TRANSFERENCIA:**
"El usuario contactó para solicitar un duplicado de su póliza por correo postal. Durante la conversación, proporcionó sus datos de identificación correctamente, pero cuando especificó que prefería el envío por correo ordinario, el agente le informó que debía transferirlo a un compañero humano para gestionar este tipo de envío. La llamada se transfirió exitosamente. Por tanto, se clasifica como Llamada gestión comercial + Reenvío agentes humanos debido a que el duplicado por correo postal requiere gestión humana según protocolo."

**EJEMPLO MODIFICACIÓN:**
"El usuario contactó para cambiar su dirección postal en la póliza. Durante la conversación, se identificó correctamente como María López con DNI 98765432B y proporcionó su nueva dirección: Calle Nueva 123, 28001 Madrid. El agente verificó que era la tomadora de la póliza AU0420225024935 y registró el cambio exitosamente. La modificación quedó procesada para actualización en el sistema. Por tanto, se clasifica como Modificación póliza emitida + Cambio dirección postal debido a que se completó la gestión con todos los datos necesarios."

**EJEMPLO RECHAZO IA:**
"El usuario contactó inicialmente para consultar sobre su póliza, pero durante la conversación expresó claramente que no deseaba hablar con una máquina. Específicamente dijo 'no quiero hablar con un robot, pásame con una persona real'. El agente virtual respetó su preferencia y le transfirió inmediatamente con un compañero humano. La transferencia se realizó sin solicitar más información. Por tanto, se clasifica como Llamada gestión comercial + Reenvío agentes humanos no quiere IA debido a que el cliente rechazó explícitamente la atención automatizada."

**EJEMPLO CONSULTA RESUELTA:**
"El usuario contactó para conocer su número de póliza. Durante la conversación, se identificó como Juan Pérez con DNI 11223344C y el agente pudo localizar su información inmediatamente. El agente le proporcionó el número de póliza AU0420225024935 y le explicó que debía guardarlo para futuras gestiones. La consulta se resolvió completamente en la misma llamada. Por tanto, se clasifica como Llamada gestión comercial + Consulta cliente debido a que el agente virtual pudo responder la pregunta específica del cliente."

**EJEMPLO DATOS INCOMPLETOS:**
"El usuario contactó para cambiar el número de cuenta bancaria de su póliza. Durante la conversación, se identificó correctamente pero cuando el agente le solicitó el nuevo IBAN, el cliente indicó que no lo tenía disponible en ese momento y que tendría que buscarlo. El agente le explicó que sin el nuevo número de cuenta no podía procesar el cambio y le pidió que volviera a llamar cuando tuviera la información completa. Por tanto, se clasifica como Modificación póliza emitida + Datos incompletos debido a que la gestión no se pudo completar por falta de información necesaria."

## ⚠️ **REGLAS CRÍTICAS:**

1. **PRIORIZA EL RECHAZO A IA** - Si cliente dice "no quiero máquina/robot/IA" → ES "Reenvío agentes humanos no quiere IA"
2. **PRIORIZA DATOS INCOMPLETOS** - Si cliente no tiene datos necesarios → ES "Datos incompletos"
3. **PRIORIZA NO TOMADOR** - Si llamante identificado ≠ propietario póliza consultada → ES "Reenvío agentes humanos no tomador"
4. **DETECTA GESTIÓN NO RESUELTA** - Si Carlos dice "no tengo acceso" o "tomo nota" → ES "LLam gestión comerc"
5. **DETECTA MENCIONES DE TERCEROS** - Si dice "mi hermano/esposa/hijo" + "póliza/seguro" → ES "Reenvío agentes humanos no tomador"
6. **CONSULTAS DE IMPORTES/CUOTAS** - Si pregunta sobre importes y Carlos no puede responder → ES "LLam gestión comerc"
7. **NO INVENTES INFORMACIÓN** - Solo usa lo explícito en la conversación
8. **EL RESULTADO FINAL cuenta más** que la solicitud inicial
9. **Solo marca rellamada si el cliente menciona EXPLÍCITAMENTE una incidencia previa**
10. **ESCRIBE NARRATIVA FLUIDA** - Usa el formato narrativo obligatorio para processingRecommendation
11. **GENERA NOTAS CONCISAS** - Usa el formato específico para ticketNotes

## 📋 **CÓMO ESCRIBIR LAS NOTAS DEL TICKET (ticketNotes):**

### **FORMATO OBLIGATORIO:**
📋 [Tipo de gestión]
👤 Cliente: [Nombre Completo] (DNI: [dni])
🏠 Póliza: [número] ([ramo] - [compañía])
📝 Solicitud: [Descripción de lo que pidió el cliente y cómo se desarrolló la conversación]
[icono] [Información específica nueva]
📞 Conversación: [id] | Fecha: [fecha]

### **EJEMPLOS DE NOTAS:**

**Cambio fecha de efecto:**
📋 Cambio fecha de efecto
👤 Cliente: Manuel García López (DNI: 29755872J)
🏠 Póliza: AU0420245310016 (Coche - Reale)
📝 Solicitud: Cliente contacta para modificar la fecha de entrada en vigor del seguro que ha contratado. Indica que necesita cambiarla y proporciona la nueva fecha cuando se le solicita. El agente confirma la recepción de la solicitud.
📅 Nueva fecha solicitada: 1 de noviembre de 2024
📞 Conversación: conv_123 | Fecha: 09/10/2025

**Cambio cuenta bancaria:**
📋 Cambio cuenta bancaria
👤 Cliente: María López García (DNI: 12345678A)
🏠 Póliza: HO0420225024935 (Hogar - Mapfre)
📝 Solicitud: Cliente llama para cambiar la cuenta bancaria de domiciliación de su póliza. Proporciona el nuevo IBAN completo y confirma que es la cuenta donde desea que se carguen los recibos.
🏦 Nueva cuenta: ES91 2100 0418 4502 0005 1332
📞 Conversación: conv_456 | Fecha: 09/10/2025

**Duplicado tarjeta:**
📋 Duplicado tarjeta
👤 Cliente: Juan Pérez Martín (DNI: 87654321B)
🏠 Póliza: DE0420225024935 (Decesos - Reale)
📝 Solicitud: Cliente solicita el envío de un duplicado de su tarjeta de seguro de decesos. Confirma sus datos y dirección para el envío.
💳 Solicita duplicado tarjeta de decesos
📞 Conversación: conv_789 | Fecha: 09/10/2025

**Modificación número de asegurados:**
📋 Modificación nº asegurados
👤 Cliente: María González López (DNI: 11223344C)
🏠 Póliza: SA0420225024935 (Salud - Mapfre)
📝 Solicitud: Cliente contacta para incluir a su hijo recién nacido en la póliza de salud familiar. Proporciona todos los datos necesarios del menor y confirma que desea la cobertura desde el nacimiento.
👥 Incluir asegurado: Carlos González Martín (DNI: 55667788D, nacido 15/03/2024)
📞 Conversación: conv_101 | Fecha: 09/10/2025

**Modificación coberturas:**
📋 Modificación coberturas
👤 Cliente: Manuel Barrera López (DNI: 29755872J)
🏠 Póliza: AU0420245310016 (Coche - Reale)
📝 Solicitud: Cliente solicita modificar las coberturas de su póliza de coche, específicamente cambiar de todo riesgo a terceros. Proporciona la fecha desde la cual desea que aplique el cambio y el agente registra la solicitud para procesamiento.
🛡️ Cambio cobertura: De todo riesgo a terceros (desde 01/11/2024)
📞 Conversación: conv_202 | Fecha: 09/10/2025

**Cesión de derechos:**
📋 Cesión de derechos
👤 Cliente: Ana Martín García (DNI: 44556677B)
🏠 Póliza: HO0420225024935 (Hogar - Mapfre)
📝 Solicitud: Cliente contacta para tramitar cesión de derechos de su póliza de hogar para garantizar préstamo hipotecario. Proporciona todos los datos necesarios del préstamo y la entidad bancaria para proceder con la cesión.
🏦 Entidad: Banco Santander - Préstamo 200.000€ (Exp: 12345678)
📞 Conversación: conv_303 | Fecha: 09/10/2025

**Cesión de derechos datos incompletos:**
📋 Cesión de derechos datos incompletos
👤 Cliente: Pedro López Ruiz (DNI: 33445566A)
🏠 Póliza: HO0420225024936 (Hogar - Reale)
📝 Solicitud: Cliente contacta solicitando cesión de derechos para préstamo hipotecario pero no dispone de los datos necesarios del préstamo. El agente le indica que debe contactar con su banco para obtener la información completa y volver a llamar.
⚠️ Faltan datos: Entidad bancaria, importe del préstamo, número de expediente
📞 Conversación: conv_404 | Fecha: 09/10/2025

---

**CONVERSACIÓN CON TOOL_RESULTS:**
{{conversation}}

**RESPONDE EN ESTE JSON EXACTO:**
{
  "clientInfo": {
    "clientType": "existing|lead|new|unknown",
    "extractedData": {
      "nombreCompleto": "nombre completo extraído",
      "telefono": "teléfono en cualquier formato", 
      "email": "email si aparece",
      "numeroPoliza": "SOLO si es gestión sobre póliza existente",
      "codigoCliente": "SOLO si es cliente existente de tool_results",
      "direccion": "si se menciona",
      "ramo": "HOGAR|AUTO|VIDA|DECESOS|SALUD si es nueva contratación",
      "cuentaBancaria": "IBAN completo si se proporciona para cambio de cuenta"
    },
    "existingClientInfo": {
      "clientId": "codigo_cliente del tool_result",
      "clientName": "nombre_cliente del tool_result", 
      "numeroPoliza": "poliza principal del detalle_polizas",
      "codigoCliente": "codigo_cliente del tool_result"
    },
    "leadInfo": {
      "leadId": "idlead del tool_result",
      "campaignName": "campaña del tool_result",
      "ramo": "ramo del lead"
    }
  },
  "incidentAnalysis": {
    "primaryIncident": {
      "type": "Nueva contratación de seguros|Modificación póliza emitida|Llamada gestión comercial|Solicitud duplicado póliza|Llamada asistencia en carretera|Retención cliente|Baja cliente en BBDD|Reclamación cliente regalo",
      "reason": "Contratación Póliza|Póliza anterior suspensión de garantías|Atención al cliente - Modif datos póliza|Cambio nº de cuenta|Cambio fecha de efecto|Cambio forma de pago|Modificación nº asegurados|Cambio dirección postal|Modificación coberturas|Cesión de derechos|Cesión de derechos datos incompletos|Corrección datos erróneos en póliza|Datos incompletos|LLam gestión comerc|Consulta cliente|Reenvío siniestros|Reenvío agentes humanos|Reenvío agentes humanos no quiere IA|Reenvío agentes humanos no tomador|Duplicado Tarjeta|Email|Información recibos declaración renta|Siniestros|Retención cliente|Baja Cliente BBDD|Reclamación atención al cliente",
      "ramo": "HOGAR|AUTO|VIDA|DECESOS|SALUD|OTROS SOLO para nuevas contrataciones",
      "description": "descripción clara de qué necesita el cliente",
      "confidence": 0.95,
      "numeroPolizaAfectada": "SOLO si es gestión sobre póliza específica de detalle_polizas"
    },
    "followUpInfo": {
      "isFollowUp": false,
      "relatedTicketId": "codigo_incidencia de las incidencias existentes si es rellamada", 
      "createNewTicket": true,
      "followUpReason": "razón del seguimiento si aplica"
    }
  },
  "decisions": {
    "clientDecision": {
      "shouldCreateClient": "true si es new o lead, false si existing",
      "useExistingClient": "true si encontrado en tool_results",
      "useLeadData": "true si es lead de tool_results", 
      "clientDataSource": "tool_results|extracted|mixed"
    },
    "ticketDecision": {
      "shouldCreateTickets": true,
      "ticketCount": 1,
      "ticketsInfo": [{
        "type": "primary",
        "useClientId": "ID del cliente a usar (codigo_cliente o nuevo)",
        "numeroPoliza": "SOLO si gestión sobre póliza existente"
      }]
    },
    "followUpDecision": {
      "shouldCreateFollowUp": false,
      "followUpOnly": false,
      "relatedTicket": "ticket relacionado si aplica"
    },
    "priority": "high|medium|low",
    "requiresImmediate": false
  },
  "metadata": {
    "confidence": 0.95,
    "processingRecommendation": "NARRATIVA DETALLADA: El usuario contactó para [motivo principal]. Durante la conversación [describir qué pasó paso a paso]. [Explicar el resultado final y por qué se clasificó así]. [Mencionar datos relevantes extraídos].",
    "ticketNotes": "Notas descriptivas para el ticket: Incluir datos del cliente (nombre, DNI, póliza) + descripción de lo que solicitó y cómo se desarrolló la conversación + información específica nueva (fecha, cuenta, dirección, etc.) en formato claro y estructurado",
    "warnings": ["advertencias si las hay"],
    "toolResultsFound": true,
    "clientSearchResults": "resumen de lo encontrado en tool_results"
  }
}
`;

  /**
   * 🎯 MÉTODO PRINCIPAL: Analizar llamada completa incluyendo tool_results
   */
  async analyzeCall(transcripts: CallTranscript[], conversationId: string): Promise<CallDecision> {
    console.log(`🎯 [DECISION ENGINE] Analizando llamada completa: ${conversationId}`);
    
    try {
      // Formatear conversación completa incluyendo tool_results
      const conversation = this.formatConversationWithTools(transcripts);
      
      // Preparar prompt
      const prompt = this.COMPREHENSIVE_ANALYSIS_PROMPT.replace('{{conversation}}', conversation);
      
      console.log(`🧠 [DECISION ENGINE] Enviando análisis comprehensivo a Gemini...`);
      
      // Una sola llamada LLM que extrae TODA la información
      const decision = await generateStructuredResponse<CallDecision>(prompt);
      
      if (!decision) {
        throw new Error('No se recibió respuesta válida del LLM');
      }
      
      // Validar y normalizar respuesta
      const validatedDecision = this.validateAndNormalizeDecision(decision);
      
      console.log(`✅ [DECISION ENGINE] Análisis completado:`, {
        clientType: validatedDecision.clientInfo.clientType,
        hasExistingClient: validatedDecision.decisions.clientDecision.useExistingClient,
        hasLead: validatedDecision.decisions.clientDecision.useLeadData,
        shouldCreateClient: validatedDecision.decisions.clientDecision.shouldCreateClient,
        incidentType: validatedDecision.incidentAnalysis.primaryIncident.type,
        ticketCount: validatedDecision.decisions.ticketDecision.ticketCount,
        confidence: validatedDecision.metadata.confidence
      });
      
      return validatedDecision;
      
    } catch (error) {
      console.error(`❌ [DECISION ENGINE] Error en análisis:`, error);
      return this.createFallbackDecision(conversationId, transcripts);
    }
  }
  
  /**
   * 📝 Formatear conversación incluyendo tool_results (CRÍTICO)
   */
  private formatConversationWithTools(transcripts: CallTranscript[]): string {
    let formattedConversation = '';
    
    for (const transcript of transcripts) {
      // Agregar el mensaje de conversación
      formattedConversation += `${transcript.speaker.toUpperCase()}: ${transcript.message}\n`;
      
      // Agregar tool_results si existen
      if (transcript.tool_results && transcript.tool_results.length > 0) {
        formattedConversation += `TOOL_RESULTS:\n`;
        for (const toolResult of transcript.tool_results) {
          formattedConversation += `- Tool: ${toolResult.tool_name}\n`;
          formattedConversation += `- Result: ${toolResult.result_value}\n`;
          formattedConversation += `- Error: ${toolResult.is_error}\n`;
        }
        formattedConversation += `\n`;
      }
    }
    
    return formattedConversation;
  }
  
  /**
   * ✅ Validar y normalizar la respuesta del LLM
   */
  private validateAndNormalizeDecision(decision: any): CallDecision {
    const normalized: CallDecision = {
      clientInfo: {
        clientType: this.normalizeClientType(decision.clientInfo?.clientType),
        extractedData: decision.clientInfo?.extractedData || {}
      },
      incidentAnalysis: {
        primaryIncident: {
          type: decision.incidentAnalysis?.primaryIncident?.type || 'Llamada gestión comercial',
          reason: decision.incidentAnalysis?.primaryIncident?.reason || 'Consulta cliente',
          description: decision.incidentAnalysis?.primaryIncident?.description || 'Gestión telefónica',
          confidence: Math.max(0, Math.min(1, decision.incidentAnalysis?.primaryIncident?.confidence || 0.5))
        },
        followUpInfo: {
          isFollowUp: decision.incidentAnalysis?.followUpInfo?.isFollowUp || false,
          createNewTicket: decision.incidentAnalysis?.followUpInfo?.createNewTicket !== false, // Default true
          relatedTicketId: decision.incidentAnalysis?.followUpInfo?.relatedTicketId,
          followUpReason: decision.incidentAnalysis?.followUpInfo?.followUpReason
        }
      },
      decisions: {
        clientDecision: {
          shouldCreateClient: decision.decisions?.clientDecision?.shouldCreateClient || false,
          useExistingClient: decision.decisions?.clientDecision?.useExistingClient || false,
          useLeadData: decision.decisions?.clientDecision?.useLeadData || false,
          clientDataSource: this.normalizeDataSource(decision.decisions?.clientDecision?.clientDataSource)
        },
        ticketDecision: {
          shouldCreateTickets: decision.decisions?.ticketDecision?.shouldCreateTickets !== false, // Default true
          ticketCount: Math.max(1, decision.decisions?.ticketDecision?.ticketCount || 1),
          ticketsInfo: decision.decisions?.ticketDecision?.ticketsInfo || []
        },
        followUpDecision: {
          shouldCreateFollowUp: decision.decisions?.followUpDecision?.shouldCreateFollowUp || false,
          followUpOnly: decision.decisions?.followUpDecision?.followUpOnly || false,
          relatedTicket: decision.decisions?.followUpDecision?.relatedTicket
        },
        priority: this.normalizePriority(decision.decisions?.priority),
        requiresImmediate: decision.decisions?.requiresImmediate || false
      },
      metadata: {
        confidence: Math.max(0, Math.min(1, decision.metadata?.confidence || 0.5)),
        processingRecommendation: decision.metadata?.processingRecommendation || 'Procesar según análisis estándar',
        ticketNotes: decision.metadata?.ticketNotes,
        warnings: decision.metadata?.warnings || [],
        toolResultsFound: decision.metadata?.toolResultsFound || false,
        clientSearchResults: decision.metadata?.clientSearchResults
      }
    };
    
    // Agregar campos opcionales
    if (decision.clientInfo?.existingClientInfo) {
      normalized.clientInfo.existingClientInfo = decision.clientInfo.existingClientInfo;
    }
    
    if (decision.clientInfo?.leadInfo) {
      normalized.clientInfo.leadInfo = decision.clientInfo.leadInfo;
    }
    
    if (decision.incidentAnalysis?.primaryIncident?.ramo) {
      normalized.incidentAnalysis.primaryIncident.ramo = decision.incidentAnalysis.primaryIncident.ramo;
    }
    
    if (decision.incidentAnalysis?.primaryIncident?.numeroPolizaAfectada) {
      normalized.incidentAnalysis.primaryIncident.numeroPolizaAfectada = decision.incidentAnalysis.primaryIncident.numeroPolizaAfectada;
    }
    
    if (decision.incidentAnalysis?.secondaryIncidents) {
      normalized.incidentAnalysis.secondaryIncidents = decision.incidentAnalysis.secondaryIncidents;
    }
    
    return normalized;
  }
  
  /**
   * 🔄 Crear decisión fallback para casos de error
   */
  private createFallbackDecision(conversationId: string, transcripts?: CallTranscript[]): CallDecision {
    // Intentar detectar patrones básicos sin LLM
    let type = 'Llamada gestión comercial';
    let reason = 'Consulta cliente';
    let description = 'Gestión telefónica procesada con datos limitados';
    
    if (transcripts) {
      const fullText = transcripts
        .map(t => t.message)
        .join(' ')
        .toLowerCase();
      
      // Detectar cambio de fecha de efecto
      if (fullText.includes('cambiar') && 
          (fullText.includes('fecha') || fullText.includes('efecto') || fullText.includes('vigor'))) {
        type = 'Modificación póliza emitida';
        reason = 'Cambio fecha de efecto';
        description = 'Cliente solicita cambio de fecha de entrada en vigor';
      }
      // Detectar duplicado tarjeta
      else if (fullText.includes('duplicado') && fullText.includes('tarjeta')) {
        type = 'Solicitud duplicado póliza';
        reason = 'Duplicado Tarjeta';
        description = 'Cliente solicita duplicado de tarjeta de seguro';
      }
      // Detectar modificación de asegurados
      else if ((fullText.includes('incluir') || fullText.includes('añadir') || fullText.includes('agregar') || 
                fullText.includes('excluir') || fullText.includes('quitar') || fullText.includes('eliminar')) &&
               (fullText.includes('hijo') || fullText.includes('esposa') || fullText.includes('familiar') || 
                fullText.includes('asegurado') || fullText.includes('beneficiario'))) {
        type = 'Modificación póliza emitida';
        reason = 'Modificación nº asegurados';
        description = 'Cliente solicita incluir o excluir asegurados en la póliza';
      }
      // Detectar modificación de coberturas
      else if ((fullText.includes('cambiar') || fullText.includes('modificar')) &&
               (fullText.includes('cobertura') || fullText.includes('coberturas')) &&
               (fullText.includes('todo riesgo') || fullText.includes('terceros') || fullText.includes('ampliar') || fullText.includes('reducir'))) {
        type = 'Modificación póliza emitida';
        reason = 'Modificación coberturas';
        description = 'Cliente solicita cambiar las coberturas de su póliza';
      }
      // Detectar cesión de derechos con datos
      else if ((fullText.includes('cesión') || fullText.includes('ceder')) &&
               (fullText.includes('préstamo') || fullText.includes('hipoteca')) &&
               (fullText.includes('banco') || fullText.includes('euros') || fullText.includes('número') || fullText.includes('expediente'))) {
        type = 'Modificación póliza emitida';
        reason = 'Cesión de derechos';
        description = 'Cliente solicita cesión de derechos con datos del préstamo';
      }
      // Detectar cesión de derechos sin datos
      else if ((fullText.includes('cesión') || fullText.includes('ceder')) &&
               (fullText.includes('préstamo') || fullText.includes('hipoteca')) &&
               (fullText.includes('no tengo') || fullText.includes('no sé') || fullText.includes('dijeron que llamara'))) {
        type = 'Modificación póliza emitida';
        reason = 'Cesión de derechos datos incompletos';
        description = 'Cliente solicita cesión de derechos pero no tiene los datos necesarios';
      }
      // Detectar nueva contratación
      else if (fullText.includes('contratar') || fullText.includes('nueva contratación') || 
               fullText.includes('nuevo seguro')) {
        type = 'Nueva contratación de seguros';
        reason = 'Contratación Póliza';
        description = 'Cliente solicita contratar nuevo seguro';
      }
    }
    
    return {
      clientInfo: {
        clientType: 'unknown',
        extractedData: {}
      },
      incidentAnalysis: {
        primaryIncident: {
          type,
          reason,
          description,
          confidence: 0.3
        },
        followUpInfo: {
          isFollowUp: false,
          createNewTicket: true
        }
      },
      decisions: {
        clientDecision: {
          shouldCreateClient: false,
          useExistingClient: false,
          useLeadData: false,
          clientDataSource: 'extracted'
        },
        ticketDecision: {
          shouldCreateTickets: true,
          ticketCount: 1,
          ticketsInfo: []
        },
        followUpDecision: {
          shouldCreateFollowUp: false,
          followUpOnly: false
        },
        priority: 'medium',
        requiresImmediate: false
      },
      metadata: {
        confidence: 0.3,
        processingRecommendation: `Procesar como gestión estándar. Error en análisis para ${conversationId}`,
        warnings: ['Error en análisis LLM - usando valores por defecto'],
        toolResultsFound: false
      }
    };
  }
  
  /**
   * 🔧 Métodos auxiliares de normalización
   */
  private normalizeClientType(type: any): 'existing' | 'lead' | 'new' | 'unknown' {
    if (['existing', 'lead', 'new', 'unknown'].includes(type)) {
      return type;
    }
    return 'unknown';
  }
  
  private normalizeDataSource(source: any): 'extracted' | 'tool_results' | 'lead' | 'mixed' {
    if (['extracted', 'tool_results', 'lead', 'mixed'].includes(source)) {
      return source;
    }
    return 'extracted';
  }
  
  private normalizePriority(priority: any): 'low' | 'medium' | 'high' {
    if (['low', 'medium', 'high'].includes(priority)) {
      return priority;
    }
    return 'medium';
  }
}

// Exportar instancia singleton
export const callDecisionEngine = new CallDecisionEngine(); 
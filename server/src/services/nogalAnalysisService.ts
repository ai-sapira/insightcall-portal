import { generateStructuredResponse } from '../lib/gemini';
import type { TranscriptMessage } from '../types/common.types';
import type { NogalTipoCreacion, NogalClientData } from '../types/nogal_tickets.types';

export interface NogalIncidencia {
  tipo: string;
  motivo: string;
  ramo?: string;
  consideraciones?: string;
  necesidadCliente?: string;
  tipoCreacion: NogalTipoCreacion;
  esRellamada?: boolean; // NUEVO: indica si esta incidencia es una rellamada
  incidenciaRelacionada?: string; // NUEVO: ID de la incidencia existente si es rellamada
}

export interface NogalAnalysisResult {
  incidenciaPrincipal: NogalIncidencia;
  incidenciasSecundarias: NogalIncidencia[];
  confidence: number; // 0-1
  resumenLlamada: string;
  datosExtraidos: {
    [key: string]: any;
  };
  notasParaNogal?: string; // Notas específicas según reglas del CSV
  requiereTicket: boolean;
  prioridad: 'low' | 'medium' | 'high';
  // NUEVOS CAMPOS PARA MÚLTIPLES GESTIONES
  multipleGestiones?: boolean; // true si hay más de una gestión
  totalGestiones?: number; // número total de gestiones identificadas
}

class NogalAnalysisService {
  
  private readonly NOGAL_PROMPT = `
🎯 **ANALISTA EXPERTO DE SEGUROS NOGAL**

Analiza conversaciones telefónicas completas y clasifícalas según los tipos exactos de Nogal.

## 📋 **METODOLOGÍA (SIGUE ESTE ORDEN):**

1. **LEE TODA LA CONVERSACIÓN** de principio a fin
2. **DETECTA MÚLTIPLES GESTIONES** - ¿Hay varios temas independientes?
3. **IDENTIFICA QUÉ PASÓ REALMENTE** - ¿Se resolvió o no? ¿Por qué?
4. **CLASIFICA CADA GESTIÓN** según el resultado final, no la solicitud inicial

## 🔄 **DETECCIÓN DE MÚLTIPLES GESTIONES:**

### **SEÑALES DE MÚLTIPLES TEMAS:**
- **Conectores**: "Y también", "Además", "Por otro lado", "Otra cosa", "Aparte de eso"
- **Diferentes pólizas**: "del coche" + "del hogar", "auto" + "vida"
- **Diferentes tipos**: "contratar" + "modificar", "duplicado" + "cambio"
- **Múltiples solicitudes**: "quiero X, Y también Y, y además Z"

### **EJEMPLOS DE MÚLTIPLES GESTIONES:**
**EJEMPLO MÚLTIPLE 1:**
USER: "Quiero cambiar mi cuenta bancaria Y también el duplicado del hogar por email"
→ GESTIÓN 1: "Modificación póliza emitida" + "Cambio nº de cuenta"
→ GESTIÓN 2: "Solicitud duplicado póliza" + "Email"

**EJEMPLO MÚLTIPLE 2:**
USER: "Necesito contratar un seguro de vida Y cambiar la dirección del coche"
→ GESTIÓN 1: "Nueva contratación de seguros" + "Contratación Póliza" + Ramo: "VIDA"
→ GESTIÓN 2: "Modificación póliza emitida" + "Cambio dirección postal"

### **REGLAS PARA MÚLTIPLES GESTIONES:**
1. **Cada gestión independiente** = Un ticket separado
2. **Aplicar jerarquía de prioridad** a cada gestión por separado
3. **⚠️ CASOS CRÍTICOS PREVALECEN** - Si hay rechazo IA, no tomador o datos incompletos → Solo crear ese ticket (anula múltiples gestiones)
4. **Gestiones sobre misma póliza** = Tickets separados pero relacionados
5. **Máximo 3 gestiones** - Si hay más, agrupar las menos importantes en "LLam gestión comerc"

### **EJEMPLOS DE PRIORIDAD EN MÚLTIPLES GESTIONES:**

**CASO CRÍTICO PREVALECE:**
USER: "No quiero hablar con máquina, quiero cambiar cuenta Y duplicado por email"
→ RESULTADO: Solo "Reenvío agentes humanos no quiere IA" (anula las otras gestiones)

**MÚLTIPLES GESTIONES NORMALES:**
USER: "Quiero cambiar mi cuenta bancaria Y también el duplicado por email"
→ GESTIÓN 1: "Modificación póliza emitida" + "Cambio nº de cuenta"
→ GESTIÓN 2: "Solicitud duplicado póliza" + "Email"

## 🎯 **TIPOS PRINCIPALES:**


## 🔄 **TRANSFERENCIAS A AGENTES HUMANOS** ⚠️ TODOS CREAN TICKET

### **REENVÍO AGENTES HUMANOS NO QUIERE IA** ⚠️ ESPECÍFICO
Cliente RECHAZA explícitamente hablar con IA:
- Frases cliente: "no quiero hablar con una máquina", "quiero hablar con una persona", "pásame con un humano", "no quiero robot", "prefiero una persona real", "no me gusta la IA"
- Agente responde: "le paso con uno de nuestros compañeros", "claro, le transfiero", "en un momento le paso"
- **Tipo**: "Llamada gestión comercial" + **Motivo**: "Reenvío agentes humanos no quiere IA"

### **REENVÍO AGENTES HUMANOS NO TOMADOR** ⚠️ ESPECÍFICO
Cliente llama por póliza de OTRA PERSONA:
- Frases cliente: "mi hermano", "mi esposa", "mi hijo", "mi padre", "mi madre", "la póliza de [nombre]", "es sobre la póliza del coche de [persona]"
- Cliente identificado ≠ Propietario de la póliza consultada
- Llamante pregunta por datos de póliza ajena
- **Tipo**: "Llamada gestión comercial" + **Motivo**: "Reenvío agentes humanos no tomador"

### **REENVÍO AGENTES HUMANOS** ⚠️ GENÉRICO
Otros casos que requieren transferencia:

**PAGO DE RECIBO:**
- Frases: "quiero pagar recibo", "tengo recibo pendiente", "pago atrasado"
- Agente: "le transfiero con atención al cliente"

**DUPLICADO POR CORREO ORDINARIO:**
- Frases: "duplicado por correo", "envío postal", "correo ordinario"
- Agente: "le paso con mis compañeros"

**NO ES CLIENTE:**
- Frases: "soy proveedor", "llamo de [compañía]", "para [trabajador específico]"
- Agente: "le paso con mis compañeros"

**ENERGÍA/SEGURIDAD:**
- Frases: "sobre energía", "seguridad", "servicios al margen de seguros"
- Agente: "le paso con mis compañeros"

**RECLAMACIÓN/QUEJA:**
- Frases: "quiero reclamar", "poner una queja", "estoy descontento"
- Agente: "le paso con mis compañeros"

**COMUNICACIÓN NO ENTENDIDA:**
- Frases: "recibí email/SMS", "no entiendo comunicación", "me genera dudas"
- Agente: "le paso con mis compañeros"

**TEMAS PROHIBIDOS:**
- Frases: "cripto", "inversiones", "hipotecas", "fiscalidad", "política", "deudas"
- Agente: "derivo a agente humano"

**TODOS ESTOS CASOS:**
- **Tipo**: "Llamada gestión comercial" + **Motivo**: "Reenvío agentes humanos"

### ⚠️ **REGLA SIMPLE: SI TRANSFIERE = REENVÍO AGENTES HUMANOS**
**Cualquier caso donde el agente dice "le paso con mis compañeros" o "le transfiero":**
- **SIEMPRE** crear: "Llamada gestión comercial" + "Reenvío agentes humanos"
- **NO importa** el motivo original (pago recibo, correo ordinario, etc.)
- **La transferencia** es lo que determina el tipo de ticket

### **DATOS INCOMPLETOS** ⚠️ CRÍTICO
Cliente solicita algo pero NO tiene la información necesaria:
- Cliente dice: "no tengo", "no sé", "no me acuerdo", "no lo tengo aquí", "tengo que buscarlo", "no me acuerdo ahora mismo"
- Agente: "sin esos datos no puedo", "necesito que me proporcione", "vuelva a llamar cuando tenga"
- La gestión NO se puede completar en la misma llamada por falta de datos
- **Tipo**: "Modificación póliza emitida" + **Motivo**: "Datos incompletos"

### **CONSULTA CLIENTE (RESUELTA DIRECTAMENTE)**
Carlos SÍ puede y responde completamente a consultas específicas permitidas:
- ✅ Pregunta sobre fecha de efecto → Carlos responde con fecha específica
- ✅ Pregunta sobre número de póliza → Carlos proporciona el número
- ✅ Pregunta sobre compañía → Carlos indica la compañía
- ✅ Pregunta sobre forma de pago → Carlos explica SEPA/tarjeta
- ✅ Pregunta sobre próximo recibo → Carlos indica mes de renovación
- **Tipo**: "Llamada gestión comercial" + **Motivo**: "Consulta cliente"
- **IMPORTANTE**: Aunque la consulta se resuelva en la llamada, SÍ se debe crear ticket para registro

### **GESTIÓN COMERCIAL NO RESUELTA**
Carlos NO puede resolver consultas fuera de su alcance:
- ❌ Agente: "Lo siento, no tengo acceso a esa información ahora mismo"
- ❌ Agente: "Tomo nota y uno de mis compañeros se pondrá en contacto"
- ❌ Consultas sobre: condiciones particulares, detalle coberturas, **IMPORTES/CUOTAS/PRIMAS**, etc.
- **CRÍTICO**: Si Carlos NO puede dar la respuesta específica → ES "LLam gestión comerc"
- **Tipo**: "Llamada gestión comercial" + **Motivo**: "LLam gestión comerc"

## 🏗️ **NUEVA CONTRATACIÓN DE SEGUROS**

### **CONTRATACIÓN PÓLIZA**
Cliente quiere contratar un seguro nuevo sin incidencias pendientes:
- Frases: "nueva contratación", "quiero contratar", "necesito un seguro"
- Agente: "un compañero se pondrá en contacto para presupuesto"
- **Tipo**: "Nueva contratación de seguros" + **Motivo**: "Contratación Póliza" + **Ramo**: según tipo

### **PÓLIZA ANTERIOR SUSPENSIÓN DE GARANTÍAS**
Cliente quiere contratar usando reserva de prima:
- Frases: "tengo suspensión de garantías", "reserva de prima", "póliza suspendida"
- **Tipo**: "Nueva contratación de seguros" + **Motivo**: "Póliza anterior suspensión de garantías"

## 🔧 **MODIFICACIÓN PÓLIZA EMITIDA**

### **ATENCIÓN AL CLIENTE - MODIF DATOS PÓLIZA**
Cliente quiere modificar datos que no afectan prima:
- Frases: "cambiar nombre", "modificar apellido", "corregir DNI"
- **Tipo**: "Modificación póliza emitida" + **Motivo**: "Atención al cliente - Modif datos póliza"

### **CAMBIO Nº DE CUENTA**
Cliente quiere cambiar IBAN para domiciliación:
- Frases: "cambiar cuenta bancaria", "nuevo IBAN", "modificar domiciliación"
- **Tipo**: "Modificación póliza emitida" + **Motivo**: "Cambio nº de cuenta"

### **CAMBIO FECHA DE EFECTO**
Cliente quiere modificar fecha de entrada en vigor:
- Frases: "cambiar fecha de efecto", "modificar fecha entrada vigor", "cambiar la fecha", "fecha a la que entra en vigor", "fecha de entrada en vigor", "cambiar fecha efecto", "modificar fecha", "nueva fecha", "cambiar cuando entra en vigor", "fecha de inicio", "fecha de vigencia"
- **CRÍTICO**: Si cliente menciona "cambiar" + "fecha" + contexto de póliza → ES "Cambio fecha de efecto" (prevalece sobre gestión comercial)
- **Tipo**: "Modificación póliza emitida" + **Motivo**: "Cambio fecha de efecto"

### **CAMBIO FORMA DE PAGO - REGLAS ESPECÍFICAS** ⚠️ CRÍTICO

**1. FRACCIONAMIENTO (anual → fraccionado):**
- Frases: "tengo pago anual", "quiero mensual/trimestral/semestral", "fraccionar el pago"
- **Tipo**: "Llamada gestión comercial" + **Motivo**: "Cambio forma de pago"
- **Razón**: Fraccionamiento requiere gestión comercial

**2. CONSOLIDACIÓN (fraccionado → anual):**
- Frases: "tengo pago mensual/trimestral/semestral", "quiero pago anual", "cambiar a anual"
- **Tipo**: "Modificación póliza emitida" + **Motivo**: "Cambio forma de pago"
- **Razón**: Consolidación es modificación directa de póliza

**3. CAMBIO ENTRE FRACCIONADOS (mensual ↔ trimestral ↔ semestral):**
- Frases: "de trimestral a semestral", "de mensual a trimestral"
- **Tipo**: "Modificación póliza emitida" + **Motivo**: "Cambio forma de pago"
- **Razón**: Cambio entre fraccionados es modificación directa

### **MODIFICACIÓN Nº ASEGURADOS** ⚠️ CRÍTICO
Cliente quiere incluir/excluir asegurados en la póliza:

**INCLUIR ASEGURADOS:**
- Frases: "añadir mi hijo", "incluir asegurado", "meter en la póliza", "agregar a mi esposa", "incluir a mi pareja", "añadir beneficiario", "poner en el seguro", "incluir familiar", "agregar hijo", "añadir cónyuge", "incluir en cobertura"
- Datos necesarios: Nombre, apellidos, DNI, fecha nacimiento del nuevo asegurado

**EXCLUIR ASEGURADOS:**
- Frases: "quitar de la póliza", "excluir asegurado", "eliminar beneficiario", "sacar del seguro", "dar de baja", "quitar cobertura", "excluir familiar", "eliminar de la póliza", "retirar asegurado"
- Datos necesarios: Nombre y apellidos del asegurado a excluir

**CAMBIAR ASEGURADOS:**
- Frases: "cambiar beneficiario", "sustituir asegurado", "reemplazar en la póliza"
- Datos necesarios: Datos del asegurado a excluir + datos del nuevo asegurado

**CRÍTICO**: Si cliente menciona "incluir/excluir/añadir/quitar" + "hijo/esposa/familiar/asegurado" → ES "Modificación nº asegurados" (prevalece sobre otras clasificaciones)
- **Tipo**: "Modificación póliza emitida" + **Motivo**: "Modificación nº asegurados"

### **CAMBIO DIRECCIÓN POSTAL**
Cliente quiere cambiar dirección postal:
- Frases: "cambiar dirección", "nueva dirección postal", "modificar domicilio"
- **Tipo**: "Modificación póliza emitida" + **Motivo**: "Cambio dirección postal"

### **MODIFICACIÓN COBERTURAS** ⚠️ CRÍTICO
Cliente quiere cambiar coberturas de su póliza:

**CAMBIOS DE COBERTURA ESPECÍFICOS:**
- Frases: "cambiar cobertura", "modificar coberturas", "de todo riesgo a terceros", "pasar a terceros", "quitar todo riesgo", "cambiar a terceros", "reducir cobertura", "ampliar cobertura", "incluir cobertura", "excluir cobertura", "modificar una parte de las coberturas", "cambiar el tipo de cobertura"

**TIPOS COMUNES:**
- Todo riesgo → Terceros: "pasar de todo riesgo a terceros", "cambiar a terceros"
- Terceros → Todo riesgo: "pasar a todo riesgo", "ampliar cobertura"
- Añadir coberturas: "incluir lunas", "añadir robo", "incluir incendio"
- Quitar coberturas: "quitar lunas", "excluir robo", "reducir cobertura"

**CRÍTICO**: Si cliente menciona "cambiar/modificar" + "cobertura/coberturas" + especifica el cambio → ES "Modificación coberturas" (prevalece sobre gestión comercial)
- **Tipo**: "Modificación póliza emitida" + **Motivo**: "Modificación coberturas"

### **CESIÓN DE DERECHOS DATOS INCOMPLETOS** ⚠️ CRÍTICO
Cliente solicita cesión para préstamo hipotecario pero NO tiene datos necesarios:

**FRASES CLIENTE:**
- "cesión de derechos", "cesión derechos", "ceder derechos", "cesión para préstamo", "cesión hipotecaria"
- "préstamo hipotecario", "hipoteca", "préstamo del banco", "crédito hipotecario"
- "me pide el banco", "necesita el banco", "para la hipoteca", "para el préstamo"

**SITUACIONES SIN DATOS:**
- Cliente: "no tengo los datos", "no sé qué necesitan", "no me han dado información"
- Cliente: "solo me dijeron que llamara", "el banco me dijo que os llamara"
- Agente: "necesito datos del préstamo", "debe contactar con su banco", "vuelva a llamar cuando tenga los datos"

**DATOS NECESARIOS FALTANTES:**
- Entidad bancaria, importe del préstamo, número de préstamo, datos del acreedor

**CRÍTICO**: Si cliente menciona "cesión" + "préstamo/hipoteca" pero NO proporciona datos específicos → ES "Cesión de derechos datos incompletos"
- **Tipo**: "Modificación póliza emitida" + **Motivo**: "Cesión de derechos datos incompletos"

### **CESIÓN DE DERECHOS** ⚠️ CRÍTICO
Cliente solicita cesión con datos completos del préstamo:

**FRASES CLIENTE:**
- "cesión de derechos", "cesión derechos", "ceder derechos", "cesión para préstamo", "cesión hipotecaria"
- "préstamo hipotecario", "hipoteca", "préstamo del banco", "crédito hipotecario"

**SITUACIONES CON DATOS COMPLETOS:**
- Cliente proporciona: entidad bancaria, importe, número de préstamo
- Cliente: "el préstamo es de [banco] por [importe]", "número de préstamo [número]"
- Agente: "perfecto, con estos datos procederemos", "tramitaremos la cesión"

**DATOS NECESARIOS PROPORCIONADOS:**
- Entidad bancaria, importe del préstamo, número de préstamo/expediente, datos del acreedor

**CRÍTICO**: Si cliente menciona "cesión" + "préstamo/hipoteca" Y proporciona datos específicos → ES "Cesión de derechos"
- **Tipo**: "Modificación póliza emitida" + **Motivo**: "Cesión de derechos"

### **CORRECCIÓN DATOS ERRÓNEOS EN PÓLIZA**
Cliente detecta errores en su póliza:
- Frases: "hay un error en mi póliza", "datos incorrectos", "corregir información"
- **Tipo**: "Modificación póliza emitida" + **Motivo**: "Corrección datos erróneos en póliza"

## 🚨 **OTROS SERVICIOS**

### **LLAMADA ASISTENCIA EN CARRETERA**
Cliente necesita grúa o asistencia:
- Frases: "necesito grúa", "tengo avería", "accidente", "asistencia carretera"
- Agente: "le transfiero con siniestros"
- **Tipo**: "Llamada asistencia en carretera" + **Motivo**: "Siniestros"

### **RETENCIÓN CLIENTE**
Cliente quiere anular o dar de baja póliza:
- Frases: "quiero anular", "dar de baja", "cancelar póliza", "no renovar"
- **Tipo**: "Retención cliente" + **Motivo**: "Retención cliente"

### **BAJA CLIENTE EN BBDD**
Cliente no quiere recibir más llamadas:
- Frases: "no quiero llamadas", "eliminar mis datos", "baja de base de datos"
- **Tipo**: "Baja cliente en BBDD" + **Motivo**: "Baja Cliente BBDD"

### **RECLAMACIÓN CLIENTE REGALO**
Cliente reclama regalo no recibido:
- Frases: "no recibí regalo", "regalo prometido", "regalo por recomendación"
- **Tipo**: "Reclamación cliente regalo" + **Motivo**: "Reclamación atención al cliente"

### **REENVÍO SINIESTROS**
Cliente expone tema que corresponde a siniestros:
- Frases: "siniestro", "parte", "daños", "accidente ya ocurrido"
- Agente: "le transfiero con siniestros"
- **Tipo**: "Llamada gestión comercial" + **Motivo**: "Reenvío siniestros"

## 📄 **SOLICITUD DUPLICADO PÓLIZA**

### **DUPLICADO POR EMAIL**
Cliente solicita duplicado por correo electrónico:
- Frases: "duplicado por email", "envío electrónico"
- **Tipo**: "Solicitud duplicado póliza" + **Motivo**: "Email"

### **DUPLICADO TARJETA**
Cliente solicita duplicado de tarjetas de seguro:
- Frases: "duplicado tarjeta", "duplicado de tarjeta", "duplicado de mi tarjeta", "tarjeta decesos", "tarjeta salud", "recibir duplicado tarjeta", "envío de tarjeta", "copia de tarjeta"
- **CRÍTICO**: Si cliente menciona "duplicado" + "tarjeta" → ES "Duplicado Tarjeta" (incluso si agente dice "dirección postal")
- **Tipo**: "Solicitud duplicado póliza" + **Motivo**: "Duplicado Tarjeta"

### **INFORMACIÓN RECIBOS DECLARACIÓN RENTA**
Cliente solicita recibos para declaración fiscal:
- Frases: "recibos para renta", "declaración fiscal", "ejercicio anterior"
- **Tipo**: "Solicitud duplicado póliza" + **Motivo**: "Información recibos declaración renta"


## 📋 **INFORMACIÓN DEL CLIENTE:**
{{clientData}}

## 🏢 **EXTRACCIÓN DE DATOS DEL CLIENTE:**

**EXTRAE TODA LA INFORMACIÓN del cliente que aparezca en la conversación:**
- **nombreCliente**: Nombre completo si se menciona ("Me llamo Juan Pérez")
- **telefono**: Cualquier teléfono mencionado (formatos: 666123456, 666 123 456, +34 666123456)
- **email**: Cualquier email mencionado
- **numeroPoliza**: Si menciona número de póliza existente
- **cuentaBancaria**: CRÍTICO - Si proporciona nueva cuenta bancaria/IBAN (ES12 3456 7890 1234 5678 9012)
- **direccion**: Si menciona dirección nueva

**PATRONES DE CUENTAS BANCARIAS A DETECTAR:**
- IBAN completo: ES12 3456 7890 1234 5678 9012
- IBAN sin espacios: ES1234567890123456789012
- Número de cuenta: 1234-5678-90-1234567890
- Menciones: "mi nueva cuenta es...", "cambiar a la cuenta...", "el IBAN es..."

**IMPORTANTE**: Si hay herramientas con resultados de búsqueda de leads, incluir esa información.

## 🎯 **EJEMPLOS CRÍTICOS:**

**EJEMPLO 1 - REENVÍO NO QUIERE IA (CORRECTO)** ⚠️:
USER: "No, pero en serio, por favor. ¿No me puedes pasar con una persona? De verdad, no quiero hablar con una máquina, quiero hablar con una persona."
AGENT: "Claro. En este caso le paso con uno de nuestros compañeros..."
**CLASIFICACIÓN**: "Llamada gestión comercial" + "Reenvío agentes humanos no quiere IA"

**EJEMPLO 2 - DATOS INCOMPLETOS (CORRECTO)** ⚠️:
USER: "Quiero cambiar el DNI de mi esposa en la póliza"
AGENT: "Necesito el DNI actual y el nuevo DNI"
USER: "No me acuerdo del DNI actual ahora mismo"
AGENT: "Sin el DNI actual no puedo hacer la modificación. Llame cuando lo tenga"
**CLASIFICACIÓN**: "Modificación póliza emitida" + "Datos incompletos"

**EJEMPLO 3 - REENVÍO NO TOMADOR (CORRECTO)** ⚠️:
USER: "Mi nombre es Javier, mi DNI es 03-473-587-N"
AGENT: "[Tool Call: identificar_cliente]" [encuentra a Javier]
USER: "Es sobre la póliza del coche de mi hermano. Se llama Jesús, el DNI de mi hermano es 03 472 505 B y necesito información sobre las coberturas"
**CLASIFICACIÓN**: "Llamada gestión comercial" + "Reenvío agentes humanos no tomador"
**RAZÓN**: Javier (identificado) ≠ Jesús (propietario póliza consultada)

**EJEMPLO 4 - NUEVA CONTRATACIÓN (CORRECTO)**:
USER: "¿Es para una nueva contratación de una póliza de hogar?"
AGENT: "para una nueva contratación de una póliza de hogar, un compañero se pondrá en contacto"
**CLASIFICACIÓN**: "Nueva contratación de seguros" + "Contratación Póliza" + Ramo: "HOGAR"

**EJEMPLO 5 - CONSULTA CLIENTE RESUELTA (CORRECTO)**:
USER: "¿Cuál es mi número de póliza?"
AGENT: "Es AU0420225024935. Guarda este número: te lo pedirán en gestiones y partes"
**CLASIFICACIÓN**: "Llamada gestión comercial" + "Consulta cliente"

**EJEMPLO 6 - GESTIÓN NO RESUELTA - IMPORTES (CORRECTO)**:
USER: "quiero saber el importe de mis cuotas para las polizas"
AGENT: "Lo siento, no tengo acceso a esa información ahora mismo. Tomo nota y uno de mis compañeros se pondrá en contacto para revisarlo con usted"
**CLASIFICACIÓN**: "Llamada gestión comercial" + "LLam gestión comerc"
**RAZÓN**: Carlos NO puede proporcionar importes/cuotas específicos

**EJEMPLO 7 - GESTIÓN NO RESUELTA - COBERTURAS (CORRECTO)**:
USER: "¿Mi póliza cubre filtraciones de agua?"
AGENT: "Lo siento, no tengo acceso a esa información ahora mismo. Tomo nota y uno de mis compañeros se pondrá en contacto"
**CLASIFICACIÓN**: "Llamada gestión comercial" + "LLam gestión comerc"

**EJEMPLO 8 - FRACCIONAMIENTO ANUAL (CORRECTO)** ⚠️ CRÍTICO:
USER: "Tengo pago anual y quiero cambiar a mensual"
AGENT: "Perfecto, procederemos con el fraccionamiento de su póliza"
**CLASIFICACIÓN**: "Llamada gestión comercial" + "Cambio forma de pago"
**RAZÓN**: Fraccionamiento desde anual requiere gestión comercial

**EJEMPLO 9 - CONSOLIDACIÓN A ANUAL (CORRECTO)** ⚠️ CRÍTICO:
USER: "Tengo pago trimestral y quiero cambiar a anual"
AGENT: "Registramos el cambio a pago anual"
**CLASIFICACIÓN**: "Modificación póliza emitida" + "Cambio forma de pago"
**RAZÓN**: Consolidación (fraccionado → anual) es modificación directa

**EJEMPLO 10 - CAMBIO ENTRE FRACCIONADOS (CORRECTO)** ⚠️ CRÍTICO:
USER: "Tengo pago trimestral y quiero cambiar a semestral"
AGENT: "Registramos el cambio de periodicidad"
**CLASIFICACIÓN**: "Modificación póliza emitida" + "Cambio forma de pago"
**RAZÓN**: Cambio entre fraccionados es modificación directa

## ⚠️ **REGLAS CRÍTICAS DE CLASIFICACIÓN (ORDEN DE PRIORIDAD):**

### **FASE 1: CASOS CRÍTICOS (MÁXIMA PRIORIDAD)**
1. **RECHAZO A IA** - Si cliente dice "no quiero máquina/robot/IA" → "Reenvío agentes humanos no quiere IA"
2. **NO TOMADOR** - Si llamante identificado ≠ propietario póliza → "Reenvío agentes humanos no tomador"
3. **DATOS INCOMPLETOS** - Si cliente no tiene datos necesarios → "Datos incompletos"

### **FASE 2: TRANSFERENCIAS (SEGUNDA PRIORIDAD)**
4. **CUALQUIER TRANSFERENCIA** - Si agente dice "le paso/transfiero" → "Reenvío agentes humanos"
5. **ASISTENCIA CARRETERA** - Si necesita grúa → "Siniestros"

### **FASE 3: FRACCIONAMIENTO (TERCERA PRIORIDAD)**
6. **FRACCIONAMIENTO CRÍTICO** - Si pago anual → fraccionado → "Llamada gestión comercial"
7. **CAMBIO PAGO NORMAL** - Si no es desde anual → "Modificación póliza emitida"

### **FASE 4: CONSULTAS (CUARTA PRIORIDAD)**
8. **CONSULTA ESPECÍFICA** - Solo 5 consultas Y Carlos responde → "Consulta cliente"
9. **GESTIÓN NO RESUELTA** - Carlos dice "no tengo acceso" → "LLam gestión comerc"

### **FASE 5: GESTIONES NORMALES**
10. **NUEVA CONTRATACIÓN** - Cliente quiere contratar → "Nueva contratación de seguros"
11. **MODIFICACIONES** - Cambios en póliza → "Modificación póliza emitida"
    ⚠️ **PRIORIDAD FECHA**: Si menciona "cambiar" + "fecha" + contexto póliza → SIEMPRE "Cambio fecha de efecto" (prevalece sobre gestión comercial)
12. **DUPLICADOS** - Solo email, tarjeta, recibos → "Solicitud duplicado póliza"
    ⚠️ **PRIORIDAD TARJETA**: Si menciona "duplicado" + "tarjeta" → SIEMPRE "Duplicado Tarjeta" (prevalece sobre correo postal)

### **REGLAS GENERALES:**
- **NO INVENTES INFORMACIÓN** - Solo usa lo explícito en la conversación
- **EL RESULTADO FINAL cuenta más** que la solicitud inicial
- **APLICA LA REGLA MÁS ESPECÍFICA** - Si aplican múltiples casos, usar el de mayor prioridad
- **Solo marca rellamada si el cliente menciona EXPLÍCITAMENTE una incidencia previa**

## 📞 **RELLAMADAS (SOLO SI ES EXPLÍCITO):**

**MARCAR esRellamada: true ÚNICAMENTE SI:**
- Cliente dice LITERALMENTE: "tengo un caso abierto", "sobre mi incidencia", "me dijeron que me llamarían"
- Se menciona un número/código de incidencia específico
- **NO assumes rellamadas si no son explícitas**

CONVERSACIÓN A ANALIZAR:
{{conversation}}

## 📋 **FORMATO DE RESPUESTA:**

### **PARA UNA SOLA GESTIÓN:**
{
  "incidenciaPrincipal": {
    "tipo": "tipo exacto de la lista",
    "motivo": "motivo exacto de la lista", 
    "ramo": "solo para nueva contratación: HOGAR|AUTO|VIDA|DECESOS|SALUD|VIAJE",
    "consideraciones": "notas específicas basadas en la conversación",
    "necesidadCliente": "qué necesita el cliente exactamente",
    "tipoCreacion": "Manual / Automática",
    "esRellamada": false,
    "incidenciaRelacionada": null
  },
  "incidenciasSecundarias": [],
  "multipleGestiones": false,
  "totalGestiones": 1,
  "confidence": 0.95,
  "resumenLlamada": "resumen breve de qué pasó en la conversación",
  "datosExtraidos": { ... },
  "notasParaNogal": "información específica para el ticket",
  "requiereTicket": true,
  "prioridad": "medium"
}

### **PARA MÚLTIPLES GESTIONES:**
{
  "incidenciaPrincipal": {
    "tipo": "tipo de la gestión más importante o primera",
    "motivo": "motivo de la gestión principal",
    "ramo": "si aplica",
    "consideraciones": "notas de la gestión principal",
    "necesidadCliente": "necesidad principal del cliente",
    "tipoCreacion": "Manual / Automática"
  },
  "incidenciasSecundarias": [
    {
      "tipo": "tipo de la segunda gestión",
      "motivo": "motivo de la segunda gestión",
      "ramo": "si aplica",
      "consideraciones": "notas específicas de esta gestión",
      "necesidadCliente": "necesidad específica de esta gestión",
      "tipoCreacion": "Manual / Automática"
    }
  ],
  "multipleGestiones": true,
  "totalGestiones": 2,
  "confidence": 0.95,
  "resumenLlamada": "resumen de TODAS las gestiones realizadas",
  "datosExtraidos": {
    "nombreCliente": "nombre completo si se menciona explícitamente",
    "telefono": "teléfono si se menciona en cualquier formato",
    "email": "email si se menciona",
    "numeroPoliza": "número de póliza si cliente tiene y se habla de gestión existente",
    "cuentaBancaria": "IBAN completo o número de cuenta si se proporciona para cambio",
    "direccion": "nueva dirección si se menciona",
    "leadInfo": {
      "isLead": false,
      "idLead": "ID del lead si se encontró en herramientas",
      "campaña": "campaña del lead si aplica",
      "ramo": "ramo del lead si aplica"
    }
  },
  "notasParaNogal": "información específica para TODOS los tickets",
  "requiereTicket": true,
  "prioridad": "prioridad más alta de todas las gestiones"
}
`;

  async analyzeCallForNogal(
    messages: TranscriptMessage[], 
    conversationId?: string,
    clientData?: NogalClientData
  ): Promise<NogalAnalysisResult> {
    try {
      console.log(`[NogalAnalysis] [SIMPLE] Analizando conversación ${conversationId || 'unknown'} con ${messages.length} mensajes`);
      
      // 🎯 FORMATEAR LA CONVERSACIÓN COMPLETA - La IA analizará TODO
      const conversation = messages
        .map(m => `${m.role.toUpperCase()}: ${m.message}`)
        .join('\n');

      // 🚀 SIMPLE: La IA analizará la conversación completa autónomamente
      // No necesitamos datos externos complejos - está todo en la transcripción
      const clientInfo = clientData ? this.formatClientDataForPrompt(clientData) : 
        'INFORMACIÓN DEL CLIENTE:\nAnalizar la transcripción para extraer datos del cliente.';

      const prompt = this.NOGAL_PROMPT
        .replace('{{conversation}}', conversation)
        .replace('{{clientData}}', clientInfo);

      console.log(`[NogalAnalysis] [SIMPLE] Enviando transcripción completa a Gemini para análisis autónomo`);

      const response = await generateStructuredResponse<NogalAnalysisResult>(prompt);
      
      if (!response || !response.incidenciaPrincipal) {
        throw new Error('Respuesta de Gemini inválida - falta incidenciaPrincipal');
      }

      // Normalizar y validar respuesta
      const result: NogalAnalysisResult = {
        incidenciaPrincipal: {
          tipo: response.incidenciaPrincipal.tipo || 'Llamada gestión comercial',
          motivo: response.incidenciaPrincipal.motivo || 'Consulta cliente',
          ramo: response.incidenciaPrincipal.ramo, // Gemini decide cuándo incluirlo
          consideraciones: response.incidenciaPrincipal.consideraciones,
          necesidadCliente: response.incidenciaPrincipal.necesidadCliente,
          tipoCreacion: response.incidenciaPrincipal.tipoCreacion || 'Manual / Automática',
          esRellamada: response.incidenciaPrincipal.esRellamada || false,
          incidenciaRelacionada: response.incidenciaPrincipal.incidenciaRelacionada
        },
        incidenciasSecundarias: response.incidenciasSecundarias || [],
        confidence: Math.max(0, Math.min(1, response.confidence || 0.8)),
        resumenLlamada: response.resumenLlamada || 'Llamada procesada sin resumen disponible',
        datosExtraidos: response.datosExtraidos || {},
        notasParaNogal: response.notasParaNogal,
        requiereTicket: response.requiereTicket !== false,
        prioridad: this.normalizePriority(response.prioridad),
        // NUEVOS CAMPOS PARA MÚLTIPLES GESTIONES
        multipleGestiones: response.multipleGestiones || false,
        totalGestiones: response.totalGestiones || 1
      };

      console.log(`[NogalAnalysis] [DEBUG] Análisis completado:`, {
        tipo: result.incidenciaPrincipal.tipo,
        motivo: result.incidenciaPrincipal.motivo,
        ramo: result.incidenciaPrincipal.ramo,
        numeroPoliza: result.datosExtraidos.numeroPoliza,
        confidence: result.confidence,
        esRellamada: result.incidenciaPrincipal.esRellamada
      });

      return result;
        
    } catch (error) {
      console.error('[NogalAnalysis] [DEBUG] Error en análisis:', error);
      
      // Resultado de fallback
      return {
        incidenciaPrincipal: {
          tipo: 'Llamada gestión comercial',
          motivo: 'Consulta cliente',
          tipoCreacion: 'Manual / Automática' as const,
          necesidadCliente: 'Consulta general no clasificada'
        },
        incidenciasSecundarias: [],
        confidence: 0.3,
        resumenLlamada: 'Error en análisis - requiere revisión manual',
        datosExtraidos: {},
        requiereTicket: false,
        prioridad: 'low' as const
      };
    }
  }

  /**
   * Formatea los datos del cliente para incluir en el prompt
   */
  private formatClientDataForPrompt(clientData: NogalClientData): string {
    let info = `INFORMACIÓN DEL CLIENTE:\n`;
    
    if (clientData.name) info += `- Nombre: ${clientData.name}\n`;
    if (clientData.dni) info += `- DNI: ${clientData.dni}\n`;
    if (clientData.phone) info += `- Teléfono: ${clientData.phone}\n`;
    if (clientData.email) info += `- Email: ${clientData.email}\n`;
    if (clientData.codigoCliente) info += `- Código Cliente: ${clientData.codigoCliente}\n`;
    
    if (clientData.polizas && clientData.polizas.length > 0) {
      info += `\nPÓLIZAS CONTRATADAS:\n`;
      clientData.polizas.forEach((poliza, index) => {
        info += `${index + 1}. Número: ${poliza.numero}, Ramo: ${poliza.ramo}, Estado: ${poliza.estado}, Compañía: ${poliza.compania}\n`;
        if (poliza.fechaEfecto) info += `   Fecha Efecto: ${poliza.fechaEfecto}\n`;
        if (poliza.mesVencimiento) info += `   Mes Vencimiento: ${poliza.mesVencimiento}\n`;
        if (poliza.importePoliza) info += `   Importe: ${poliza.importePoliza}\n`;
      });
    }
    
    if (clientData.incidenciasAbiertas && clientData.incidenciasAbiertas.length > 0) {
      info += `\nINCIDENCIAS ABIERTAS:\n`;
      clientData.incidenciasAbiertas.forEach((inc, index) => {
        info += `${index + 1}. Código: ${inc.codigo}, Tipo: ${inc.tipo}, Motivo: ${inc.motivo}\n`;
        if (inc.fechaCreacion) info += `   Fecha: ${inc.fechaCreacion}\n`;
        if (inc.poliza) info += `   Póliza: ${inc.poliza}\n`;
      });
    }
    
    return info;
  }

  private normalizePriority(priority?: string): 'low' | 'medium' | 'high' {
    const p = priority?.toLowerCase();
    if (p === 'high' || p === 'alta') return 'high';
    if (p === 'medium' || p === 'media') return 'medium';
    return 'low';
  }

  /**
   * Verifica si una incidencia es de tipo "Exclusiva IA"
   */
  isExclusivaIA(incidencia: NogalIncidencia): boolean {
    if (incidencia.tipoCreacion === 'Exclusiva IA') {
      return true;
    }
    
    const exclusivaIAMotivos = [
      'Cesión de derechos datos incompletos',
      'Datos incompletos',
      'Reenvío siniestros', 
      'Reenvío agentes humanos',
      'Reenvío agentes humanos no quiere IA',
      'Reenvío agentes humanos no tomador'
    ];
    
    return exclusivaIAMotivos.includes(incidencia.motivo);
  }

  /**
   * Determina si se debe crear un ticket automáticamente
   */
  shouldCreateTicket(analysis: NogalAnalysisResult): boolean {
    // Casos especiales con umbral más bajo para mejor detección
    const casosEspeciales = [
      'Reenvío agentes humanos no tomador',
      'Reenvío agentes humanos no quiere IA',
      'Reenvío siniestros'
    ];
    
    const esExclusivaIA = this.isExclusivaIA(analysis.incidenciaPrincipal);
    
    if (esExclusivaIA) {
      // Para casos especiales (como no tomador), usar umbral más bajo
      if (casosEspeciales.includes(analysis.incidenciaPrincipal.motivo)) {
        return analysis.requiereTicket && analysis.confidence >= 0.6; // Umbral reducido de 0.8 a 0.6
      }
      
      // Para otros casos exclusivos IA, mantener umbral alto
      return analysis.requiereTicket && analysis.confidence >= 0.8;
    }
    
    // Tickets normales mantienen umbral bajo
    return analysis.requiereTicket && analysis.confidence >= 0.3;
  }
}

export const nogalAnalysisService = new NogalAnalysisService(); 
# 📊 ANÁLISIS DETALLADO DE LLAMADAS Y NOTAS EN TICKETS

## 🎯 FLUJO COMPLETO DE GENERACIÓN

### **1. ANÁLISIS INICIAL** (`CallDecisionEngine`)

**Archivo**: `server/src/services/callDecisionEngine.ts`

El análisis se genera en el método `analyzeCall()` usando el prompt `COMPREHENSIVE_ANALYSIS_PROMPT` que incluye:

```typescript
// El LLM genera una respuesta JSON con:
{
  "metadata": {
    "confidence": 0.95,
    "processingRecommendation": "explicación de qué hacer", // ← ESTO ES CLAVE
    "warnings": ["advertencias si las hay"],
    "toolResultsFound": true,
    "clientSearchResults": "resumen de lo encontrado en tool_results"
  }
}
```

**El campo `processingRecommendation`** es donde Gemini explica:
- Qué detectó en la conversación
- Por qué clasificó de esa manera
- Qué acciones recomienda
- Contexto relevante de la llamada

---

### **2. EJECUCIÓN Y CREACIÓN DE TICKETS** (`CallExecutor`)

**Archivo**: `server/src/services/callExecutor.ts`

#### **A. Generación de Notas del Ticket** (líneas 441-489)

```typescript
private generateTicketNotes(decision: CallDecision, call: Call): string {
  const incident = decision.incidentAnalysis.primaryIncident;
  const extractedData = decision.clientInfo.extractedData;
  
  let notes = `${incident.description}\n\n`; // ← Descripción principal
  
  // Agregar datos específicos según el tipo de incidencia
  const tipoIncidencia = incident.type?.toLowerCase() || '';
  const motivoIncidencia = incident.reason?.toLowerCase() || '';
  
  // Para solicitudes de duplicado por email: incluir email de destino
  if (tipoIncidencia.includes('duplicado') && motivoIncidencia.includes('email')) {
    if (extractedData.email) {
      notes += `📧 Email destino: ${extractedData.email}\n`;
    }
  }
  
  // Para modificaciones de póliza: incluir datos relevantes
  if (tipoIncidencia.includes('modificacion') || tipoIncidencia.includes('cambio')) {
    if (extractedData.direccion) {
      notes += `🏠 Nueva dirección: ${extractedData.direccion}\n`;
    }
    if (extractedData.telefono && extractedData.telefono !== call.caller_id) {
      notes += `📞 Nuevo teléfono: ${extractedData.telefono}\n`;
    }
    if (extractedData.email) {
      notes += `📧 Nuevo email: ${extractedData.email}\n`;
    }
  }
  
  // Información adicional relevante
  if (extractedData.numeroPoliza && incident.numeroPolizaAfectada !== extractedData.numeroPoliza) {
    notes += `📋 Póliza mencionada: ${extractedData.numeroPoliza}\n`;
  }
  
  return notes;
}
```

#### **B. Almacenamiento del Análisis** (líneas 346-352)

```typescript
ai_analysis: {
  tipo_incidencia: decision.incidentAnalysis.primaryIncident.type,
  motivo_gestion: decision.incidentAnalysis.primaryIncident.reason,
  confidence: decision.metadata.confidence,
  prioridad: decision.decisions.priority,
  resumen_analisis: decision.metadata.processingRecommendation, // ← ANÁLISIS DETALLADO
  datos_extraidos: decision.clientInfo.extractedData,
  // ... más campos
}
```

---

### **3. VISUALIZACIÓN EN EL FRONTEND**

**Archivo**: `src/components/calls/CallActionsSection.tsx`

#### **A. Sección de Acciones** (líneas 375-385 en CallDetailsSidebar)

```tsx
<TabsContent value="actions" className="m-0 h-full overflow-hidden">
  <ScrollArea className="h-full max-h-[calc(100vh-200px)]">
    <div className="p-6 pb-8">
      <CallActionsSection 
        aiAnalysis={call.aiAnalysis}
        ticketsCreated={call.tickets?.length || 0}
        ticketIds={call.tickets?.map(t => t.id) || []}
      />
    </div>
  </ScrollArea>
</TabsContent>
```

#### **B. Análisis Detallado en el Ticket** (líneas 255-266)

```tsx
{/* ANÁLISIS DETALLADO DE LA LLAMADA */}
{resumenAnalisis && (
  <div className="border-t pt-6">
    <div className="flex items-center space-x-3 mb-4">
      <FileText className="h-5 w-5 text-foreground" />
      <p className="font-semibold">Análisis detallado de la llamada</p>
    </div>
    <div className="bg-background border-2 rounded-lg p-5">
      <p className="text-sm leading-relaxed">{resumenAnalisis}</p> {/* ← AQUÍ SE MUESTRA */}
    </div>
  </div>
)}
```

---

## 🎯 QUÉ SE INCLUYE EN CADA TICKET

### **1. INFORMACIÓN BÁSICA**
- **ID Ticket**: Generado automáticamente
- **Cliente ID**: Del análisis o extraído
- **Tipo de Incidencia**: Clasificación principal
- **Motivo**: Motivo específico

### **2. DATOS EXTRAÍDOS** (según el tipo)
- **📧 Email destino**: Para duplicados por email
- **🏠 Nueva dirección**: Para cambios de dirección
- **📞 Nuevo teléfono**: Para cambios de teléfono
- **📋 Póliza mencionada**: Si se menciona número específico

### **3. ANÁLISIS DETALLADO**
**Campo `resumen_analisis`** generado por Gemini que incluye:
- Resumen de lo que pasó en la llamada
- Contexto relevante
- Por qué se clasificó de esa manera
- Datos importantes extraídos
- Recomendaciones de procesamiento

### **4. DATOS DEL CLIENTE**
- **Nombre completo**: Si se extrajo
- **Teléfono**: Si se mencionó
- **Email**: Si se proporcionó
- **Número de póliza**: Si es gestión sobre póliza existente

---

## 📋 EJEMPLOS DE ANÁLISIS DETALLADO

### **Ejemplo 1: Duplicado por Email**
```
Análisis detallado de la llamada:
Cliente Manuel García solicita duplicado de su póliza de hogar por correo electrónico. 
Se identifica correctamente como cliente existente con código MG123456. 
Proporciona email manuel.garcia@email.com para el envío. 
La gestión se puede completar automáticamente sin intervención humana.
Confianza: 95%
```

### **Ejemplo 2: Cambio de Dirección**
```
Análisis detallado de la llamada:
Cliente solicita cambio de dirección postal en su póliza AU0420225024935. 
Nueva dirección: Calle Nueva 123, 28001 Madrid. 
Se extraen todos los datos necesarios para procesar la modificación. 
Cliente confirmado como tomador de la póliza. 
Requiere actualización en sistema Nogal.
```

### **Ejemplo 3: Reenvío Agentes Humanos**
```
Análisis detallado de la llamada:
Cliente solicita duplicado por correo ordinario. 
Agente IA transfiere a agente humano según protocolo establecido. 
Motivo: Duplicado por correo postal es exclusivo de agentes humanos. 
No se requieren datos adicionales, gestión estándar de transferencia.
```

---

## 🔧 CÓMO FUNCIONA EL PROMPT DE ANÁLISIS

### **Prompt Principal** (`COMPREHENSIVE_ANALYSIS_PROMPT`)

El prompt incluye instrucciones específicas para generar el `processingRecommendation`:

```
"metadata": {
  "confidence": 0.95,
  "processingRecommendation": "explicación de qué hacer",
  "warnings": ["advertencias si las hay"],
  "toolResultsFound": true,
  "clientSearchResults": "resumen de lo encontrado en tool_results"
}
```

**Gemini genera explicaciones como:**
- "Cliente solicita X, se detecta Y, se recomienda Z"
- "Transferencia necesaria por motivo específico"
- "Datos completos extraídos, procesar automáticamente"
- "Caso crítico detectado, aplicar protocolo especial"

---

## 🎯 MEJORAS IMPLEMENTADAS

### **✅ Lógica Simplificada**
- **Regla única**: Si agente transfiere → "Reenvío agentes humanos"
- **Eliminadas advertencias negativas** del prompt
- **Clasificación más directa** y menos confusa

### **✅ Análisis Más Rico**
- **Contexto completo** de la conversación
- **Datos extraídos** específicos por tipo
- **Justificación** de la clasificación
- **Recomendaciones** de procesamiento

### **✅ Frontend Mejorado**
- **Sección de acciones** clara y organizada
- **Análisis detallado** visible en cada ticket
- **Datos del cliente** estructurados
- **Estado de procesamiento** en tiempo real

---

## 🚀 FLUJO COMPLETO RESUMIDO

1. **📞 Llamada procesada** → Transcripts extraídos
2. **🧠 Análisis con Gemini** → `CallDecisionEngine.analyzeCall()`
3. **📝 Generación de notas** → `CallExecutor.generateTicketNotes()`
4. **🎫 Creación de ticket** → Enviado a Nogal con notas completas
5. **💾 Almacenamiento** → `ai_analysis` con `resumen_analisis`
6. **🖥️ Visualización** → `CallActionsSection` muestra análisis detallado

**El análisis detallado que ves en el frontend es el `processingRecommendation` generado por Gemini, que explica todo el contexto y razonamiento detrás de cada clasificación.**

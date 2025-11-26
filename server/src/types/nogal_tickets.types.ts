// Tipos para la integración con la API de Tickets de Nogal

/**
 * Datos del cliente obtenidos durante la llamada via buscar-cliente API
 */
export interface NogalClientData {
  // Datos de identificación
  dni?: string;
  phone?: string;
  name?: string;
  email?: string;
  codigoCliente?: string;
  
  // Datos obtenidos de buscar-cliente
  polizas?: {
    numero: string;
    compania: string;
    estado: string;
    ramo: 'hogar' | 'auto' | 'vida' | 'decesos' | 'Salud' | 'viaje' | 'otros';
    fechaEfecto?: string;
    mesVencimiento?: string;
    importePoliza?: string;
  }[];
  
  incidenciasAbiertas?: {
    codigo: string;
    tipo: string;
    motivo: string;
    fechaCreacion?: string;
    poliza?: string;
  }[];
}

/**
 * Mapeo de tipos de incidencia de Nogal basado en tickets_nogal.csv actualizado 15.07.25
 */
export type NogalTipoIncidencia = 
  | 'Nueva contratación de seguros'
  | 'Modificación póliza emitida'
  | 'Llamada asistencia en carretera'
  | 'Retención cliente'
  | 'Llamada gestión comercial'
  | 'Baja cliente en BBDD'
  | 'Reclamación cliente regalo'
  | 'Solicitud duplicado póliza';

/**
 * Motivos de gestión actualizados de Nogal - CSV 15.07.25
 */
export type NogalMotivoGestion = 
  | 'Contratación Póliza'
  | 'Póliza anterior suspensión de garantías'
  | 'Atención al cliente - Modif datos póliza'
  | 'Cambio nº de cuenta'
  | 'Siniestros'
  | 'Retención cliente'
  | 'LLam gestión comerc'
  | 'Consulta cliente'
  | 'Cambio forma de pago'
  | 'Reenvío siniestros'
  | 'Reenvío agentes humanos'
  | 'Reenvío agentes humanos no quiere IA'
  | 'Reenvío agentes humanos no tomador'
  | 'Baja Cliente BBDD'
  | 'Reclamación atención al cliente'
  | 'Duplicado Tarjeta'
  | 'Email'
  | 'Información recibos declaración renta'
  | 'Cambio fecha de efecto'
  | 'Modificación nº asegurados'
  | 'Cambio dirección postal'
  | 'Modificación coberturas'
  | 'Cesión de derechos datos incompletos'
  | 'Cesión de derechos'
  | 'Corrección datos erróneos en póliza'
  | 'Datos incompletos';

/**
 * Tipos de creación según CSV actualizado
 */
export type NogalTipoCreacion = 
  | 'Manual / Automática'
  | 'Exclusiva IA';

/**
 * Resultado del análisis actualizado para tipos de Nogal
 */
export interface NogalGeminiAnalysisResult {
  // Clasificación principal usando tipos reales de Nogal
  tipoIncidencia: NogalTipoIncidencia;
  motivoGestion: NogalMotivoGestion;
  ramo?: 'hogar' | 'auto' | 'vida' | 'decesos' | 'Salud' | 'viaje' | 'otros';
  
  // Confianza y prioridad
  confidence: number; // 0-1
  priority: 'low' | 'medium' | 'high';
  
  // Contexto extraído
  resumenLlamada: string;
  consideraciones?: string; // Notas adicionales para el gestor
  
  // Tipo de creación según CSV
  tipoCreacion: NogalTipoCreacion;
  
  // Datos específicos extraídos de la conversación
  datosExtraidos: {
    numeroPoliza?: string;
    numeroRecibo?: string;
    motivo?: string;
    fechaEfecto?: string;
    nuevaCCC?: string;
    direccionNueva?: string;
    aseguradoNuevo?: {
      nombre: string;
      apellidos: string;
      dni?: string;
      fechaNacimiento?: string;
    };
    prestamo?: {
      numero: string;
      banco: string;
      entidad: string;
      oficina: string;
      fechaInicio: string;
      fechaFin: string;
    };
  };
  
  // Control de creación
  requiereTicket: boolean;
  esExclusivaIA: boolean; // Para tipos marcados como "Exclusiva IA" en el CSV
}

/**
 * Payload para crear ticket en la API de Nogal
 */
export interface NogalTicketPayload {
  "Fecha envío": string; // Formato DD/MM/YYYY
  "Hora envío": string;
  "IdCliente": string;
  "IdTicket": string;
  "TipoIncidencia": string;
  "MotivoIncidencia": string;
  "Ramo"?: string; // ✅ NUEVO - ramo de seguro si se detecta (hogar, auto, vida, decesos, salud, otros)
  "NumeroPoliza"?: string;
  "Notas": string;
  "FicheroLlamada"?: string;
}

/**
 * Respuesta de la API de Nogal al crear ticket
 */
export interface NogalTicketResponse {
  Respuesta: 'OK' | 'ERROR';
  mensaje?: string;
  codigoError?: string;
  detalles?: any;
}

/**
 * Mapeo de acciones Gemini actuales a tipos Nogal actualizados
 */
export const GEMINI_TO_NOGAL_MAPPING: Record<string, {
  tipoIncidencia: NogalTipoIncidencia;
  motivoGestion: NogalMotivoGestion;
  tipoCreacion: NogalTipoCreacion;
  esExclusivaIA: boolean;
}> = {
  'DEVOLUCION_RECIBOS': {
    tipoIncidencia: 'Llamada gestión comercial',
    motivoGestion: 'Reenvío agentes humanos',
    tipoCreacion: 'Exclusiva IA',
    esExclusivaIA: true
  },
  'ANULACION_POLIZA': {
    tipoIncidencia: 'Retención cliente',
    motivoGestion: 'Retención cliente',
    tipoCreacion: 'Manual / Automática',
    esExclusivaIA: false
  },
  'REGULARIZACION_POLIZA': {
    tipoIncidencia: 'Modificación póliza emitida',
    motivoGestion: 'Atención al cliente - Modif datos póliza',
    tipoCreacion: 'Manual / Automática',
    esExclusivaIA: false
  },
  'CONTRASEÑAS': {
    tipoIncidencia: 'Llamada gestión comercial',
    motivoGestion: 'Consulta cliente',
    tipoCreacion: 'Manual / Automática',
    esExclusivaIA: false
  },
  'REENVIO_SINIESTROS': {
    tipoIncidencia: 'Llamada gestión comercial',
    motivoGestion: 'Reenvío siniestros',
    tipoCreacion: 'Exclusiva IA',
    esExclusivaIA: true
  },
  'REENVIO_AGENTES_HUMANOS': {
    tipoIncidencia: 'Llamada gestión comercial',
    motivoGestion: 'Reenvío agentes humanos',
    tipoCreacion: 'Exclusiva IA',
    esExclusivaIA: true
  },
  'REENVIO_AGENTES_HUMANOS_NO_QUIERE_IA': {
    tipoIncidencia: 'Llamada gestión comercial',
    motivoGestion: 'Reenvío agentes humanos no quiere IA',
    tipoCreacion: 'Exclusiva IA',
    esExclusivaIA: true
  },
  'REENVIO_AGENTES_HUMANOS_NO_TOMADOR': {
    tipoIncidencia: 'Llamada gestión comercial',
    motivoGestion: 'Reenvío agentes humanos no tomador',
    tipoCreacion: 'Exclusiva IA',
    esExclusivaIA: true
  },
  'DATOS_INCOMPLETOS': {
    tipoIncidencia: 'Modificación póliza emitida',
    motivoGestion: 'Datos incompletos',
    tipoCreacion: 'Exclusiva IA',
    esExclusivaIA: true
  },
  'CESION_DERECHOS_DATOS_INCOMPLETOS': {
    tipoIncidencia: 'Modificación póliza emitida',
    motivoGestion: 'Cesión de derechos datos incompletos',
    tipoCreacion: 'Exclusiva IA',
    esExclusivaIA: true
  }
};

/**
 * Datos completos de la llamada enviados por Segurneo Voice Gateway
 */
export interface CallDataFromGateway {
  // Identificación
  externalCallId: string;
  conversationId: string; // ID de Eleven Labs
  
  // Datos de la llamada
  startTime: number; // Unix timestamp
  duration: number; // segundos
  status: 'completed' | 'failed';
  
  // Transcripción
  transcript: {
    role: 'agent' | 'user';
    message: string;
    timestamp: number; // segundos desde inicio
    confidence: number;
  }[];
  
  // Datos del cliente (obtenidos durante la llamada)
  clientData: NogalClientData;
  
  // Metadatos técnicos
  audioQuality?: number;
  language?: string;
  
  // Control de tickets
  ticketCreated?: boolean; // Para evitar duplicados
  analysisPerformed?: boolean;
}

/**
 * Estados del procesamiento de tickets
 */
export type TicketCreationStatus = 
  | 'not_attempted'
  | 'in_progress' 
  | 'success'
  | 'failed'
  | 'skipped_low_confidence'
  | 'skipped_no_client_data';

/**
 * Resultado del procesamiento de ticket
 */
export interface TicketCreationResult {
  status: TicketCreationStatus;
  nogalTicketId?: string;
  error?: string;
  analysis?: NogalGeminiAnalysisResult;
  clientData?: NogalClientData;
  processingTime?: number; // milliseconds
} 
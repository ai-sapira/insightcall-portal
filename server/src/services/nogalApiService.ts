import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index';
import {
  NogalTicketPayload,
  NogalTicketResponse,
  NogalClientData
} from '../types/nogal_tickets.types';

/**
 * Criterios para buscar cliente en la API de Nogal
 */
export interface ClientSearchCriteria {
  phone?: string;
  dni?: string;
  name?: string;
  email?: string;
  jsonId?: string;
}

/**
 * Respuesta de buscar-cliente API de Nogal
 */
export interface NogalClientSearchResponse {
  datos?: {
    clientes?: Array<{
      codigo_cliente: string;
      email_cliente: string;
      nif_cliente: string;
      nombre_cliente: string;
      telefono_1: string;
      telefono_2?: string;
      telefono_3?: string;
      campaña?: string;
    }>;
    detalle_polizas?: Array<{
      codigo_cliente: string;
      poliza: string;
      matricula?: string;
      modelo?: string;
      direccion?: string;
      codigo_postal?: string;
      localidad?: string;
      provincia?: string;
    }>;
    vtos_polizas?: Array<{
      codigo_cliente: string;
      poliza: string;
      compañia: string;
      estado: string;
      fecha_efecto: string;
      importe_poliza: string;
      mes_vencimiento: string;
      reemplaza_a?: string;
    }>;
    incidencias?: Array<{
      codigo_cliente: string;
      codigo_incidencia: string;
      fecha_creacion_incidencia: string;
      hora_creacion_incidencia: string;
      motivo_de_incidencia: string;
      poliza: string;
      tipo_de_incidencia: string;
      via_recepcion: string;
    }>;
  };
  mensaje?: string;
  registros_encontrados?: {
    clientes: number;
    detalle_polizas: number;
    incidencias: number;
    vtos_polizas: number;
  };
  total_registros?: number;
}

/**
 * Servicio principal para integración con la API de Nogal
 */
export class NogalApiService {
  private client: AxiosInstance;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor() {
    this.baseUrl = config.nogalApiBaseUrl || 'https://datahub.segurosnogal.es:4443';
    this.timeout = config.nogalApiTimeout || 30000;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'InsightCall-Portal/1.0'
      }
    });

    // Request interceptor para logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[NogalAPI] ${config.method?.toUpperCase()} ${config.url}`, {
          data: config.data ? JSON.stringify(config.data).substring(0, 200) + '...' : 'no data'
        });
        return config;
      },
      (error) => {
        console.error('[NogalAPI] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor para manejo de errores
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[NogalAPI] Response ${response.status} from ${response.config.url}`, {
          data: response.data ? JSON.stringify(response.data).substring(0, 200) + '...' : 'no data'
        });
        return response;
      },
      (error) => {
        console.error('[NogalAPI] Response error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Busca un cliente en el sistema de Nogal
   */
  async buscarCliente(criteria: ClientSearchCriteria): Promise<NogalClientSearchResponse> {
    try {
      const now = new Date();
      const payload = {
        JsonId: criteria.jsonId || uuidv4(),
        "Fecha envío": now.toLocaleDateString('es-ES', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        }),
        "Hora envío": now.toLocaleTimeString('es-ES'),
        "IdLlamada": criteria.jsonId || uuidv4(),
        ...(criteria.phone && { "Teléfono": criteria.phone }),
        ...(criteria.dni && { "DNI": criteria.dni }),
        ...(criteria.name && { "Nombre": criteria.name }),
        ...(criteria.email && { "Email": criteria.email })
      };

      console.log('[NogalAPI] Buscando cliente con criterios:', payload);

      const response: AxiosResponse<NogalClientSearchResponse> = await this.client.post(
        '/api/buscar-cliente',
        payload
      );

      if (response.status !== 200) {
        throw new Error(`Error en buscar-cliente: HTTP ${response.status}`);
      }

      console.log('[NogalAPI] Cliente encontrado:', {
        totalRegistros: response.data.total_registros,
        clientes: response.data.registros_encontrados?.clientes || 0,
        polizas: response.data.registros_encontrados?.detalle_polizas || 0,
        incidencias: response.data.registros_encontrados?.incidencias || 0
      });

      return response.data;
    } catch (error) {
      console.error('[NogalAPI] Error buscando cliente:', error);
      throw this.handleApiError(error, 'buscar-cliente');
    }
  }

  /**
   * Crea un ticket en el sistema de Nogal
   */
  async crearTicket(payload: NogalTicketPayload): Promise<NogalTicketResponse> {
    try {
      console.log('[NogalAPI] Creando ticket:', {
        idTicket: payload.IdTicket,
        tipo: payload.TipoIncidencia,
        motivo: payload.MotivoIncidencia,
        cliente: payload.IdCliente
      });

      const response: AxiosResponse<NogalTicketResponse> = await this.client.post(
        '/api/crear-ticket',
        payload
      );

      if (response.status !== 200) {
        throw new Error(`Error en crear-ticket: HTTP ${response.status}`);
      }

      if (response.data.Respuesta !== 'OK') {
        throw new Error(`Error de Nogal: ${response.data.mensaje || 'Error desconocido'}`);
      }

      console.log('[NogalAPI] Ticket creado exitosamente:', payload.IdTicket);
      return response.data;
    } catch (error) {
      console.error('[NogalAPI] Error creando ticket:', error);
      throw this.handleApiError(error, 'crear-ticket');
    }
  }

  /**
   * Convierte respuesta de buscar-cliente a formato interno
   */
  convertClientSearchResponse(response: NogalClientSearchResponse): NogalClientData | null {
    if (!response.datos?.clientes?.length) {
      console.log('[NogalAPI] No se encontraron clientes en la respuesta');
      return null;
    }

    const cliente = response.datos.clientes[0]; // Tomamos el primero
    
    // Convertir pólizas
    const polizas = response.datos.vtos_polizas
      ?.filter(p => p.codigo_cliente === cliente.codigo_cliente)
      .map(p => ({
        numero: p.poliza,
        compania: p.compañia,
        estado: p.estado,
        ramo: this.inferRamoFromPoliza(p) as 'hogar' | 'auto' | 'vida' | 'decesos' | 'Salud' | 'viaje' | 'otros',
        fechaEfecto: p.fecha_efecto,
        mesVencimiento: p.mes_vencimiento,
        importePoliza: p.importe_poliza
      })) || [];

    // Convertir incidencias abiertas
    const incidenciasAbiertas = response.datos.incidencias
      ?.filter(i => i.codigo_cliente === cliente.codigo_cliente)
      .map(i => ({
        codigo: i.codigo_incidencia,
        tipo: i.tipo_de_incidencia,
        motivo: i.motivo_de_incidencia,
        fechaCreacion: i.fecha_creacion_incidencia,
        poliza: i.poliza
      })) || [];

    return {
      dni: cliente.nif_cliente,
      phone: cliente.telefono_1,
      name: cliente.nombre_cliente,
      email: cliente.email_cliente,
      codigoCliente: cliente.codigo_cliente,
      polizas,
      incidenciasAbiertas
    };
  }

  /**
   * Infiere el ramo de seguro basado en los datos de la póliza
   */
  private inferRamoFromPoliza(poliza: any): string {
    // Lógica básica para inferir el ramo basado en patrones comunes
    const polizaNum = poliza.poliza?.toLowerCase() || '';
    const compania = poliza.compañia?.toLowerCase() || '';
    
    if (polizaNum.includes('auto') || polizaNum.includes('vehic') || poliza.matricula) {
      return 'auto';
    }
    
    if (polizaNum.includes('hogar') || polizaNum.includes('casa') || poliza.direccion) {
      return 'hogar';
    }
    
    if (polizaNum.includes('vida') || compania.includes('vida')) {
      return 'vida';
    }
    
    if (polizaNum.includes('salud') || compania.includes('salud')) {
      return 'Salud';
    }
    
    if (polizaNum.includes('deceso') || compania.includes('deceso')) {
      return 'decesos';
    }
    
    return 'otros';
  }

  /**
   * Maneja errores de la API y los convierte a errores más descriptivos
   */
  private handleApiError(error: any, operation: string): Error {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.mensaje || error.message;
      
      switch (status) {
        case 400:
          return new Error(`[${operation}] Datos insuficientes para realizar la operación: ${message}`);
        case 404:
          return new Error(`[${operation}] Endpoint no encontrado. Verificar URL de la API`);
        case 500:
          return new Error(`[${operation}] Error interno del servidor de Nogal: ${message}`);
        case undefined:
          // Error de red/timeout
          return new Error(`[${operation}] Error de conectividad con la API de Nogal: ${error.message}`);
        default:
          return new Error(`[${operation}] Error HTTP ${status}: ${message}`);
      }
    }
    
    return new Error(`[${operation}] Error inesperado: ${error.message || error}`);
  }

  /**
   * Verifica la conectividad con la API de Nogal
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Intentamos una búsqueda básica como test de conectividad
      await this.buscarCliente({ 
        jsonId: 'health-check-' + Date.now(),
        phone: '000000000' // Número que probablemente no existe
      });
      return true;
    } catch (error) {
      console.error('[NogalAPI] Health check failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const nogalApiService = new NogalApiService(); 
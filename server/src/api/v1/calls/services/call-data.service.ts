import { createClient } from '@supabase/supabase-js';
import config from '../../../../config';

// Initialize Supabase client using centralized configuration
const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey || config.supabaseServiceKey || '');

export class CallDataService {
  
  constructor() {
    console.log('[CallDataService] Initialized with Supabase connection to:', config.supabaseUrl);
  }

  /**
   * Retrieve calls with optional filtering
   * @param filters - Optional filters for the query
   * @returns Promise with calls data
   */
  async getCalls(filters?: { 
    status?: string; 
    agent_id?: string; 
    start_date?: string; 
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<any> {
    try {
      let query = supabase
        .from('calls')
        .select(`
          *,
          tickets!tickets_call_id_fkey(
            id,
            tipo_incidencia,
            motivo_incidencia,
            status,
            priority,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.agent_id) {
        // Si se especifica un agent_id específico en filtros, lo aplicamos además del filtro base
        query = query.eq('agent_id', filters.agent_id);
      }
      
      if (filters?.start_date) {
        query = query.gte('start_time', filters.start_date);
      }
      
      if (filters?.end_date) {
        query = query.lte('end_time', filters.end_date);
      }

      // Apply pagination
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      
      if (filters?.offset) {
        query = query.range(filters.offset, (filters.offset + (filters.limit || 50)) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('[CallDataService] Database error:', error);
        throw error;
      }

      return {
        success: true,
        message: 'Calls retrieved successfully',
        data: data || [],
        count: count || data?.length || 0,
        filters
      };
    } catch (error) {
      console.error('[CallDataService] Get calls error:', error);
      throw new Error('Failed to retrieve calls');
    }
  }

  /**
   * Get a specific call by ID
   * @param callId - The ID of the call to retrieve
   * @returns Promise with call data
   */
  async getCallById(callId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('calls')
        .select(`
          *,
          tickets!tickets_call_id_fkey(
            id,
            tipo_incidencia,
            motivo_incidencia,
            status,
            priority,
            description,
            assignee_id,
            metadata,
            created_at,
            updated_at
          )
        `)
        .eq('id', callId)
        .single();

      if (error) {
        console.error('[CallDataService] Database error:', error);
        throw error;
      }

      if (!data) {
        throw new Error(`Call with ID ${callId} not found`);
      }

      return {
        success: true,
        message: 'Call retrieved successfully',
        data
      };
    } catch (error) {
      console.error('[CallDataService] Get call by ID error:', error);
      throw new Error(`Failed to retrieve call with ID: ${callId}`);
    }
  }

  /**
   * Save analysis results to database
   * @param callId - The ID of the call
   * @param analysisData - The analysis results to save
   * @returns Promise with save operation result
   */
  async saveAnalysisResults(callId: string, analysisData: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('calls')
        .update({
          ai_analysis: analysisData,
          analysis_completed: true,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', callId)
        .select()
        .single();

      if (error) {
        console.error('[CallDataService] Database error:', error);
        throw error;
      }

      return {
        success: true,
        message: 'Analysis results saved successfully',
        callId,
        savedAt: new Date().toISOString(),
        data
      };
    } catch (error) {
      console.error('[CallDataService] Save analysis error:', error);
      throw new Error('Failed to save analysis results');
    }
  }

  /**
   * Get call statistics
   * @returns Promise with statistics data
   */
  async getCallStats(): Promise<any> {
    try {
      // Get total calls count
      const { count: totalCalls } = await supabase
        .from('calls')
        .select('*', { count: 'exact', head: true });

      // Get calls by status
      const { data: statusData } = await supabase
        .from('calls')
        .select('status')
        .not('status', 'is', null);

      // Get recent calls (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { count: recentCalls } = await supabase
        .from('calls')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      // Get tickets count
      const { count: totalTickets } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true });

      // Process status counts
      const statusCounts = statusData?.reduce((acc, call) => {
        acc[call.status] = (acc[call.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      return {
        success: true,
        data: {
          totalCalls: totalCalls || 0,
          recentCalls: recentCalls || 0,
          totalTickets: totalTickets || 0,
          statusBreakdown: statusCounts
        }
      };
    } catch (error) {
      console.error('[CallDataService] Get stats error:', error);
      throw new Error('Failed to retrieve call statistics');
    }
  }

  /**
   * Update call transcript summary (translated to Spanish)
   * @param callId - The ID of the call
   * @param summary - The translated summary
   * @returns Promise with update result
   */
  async updateTranscriptSummary(callId: string, summary: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('calls')
        .update({
          transcript_summary: summary,
          updated_at: new Date().toISOString()
        })
        .eq('id', callId)
        .select()
        .single();

      if (error) {
        console.error('[CallDataService] Database error:', error);
        throw error;
      }

      return {
        success: true,
        message: 'Transcript summary updated successfully',
        data
      };
    } catch (error) {
      console.error('[CallDataService] Update summary error:', error);
      throw new Error('Failed to update transcript summary');
    }
  }
}

export const callDataService = new CallDataService(); 
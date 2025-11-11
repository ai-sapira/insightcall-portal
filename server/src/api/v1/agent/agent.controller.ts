import { Request, Response, NextFunction } from 'express';
import { elevenLabsService } from '../../../services/elevenlabs.service';
import config from '../../../config';

export class AgentController {
  /**
   * Debug endpoint to check configuration
   * GET /api/v1/agent/debug
   */
  async debugConfig(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        config: {
          hasApiKey: !!config.elevenlabsApiKey,
          hasAgentId: !!config.elevenlabsAgentId,
          apiKeyLength: config.elevenlabsApiKey?.length || 0,
          agentIdLength: config.elevenlabsAgentId?.length || 0,
          apiKeyPreview: config.elevenlabsApiKey ? `${config.elevenlabsApiKey.substring(0, 10)}...` : 'missing',
          agentIdPreview: config.elevenlabsAgentId ? `${config.elevenlabsAgentId.substring(0, 10)}...` : 'missing',
          envVars: {
            ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY ? 'present' : 'missing',
            ELEVENLABS_AGENT_ID: process.env.ELEVENLABS_AGENT_ID ? 'present' : 'missing',
          },
        },
      });
    } catch (error) {
      console.error('[AgentController] Debug error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get agent configuration
   * GET /api/v1/agent/config
   */
  async getAgentConfig(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('[AgentController] Getting agent config...');
      const agentDetails = await elevenLabsService.getAgentConfig();
      console.log('[AgentController] Agent config retrieved successfully');
      res.json({
        success: true,
        data: agentDetails,
      });
    } catch (error) {
      console.error('[AgentController] Error getting agent config:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error,
      });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        message: 'Error al obtener la configuración del agente',
        error: errorMessage,
      });
    }
  }

  /**
   * Update agent configuration
   * PUT /api/v1/agent/config
   */
  async updateAgentConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = req.body;

      // Validate payload structure
      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Payload inválido',
        });
      }

      await elevenLabsService.updateAgentConfig(payload);

      res.json({
        success: true,
        message: 'Configuración del agente actualizada correctamente',
      });
    } catch (error) {
      console.error('[AgentController] Error updating agent config:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        message: 'Error al actualizar la configuración del agente',
        error: errorMessage,
      });
    }
  }
}

export const agentController = new AgentController();


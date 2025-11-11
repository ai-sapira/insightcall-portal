import { Router } from 'express';
import { agentController } from './agent.controller';

const router = Router();

/**
 * Agent configuration routes
 * Base: /api/v1/agent
 */

// GET /api/v1/agent/debug - Debug configuration
router.get('/debug', (req, res, next) => agentController.debugConfig(req, res, next));

// GET /api/v1/agent/config - Get agent configuration
router.get('/config', (req, res, next) => agentController.getAgentConfig(req, res, next));

// PUT /api/v1/agent/config - Update agent configuration
router.put('/config', (req, res, next) => agentController.updateAgentConfig(req, res, next));

export default router;


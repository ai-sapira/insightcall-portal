import { Router } from 'express';
import agentRoutes from './agent.routes';

const router = Router();

router.use('/', agentRoutes);

export default router;



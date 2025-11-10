import { Router } from 'express';
import { usersController } from './users.controller';
import { authMiddleware } from './users.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/v1/users - List all users
router.get('/', usersController.listUsers.bind(usersController));

// GET /api/v1/users/:userId - Get user by ID
router.get('/:userId', usersController.getUserById.bind(usersController));

// POST /api/v1/users/invite - Invite a user
router.post('/invite', usersController.inviteUser.bind(usersController));

// DELETE /api/v1/users/:userId - Delete a user
router.delete('/:userId', usersController.deleteUser.bind(usersController));

export default router;


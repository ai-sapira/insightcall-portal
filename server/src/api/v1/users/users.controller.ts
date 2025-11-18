import { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service';

export class UsersController {
  /**
   * List all users
   * GET /api/v1/users
   */
  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await usersService.listUsers();
      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      console.error('[UsersController] Error listing users:', error);
      next(error);
    }
  }

  /**
   * Invite a user by email
   * POST /api/v1/users/invite
   */
  async inviteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, redirectTo } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
        });
      }

      const result = await usersService.inviteUser(email, redirectTo);

      if (result.error) {
        return res.status(400).json({
          success: false,
          message: result.error.message || 'Error inviting user',
          error: result.error.message,
        });
      }

      res.json({
        success: true,
        message: 'User invitation sent successfully',
        data: result.user,
      });
    } catch (error) {
      console.error('[UsersController] Error inviting user:', error);
      next(error);
    }
  }

  /**
   * Delete a user
   * DELETE /api/v1/users/:userId
   */
  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const result = await usersService.deleteUser(userId);

      if (result.error) {
        return res.status(400).json({
          success: false,
          message: result.error.message || 'Error deleting user',
          error: result.error.message,
        });
      }

      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      console.error('[UsersController] Error deleting user:', error);
      next(error);
    }
  }

  /**
   * Get user by ID
   * GET /api/v1/users/:userId
   */
  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
      }

      const user = await usersService.getUserById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error('[UsersController] Error getting user:', error);
      next(error);
    }
  }
}

export const usersController = new UsersController();



import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import config from '../../../config/index';

// Create Supabase client for verifying JWT tokens
// Use anon key for verifying user tokens (service key would bypass RLS)
const supabase = createClient(
  config.nogalSupabaseUrl,
  config.supabaseAnonKey || config.nogalSupabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Middleware to verify authentication token
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization header is required',
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    // Attach user to request object for use in controllers
    (req as any).user = user;

    next();
  } catch (error) {
    console.error('[AuthMiddleware] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying authentication',
    });
  }
};


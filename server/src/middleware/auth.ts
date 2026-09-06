import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  officerId?: string;
  officerRole?: string;
  officer?: {
    id: string;
    name: string;
    role: string;
    badgeNumber: string;
    email: string;
    district: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'metro_verify_super_secret_jwt_key_2026';

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err) {
        res.status(403).json({ success: false, error: 'Invalid or expired token' });
        return;
      }
      req.officer = decoded;
      req.officerId = decoded.id;
      req.officerRole = decoded.role;
      next();
    });
  } else {
    // If authorization header is missing, check if officer-id header is provided as a test/dev fallback
    const devOfficerId = req.headers['x-officer-id'] as string;
    if (devOfficerId) {
      req.officerId = devOfficerId;
      next();
      return;
    }

    res.status(401).json({ success: false, error: 'Authorization token required' });
  }
};

export const optionalJWT = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (!err && decoded) {
        req.officer = decoded;
        req.officerId = decoded.id;
        req.officerRole = decoded.role;
      }
      next();
    });
  } else {
    const devOfficerId = req.headers['x-officer-id'] as string;
    if (devOfficerId) {
      req.officerId = devOfficerId;
    }
    next();
  }
};

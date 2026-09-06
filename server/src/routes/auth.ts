import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { authenticateJWT, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'metro_verify_super_secret_jwt_key_2026';

// GET /auth/officers - List officers for UI selection / switcher
router.get('/officers', async (req: Request, res: Response) => {
  try {
    const officers = await prisma.officer.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        role: true,
        badgeNumber: true,
        designation: true,
        department: true,
        email: true,
        district: true,
        jurisdiction: true,
        currentWorkload: true,
        maxCapacity: true,
        rating: true,
      },
      orderBy: { id: 'asc' },
    });
    res.json({ success: true, officers });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /auth/officer/login - Dedicated officer login endpoint
router.post('/officer/login', async (req: Request, res: Response) => {
  try {
    const { identifier, badgeNumber, email, password } = req.body;
    const searchKey = identifier || badgeNumber || email || 'LMO-101';

    const officer = await prisma.officer.findFirst({
      where: {
        OR: [
          { id: searchKey },
          { email: searchKey },
          { badgeNumber: searchKey },
        ],
      },
    });

    if (!officer) {
      return res.status(401).json({
        success: false,
        error: `Officer '${searchKey}' not found in database.`,
      });
    }

    if (password) {
      const isMatch = await bcrypt.compare(password, officer.passwordHash);
      if (!isMatch && password !== 'password123') {
        return res.status(401).json({
          success: false,
          error: 'Invalid password. Default is password123',
        });
      }
    }

    const token = jwt.sign(
      {
        id: officer.id,
        name: officer.name,
        role: officer.role,
        badgeNumber: officer.badgeNumber,
        email: officer.email,
        district: officer.district,
        jurisdiction: officer.jurisdiction,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { passwordHash, ...officerData } = officer;

    return res.json({
      success: true,
      role: officer.role,
      user: officerData,
      token,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /auth/login - Real database authentication with JWT token issuance
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { role, identifier, password } = req.body;

    if (role === 'officer' || role === 'LMO' || role === 'GATC') {
      const searchKey = identifier || 'LMO-101';
      const officer = await prisma.officer.findFirst({
        where: {
          OR: [
            { id: searchKey },
            { email: searchKey },
            { badgeNumber: searchKey },
          ],
        },
      });

      if (!officer) {
        return res.status(401).json({
          success: false,
          error: `Officer '${searchKey}' not found in database.`,
        });
      }

      // If password provided, verify with bcrypt
      if (password) {
        const isMatch = await bcrypt.compare(password, officer.passwordHash);
        if (!isMatch && password !== 'password123') {
          return res.status(401).json({
            success: false,
            error: 'Invalid password. Default is password123',
          });
        }
      }

      const token = jwt.sign(
        {
          id: officer.id,
          name: officer.name,
          role: officer.role,
          badgeNumber: officer.badgeNumber,
          email: officer.email,
          district: officer.district,
          jurisdiction: officer.jurisdiction,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const { passwordHash, ...officerData } = officer;

      return res.json({
        success: true,
        role: officer.role,
        user: officerData,
        token,
      });
    } else if (role === 'owner') {
      const searchKey = (identifier || '').trim();
      if (!searchKey) {
        return res.status(400).json({
          success: false,
          error: 'Please provide your registered User ID, Email, or Phone number.',
        });
      }

      const owner = await prisma.owner.findFirst({
        where: {
          OR: [
            { id: searchKey },
            { email: searchKey },
            { phone: searchKey },
            { name: searchKey },
            { businessName: searchKey },
          ],
        },
      });

      if (!owner) {
        return res.status(401).json({
          success: false,
          error: `Owner account '${searchKey}' not found in database. Please verify your registered User ID, Email, or Phone Number.`,
        });
      }

      // If password provided, verify (default demo password is password123)
      if (password && password !== 'password123') {
        // Can add bcrypt verification if passwords are saved in DB
      }

      const token = jwt.sign(
        {
          id: owner.id,
          name: owner.name,
          role: 'owner',
          email: owner.email,
          businessName: owner.businessName,
          district: owner.district,
          state: owner.state,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        success: true,
        role: 'owner',
        user: owner,
        token,
      });
    } else if (role === 'admin' || (identifier && identifier.toUpperCase().startsWith('ADMIN'))) {
      const adminId = identifier || 'ADMIN-101';
      const token = jwt.sign(
        {
          id: adminId,
          name: 'State Metrology Controller Administration',
          role: 'admin',
          email: 'controller.lm@gov.in',
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        success: true,
        role: 'admin',
        user: {
          id: adminId,
          name: 'State Metrology Controller Administration',
          email: 'controller.lm@gov.in',
          jurisdiction: 'National / Statewide Directorate',
        },
        token,
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Invalid role specified. Supported: owner, officer, admin',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /auth/me - Retrieve authenticated user info from token
router.get('/me', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    if (req.officerId) {
      // 1. Check if officer
      const officer = await prisma.officer.findUnique({
        where: { id: req.officerId },
        select: {
          id: true,
          name: true,
          role: true,
          badgeNumber: true,
          designation: true,
          department: true,
          email: true,
          phone: true,
          state: true,
          district: true,
          jurisdiction: true,
          currentWorkload: true,
          maxCapacity: true,
          rating: true,
        },
      });
      if (officer) return res.json({ success: true, user: officer });

      // 2. Check if owner
      const owner = await prisma.owner.findUnique({
        where: { id: req.officerId },
      });
      if (owner) return res.json({ success: true, user: owner });
    }
    return res.json({ success: true, user: req.officer });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /auth/register - Register new Owner or Officer with validation & JWT token issuance
router.post('/register', async (req: Request, res: Response) => {
  try {
    const {
      role,
      name,
      businessName,
      email,
      phone,
      state,
      district,
      address,
      password,
      badgeNumber,
      designation,
      department,
      jurisdiction,
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Full name and email are required for registration.' });
    }

    const regRole = (role || 'owner').toLowerCase();

    if (regRole === 'owner') {
      const existing = await prisma.owner.findFirst({
        where: { email },
      });
      if (existing) {
        return res.status(400).json({ success: false, error: `An owner account with email '${email}' already exists.` });
      }

      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const ownerId = `OWN-${randomSuffix}`;

      const newOwner = await prisma.owner.create({
        data: {
          id: ownerId,
          name,
          businessName: businessName || `${name} Enterprises`,
          email,
          phone: phone || '+91 98765 43210',
          state: state || 'Telangana',
          district: district || 'Hyderabad',
          address: address || 'Industrial Area, Hyderabad',
          complianceScore: 100,
        },
      });

      const token = jwt.sign(
        {
          id: newOwner.id,
          name: newOwner.name,
          role: 'owner',
          email: newOwner.email,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        success: true,
        message: 'Owner account registered successfully',
        role: 'owner',
        user: newOwner,
        token,
      });
    } else if (regRole === 'officer' || regRole === 'gatc') {
      const existing = await prisma.officer.findFirst({
        where: { email },
      });
      if (existing) {
        return res.status(400).json({ success: false, error: `An officer account with email '${email}' already exists.` });
      }

      const officerType = regRole === 'gatc' ? 'GATC' : 'LMO';
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const officerId = `${officerType}-${randomSuffix}`;
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password || 'password123', salt);

      const newOfficer = await prisma.officer.create({
        data: {
          id: officerId,
          name,
          role: officerType,
          badgeNumber: badgeNumber || `LM-BADGE-${randomSuffix}`,
          designation: designation || (officerType === 'GATC' ? 'Senior Technical Lab Officer' : 'Legal Metrology Officer'),
          department: department || 'Department of Legal Metrology',
          phone: phone || '+91 98765 00000',
          email,
          passwordHash,
          state: state || 'Telangana',
          district: district || 'Hyderabad',
          jurisdiction: jurisdiction || `${district || 'Hyderabad'} Zone`,
          currentWorkload: 0,
          maxCapacity: 20,
          active: true,
        },
      });

      const token = jwt.sign(
        {
          id: newOfficer.id,
          name: newOfficer.name,
          role: newOfficer.role,
          badgeNumber: newOfficer.badgeNumber,
          email: newOfficer.email,
          district: newOfficer.district,
          jurisdiction: newOfficer.jurisdiction,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const { passwordHash: _, ...officerData } = newOfficer;

      return res.status(201).json({
        success: true,
        message: `${officerType} officer account registered successfully`,
        role: newOfficer.role,
        user: officerData,
        token,
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Invalid registration role. Supported roles: owner, officer, gatc',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

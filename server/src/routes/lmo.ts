import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateJWT, AuthRequest } from '../middleware/auth';

const router = Router();

// Middleware to ensure officer identity
router.use(authenticateJWT);

// Helper to get formatted today date
const getTodayStr = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

// GET /api/lmo/dashboard - Live DB-driven metric counters for authenticated officer
router.get('/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    const officerId = req.officerId!;
    const today = getTodayStr();

    // Fetch live counts strictly for this officer
    const [
      officer,
      allAssignments,
      offlinePendingCount,
      completedInspectionsCount,
    ] = await Promise.all([
      prisma.officer.findUnique({
        where: { id: officerId },
        select: {
          id: true,
          name: true,
          role: true,
          badgeNumber: true,
          designation: true,
          department: true,
          jurisdiction: true,
          district: true,
          currentWorkload: true,
          maxCapacity: true,
          rating: true,
        },
      }),
      prisma.assignment.findMany({
        where: { assignedOfficerId: officerId },
        include: {
          instrument: true,
          owner: true,
          application: true,
          batch: true,
        },
        orderBy: { scheduledDate: 'asc' },
      }),
      prisma.inspection.count({
        where: {
          officerId,
          isOffline: true,
          syncedAt: null,
        },
      }),
      prisma.inspection.count({
        where: {
          officerId,
          status: 'COMPLETED',
        },
      }),
    ]);

    if (!officer) {
      return res.status(404).json({ success: false, error: 'Officer not found' });
    }

    // Live metric calculations
    const assignedToday = allAssignments.filter(
      (a) => a.scheduledDate === today || a.assignedAt.toISOString().startsWith(today)
    ).length;

    const completed = allAssignments.filter((a) => a.status === 'COMPLETED').length;

    const remaining = allAssignments.filter((a) =>
      ['PENDING', 'SCHEDULED', 'IN_PROGRESS'].includes(a.status)
    ).length;

    const reinspectionRequired = allAssignments.filter((a) =>
      ['REINSPECTION_REQUIRED', 'FAILED'].includes(a.status)
    ).length;

    const overdue = allAssignments.filter(
      (a) => a.scheduledDate < today && !['COMPLETED'].includes(a.status)
    ).length;

    const metrics = {
      assignedToday,
      completed,
      remaining,
      offlinePendingSync: offlinePendingCount,
      reinspectionRequired,
      overdue,
      currentWorkload: officer.currentWorkload,
      maxCapacity: officer.maxCapacity,
    };

    res.json({
      success: true,
      officer,
      metrics,
      assignments: allAssignments,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/lmo/assignments - List assignments assigned ONLY to this officer
router.get('/assignments', async (req: AuthRequest, res: Response) => {
  try {
    const officerId = req.officerId!;
    const { status, date } = req.query;

    const whereClause: any = { assignedOfficerId: officerId };
    if (status) {
      whereClause.status = status as string;
    }
    if (date) {
      whereClause.scheduledDate = date as string;
    }

    const assignments = await prisma.assignment.findMany({
      where: whereClause,
      include: {
        instrument: {
          include: {
            certificates: {
              where: { status: 'ACTIVE' },
              take: 1,
            },
          },
        },
        owner: true,
        application: true,
        batch: true,
        inspections: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    res.json({
      success: true,
      count: assignments.length,
      assignments,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/lmo/batches/:id - Get batch details assigned to this officer
router.get('/batches/:id', async (req: AuthRequest, res: Response) => {
  try {
    const officerId = req.officerId!;
    const batchId = req.params.id;

    const batch = await prisma.batch.findFirst({
      where: {
        id: batchId,
        assignedOfficerId: officerId,
      },
      include: {
        bulkRequest: {
          include: {
            owner: true,
          },
        },
        assignments: {
          where: { assignedOfficerId: officerId },
          include: {
            instrument: true,
          },
        },
      },
    });

    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found or not assigned to you' });
    }

    res.json({ success: true, batch });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/lmo/instruments/:id - Fetch assigned instrument verification details
router.get('/instruments/:id', async (req: AuthRequest, res: Response) => {
  try {
    const officerId = req.officerId!;
    const instrumentId = req.params.id;

    // Check that this instrument is assigned to this officer
    const assignment = await prisma.assignment.findFirst({
      where: {
        instrumentId,
        assignedOfficerId: officerId,
      },
      include: {
        instrument: {
          include: {
            certificates: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        owner: true,
        application: true,
        inspections: {
          orderBy: { startedAt: 'desc' },
        },
      },
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Instrument not found or not assigned to your officer account',
      });
    }

    res.json({
      success: true,
      assignment,
      instrument: assignment.instrument,
      owner: assignment.owner,
      application: assignment.application,
      priorInspections: assignment.inspections,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

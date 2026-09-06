import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import {
  scoreOfficer,
  allocateSingleSlot,
  allocateBulkBatch,
  AllocationRequest,
} from '../utils/allocationEngine';

const router = Router();

// Helper to map DB Officer to AllocationEngine Officer format
function mapDbOfficer(officer: any) {
  const districtCoordinates: Record<string, { lat: number; lng: number }> = {
    'Hyderabad North': { lat: 17.4485, lng: 78.487 },
    'Hyderabad South': { lat: 17.3616, lng: 78.4747 },
    'Secunderabad': { lat: 17.4399, lng: 78.4983 },
    'Hyderabad': { lat: 17.385, lng: 78.4867 },
    'New Delhi Central': { lat: 28.6433, lng: 77.1895 },
  };

  const coords = districtCoordinates[officer.district] || { lat: 17.4485, lng: 78.487 };
  const today = new Date().toISOString().split('T')[0];

  return {
    id: officer.id,
    name: officer.name,
    role: officer.role as 'LMO' | 'GATC',
    badgeNumber: officer.badgeNumber,
    designation: officer.designation,
    district: officer.district,
    state: officer.state,
    lat: coords.lat,
    lng: coords.lng,
    pendingJobs: officer.currentWorkload,
    availableDates: [today, '2026-09-06', '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10'],
    contactNumber: officer.phone,
    gatcLabName: officer.role === 'GATC' ? officer.name : undefined,
  };
}

// GET /schedule/officers - List officers from MySQL with live workload counts
router.get('/officers', async (req: Request, res: Response) => {
  try {
    const dbOfficers = await prisma.officer.findMany({
      where: { active: true },
      orderBy: { currentWorkload: 'asc' },
    });

    const officers = dbOfficers.map(mapDbOfficer);

    return res.json({
      success: true,
      count: officers.length,
      officers,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /schedule/allocate - Scoring and slot allocation recommendation using live DB data
router.post('/allocate', async (req: Request, res: Response) => {
  try {
    const {
      instrumentId,
      instrumentName,
      category,
      state,
      district,
      requestedDate,
      lat,
      lng,
      isBulk,
      batchCount,
    } = req.body;

    const dbOfficers = await prisma.officer.findMany({
      where: { active: true },
    });

    const officers = dbOfficers.map(mapDbOfficer);

    const allocationRequest: AllocationRequest = {
      instrumentId,
      instrumentName: instrumentName || 'Weighing/Measuring Instrument',
      category: category || 'Commercial Measuring Equipment',
      state: state || 'Telangana',
      district: district || 'Hyderabad North',
      requestedDate: requestedDate || new Date().toISOString().split('T')[0],
      lat: typeof lat === 'number' ? lat : undefined,
      lng: typeof lng === 'number' ? lng : undefined,
      isBulk: Boolean(isBulk),
      batchCount: Number(batchCount) || 1,
    };

    if (allocationRequest.isBulk && (allocationRequest.batchCount || 1) > 1) {
      const bulkResult = allocateBulkBatch(allocationRequest, officers as any);
      return res.json({
        success: true,
        allocationType: 'bulk',
        result: bulkResult,
      });
    }

    const singleResult = allocateSingleSlot(allocationRequest, officers as any);
    return res.json({
      success: true,
      allocationType: 'single',
      result: singleResult,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /schedule/assign or /schedule/confirm - Atomically creates assignment via sp_CreateAssignment
router.post(['/assign', '/confirm'], async (req: Request, res: Response) => {
  try {
    const { applicationId, officerId, batchId } = req.body;

    if (!applicationId || !officerId) {
      return res.status(400).json({
        success: false,
        error: 'Both applicationId and officerId are required to create an assignment',
      });
    }

    // Call stored procedure sp_CreateAssignment
    await prisma.$queryRawUnsafe(
      'CALL sp_CreateAssignment(?, ?, ?)',
      applicationId,
      officerId,
      batchId || null
    );

    // Fetch the newly created assignment
    const assignment = await prisma.assignment.findFirst({
      where: {
        applicationId,
        assignedOfficerId: officerId,
      },
      include: {
        instrument: true,
        assignedOfficer: true,
        owner: true,
      },
      orderBy: { assignedAt: 'desc' },
    });

    return res.json({
      success: true,
      message: `Assignment successfully created and assigned to ${assignment?.assignedOfficer?.name}`,
      assignment,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /schedule/allocate-balanced - Distributes submitted verification requests evenly across all 5 officers
router.post('/allocate-balanced', async (req: Request, res: Response) => {
  try {
    const { applicationIds } = req.body;

    // Fetch applications to allocate
    let pendingApps: any[] = [];
    if (Array.isArray(applicationIds) && applicationIds.length > 0) {
      pendingApps = await prisma.application.findMany({
        where: { id: { in: applicationIds } },
        include: { instrument: true, owner: true },
        orderBy: { submittedAt: 'asc' },
      });
    } else {
      pendingApps = await prisma.application.findMany({
        where: { status: { in: ['SUBMITTED', 'IN_REVIEW'] } },
        include: { instrument: true, owner: true },
        orderBy: { submittedAt: 'asc' },
      });
    }

    // Fetch all active officers
    const officers = await prisma.officer.findMany({
      where: { active: true },
      orderBy: { currentWorkload: 'asc' },
    });

    if (officers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No active officers found in database to allocate to.',
      });
    }

    if (pendingApps.length === 0) {
      return res.json({
        success: true,
        message: 'No pending submitted requests to allocate. All requests are currently assigned.',
        allocatedCount: 0,
        officerDistribution: officers.map(o => ({
          officerId: o.id,
          officerName: o.name,
          role: o.role,
          assignedCount: 0,
          totalWorkload: o.currentWorkload,
        })),
        assignments: [],
      });
    }

    // Track workload in memory to distribute evenly in round-robin sequence across all 5 officers
    const officerWorkloads = officers.map(o => ({
      id: o.id,
      name: o.name,
      role: o.role,
      badgeNumber: o.badgeNumber,
      district: o.district,
      workload: o.currentWorkload,
      assignmentsMade: 0,
    }));

    const assignmentsCreated = [];

    for (const app of pendingApps) {
      // Pick officer with minimum current workload, breaking ties by least assignments made in this run
      officerWorkloads.sort((a, b) => a.workload - b.workload || a.assignmentsMade - b.assignmentsMade);
      const chosen = officerWorkloads[0];

      // Execute stored procedure sp_CreateAssignment
      await prisma.$queryRawUnsafe(
        'CALL sp_CreateAssignment(?, ?, ?)',
        app.id,
        chosen.id,
        null
      );

      // Increment in-memory counter for round-robin balancing
      chosen.workload += 1;
      chosen.assignmentsMade += 1;

      assignmentsCreated.push({
        applicationId: app.id,
        instrumentId: app.instrumentId,
        instrumentModel: app.instrument?.model || app.instrumentId,
        ownerName: app.owner?.businessName || app.owner?.name || 'Owner',
        officerId: chosen.id,
        officerName: chosen.name,
        officerRole: chosen.role,
      });
    }

    return res.json({
      success: true,
      message: `Successfully allocated ${assignmentsCreated.length} verification requests evenly across ${officers.length} officers.`,
      allocatedCount: assignmentsCreated.length,
      officerDistribution: officerWorkloads.map(o => ({
        officerId: o.id,
        officerName: o.name,
        role: o.role,
        assignedCount: o.assignmentsMade,
        totalWorkload: o.workload,
      })),
      assignments: assignmentsCreated,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

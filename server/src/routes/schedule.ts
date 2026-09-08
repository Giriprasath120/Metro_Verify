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
function mapDbOfficer(officer: any, liveWorkload?: number, slotBookings?: number) {
  const districtCoordinates: Record<string, { lat: number; lng: number }> = {
    'Chennai North': { lat: 17.4485, lng: 78.487 },
    'Chennai South': { lat: 17.3616, lng: 78.4747 },
    'Guindy': { lat: 17.4399, lng: 78.4983 },
    'Charminar Zone': { lat: 17.3616, lng: 78.4747 },
    'Cyberabad West': { lat: 17.4399, lng: 78.38 },
    'Chennai': { lat: 17.385, lng: 78.4867 },
    'New Delhi Central': { lat: 28.6433, lng: 77.1895 },
  };

  const coords = districtCoordinates[officer.district] || districtCoordinates[officer.jurisdiction] || { lat: 17.4485, lng: 78.487 };
  const today = new Date().toISOString().split('T')[0];

  return {
    id: officer.id,
    name: officer.name,
    role: officer.role as 'LMO' | 'GATC',
    badgeNumber: officer.badgeNumber,
    designation: officer.designation,
    district: officer.jurisdiction || officer.district,
    state: officer.state,
    lat: coords.lat,
    lng: coords.lng,
    pendingJobs: typeof liveWorkload === 'number' ? liveWorkload : officer.currentWorkload,
    slotBookings: typeof slotBookings === 'number' ? slotBookings : 0,
    maxCapacity: officer.maxCapacity || 20,
    availableDates: [today, '2026-09-06', '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-13', '2026-09-14', '2026-09-15'],
    contactNumber: officer.phone,
    gatcLabName: officer.role === 'GATC' ? officer.name : undefined,
  };
}

// GET /schedule/officers - List officers from MySQL with live workload counts
router.get('/officers', async (req: Request, res: Response) => {
  try {
    const dbOfficers = await prisma.officer.findMany({
      where: { active: true },
      orderBy: { id: 'asc' },
    });

    const officersWithLiveWorkload = await Promise.all(
      dbOfficers.map(async (o) => {
        const livePending = await prisma.assignment.count({
          where: {
            assignedOfficerId: o.id,
            status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          },
        });
        const cappedWorkload = Math.min(o.maxCapacity || 20, livePending);
        if (o.currentWorkload !== cappedWorkload) {
          await prisma.officer.update({
            where: { id: o.id },
            data: { currentWorkload: cappedWorkload }
          }).catch(() => {});
        }
        return mapDbOfficer(o, cappedWorkload);
      })
    );

    return res.json({
      success: true,
      count: officersWithLiveWorkload.length,
      officers: officersWithLiveWorkload,
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
      timeSlot,
      lat,
      lng,
      isBulk,
      batchCount,
    } = req.body;

    const dbOfficers = await prisma.officer.findMany({
      where: { active: true },
    });

    const targetDate = requestedDate || new Date().toISOString().split('T')[0];
    const targetSlot = timeSlot || '10:00 AM - 01:00 PM';

    // Enrich officers with live pending cases & live slot bookings on that date/slot
    const officers = await Promise.all(
      dbOfficers.map(async (o) => {
        const livePending = await prisma.assignment.count({
          where: {
            assignedOfficerId: o.id,
            status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          },
        });
        const slotBookings = await prisma.assignment.count({
          where: {
            assignedOfficerId: o.id,
            scheduledDate: targetDate,
            status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          },
        });
        return mapDbOfficer(o, livePending, slotBookings);
      })
    );

    const allocationRequest: AllocationRequest = {
      instrumentId,
      instrumentName: instrumentName || 'Weighing/Measuring Instrument',
      category: category || 'Commercial Measuring Equipment',
      state: state || 'Tamil Nadu',
      district: district || 'Chennai North',
      requestedDate: targetDate,
      timeSlot: targetSlot,
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
    const suggested = singleResult.suggestedOfficer;
    return res.json({
      success: true,
      allocationType: 'single',
      result: singleResult,
      allocation: {
        recommendedOfficer: {
          id: suggested.officer.id,
          name: suggested.officer.name,
          badgeNumber: suggested.officer.badgeNumber,
          district: suggested.officer.district,
          designation: suggested.officer.designation,
          pendingJobs: suggested.officer.pendingJobs,
          maxCapacity: suggested.officer.maxCapacity || 20,
        },
        compositeScore: suggested.totalScore,
        scoreBreakdown: {
          availability: suggested.breakdown.availabilityScore,
          workload: suggested.breakdown.workloadScore,
          proximity: suggested.breakdown.distanceScore,
          capacity: suggested.breakdown.jurisdictionScore,
        },
        scheduledDate: targetDate,
        timeSlot: targetSlot,
        rationale: suggested.explanation,
      }
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

    const { scheduledDate, timeSlot } = req.body;

    // Check target officer capacity
    const targetOfficer = await prisma.officer.findUnique({ where: { id: officerId } });
    if (!targetOfficer) {
      return res.status(404).json({ success: false, error: `Officer ${officerId} not found` });
    }

    const maxCap = targetOfficer.maxCapacity || 20;
    const liveWorkload = await prisma.assignment.count({
      where: {
        assignedOfficerId: officerId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      },
    });

    if (liveWorkload >= maxCap) {
      return res.status(400).json({
        success: false,
        error: `Officer ${targetOfficer.name} has reached maximum capacity (${liveWorkload}/${maxCap} assignments). Workload cannot exceed assigned limit. Please allocate to another officer.`,
      });
    }

    // Fetch application details to get instrumentId and ownerId
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { instrument: true, owner: true }
    });

    if (!app) {
      return res.status(404).json({ success: false, error: `Application ${applicationId} not found` });
    }

    const targetDate = scheduledDate || app.preferredDate || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
    const targetSlot = timeSlot || app.preferredTimeSlot || '10:00 AM - 01:00 PM';

    // 1. Execute assignment stored procedure if present, with graceful fallback to Prisma
    try {
      await prisma.$queryRawUnsafe(
        'CALL sp_CreateAssignment(?, ?, ?)',
        applicationId,
        officerId,
        batchId || null
      );
    } catch {
      // Fallback: create assignment directly
      const asgCount = await prisma.assignment.count();
      const asgId = `ASG-${String(asgCount + 1).padStart(4, '0')}`;
      await prisma.assignment.create({
        data: {
          id: asgId,
          applicationId,
          instrumentId: app.instrumentId,
          ownerId: app.ownerId,
          assignedOfficerId: officerId,
          batchId: batchId || null,
          status: 'SCHEDULED',
          scheduledDate: targetDate,
        }
      });
    }

    // 2. Update Application status to SCHEDULED
    await prisma.application.update({
      where: { id: applicationId },
      data: {
        status: 'SCHEDULED',
        preferredDate: targetDate,
        preferredTimeSlot: targetSlot,
      }
    });

    // 3. Update Instrument status and scheduling details
    if (app.instrumentId) {
      await prisma.instrument.update({
        where: { id: app.instrumentId },
        data: {
          status: 'SCHEDULED',
          scheduledDate: targetDate,
          timeSlot: targetSlot,
        }
      });
    }

    // 4. Update officer live workload correctly (never exceeding maxCapacity)
    const updatedPending = await prisma.assignment.count({
      where: {
        assignedOfficerId: officerId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      },
    });

    await prisma.officer.update({
      where: { id: officerId },
      data: { currentWorkload: Math.min(maxCap, updatedPending) }
    }).catch(() => {});

    // 5. Fetch the newly created assignment with relations
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
      message: `Assignment successfully created and assigned to ${assignment?.assignedOfficer?.name || 'Officer'}`,
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

    // Fetch all active field LMO officers (GATC is Stage 2 laboratory endorsement, not field verification)
    let officers = await prisma.officer.findMany({
      where: { active: true, role: 'LMO' },
      orderBy: { currentWorkload: 'asc' },
    });

    if (officers.length === 0) {
      // Fallback to any active officer if no specific LMO role flagged
      officers = await prisma.officer.findMany({
        where: { active: true },
        orderBy: { currentWorkload: 'asc' },
      });
    }

    if (officers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No active field officers found in database to allocate to.',
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

    // Track workload in memory to distribute evenly in round-robin sequence across field officers
    const officerWorkloads = officers.map(o => ({
      id: o.id,
      name: o.name,
      role: o.role,
      badgeNumber: o.badgeNumber,
      district: o.district,
      workload: o.currentWorkload,
      maxCapacity: o.maxCapacity || 20,
      assignmentsMade: 0,
    }));

    const assignmentsCreated = [];

    for (const app of pendingApps) {
      // Filter officers who haven't reached max capacity
      const eligibleOfficers = officerWorkloads.filter(o => o.workload < o.maxCapacity);
      if (eligibleOfficers.length === 0) {
        break; // All officers are at capacity
      }

      // Pick officer with minimum current workload, breaking ties by least assignments made in this run
      eligibleOfficers.sort((a, b) => a.workload - b.workload || a.assignmentsMade - b.assignmentsMade);
      const chosen = eligibleOfficers[0];

      // Execute assignment (fallback to direct creation if SP fails)
      try {
        await prisma.$queryRawUnsafe(
          'CALL sp_CreateAssignment(?, ?, ?)',
          app.id,
          chosen.id,
          null
        );
      } catch {
        const asgCount = await prisma.assignment.count();
        const asgId = `ASG-${String(asgCount + 1).padStart(4, '0')}`;
        await prisma.assignment.create({
          data: {
            id: asgId,
            applicationId: app.id,
            instrumentId: app.instrumentId,
            ownerId: app.ownerId,
            assignedOfficerId: chosen.id,
            status: 'SCHEDULED',
            scheduledDate: app.preferredDate || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
          }
        });
        await prisma.application.update({
          where: { id: app.id },
          data: { status: 'SCHEDULED' }
        });
        if (app.instrumentId) {
          await prisma.instrument.update({
            where: { id: app.instrumentId },
            data: { status: 'SCHEDULED' }
          });
        }
      }

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

    // Sync all officers' currentWorkload accurately
    for (const off of officers) {
      const realLive = await prisma.assignment.count({
        where: { assignedOfficerId: off.id, status: { in: ['SCHEDULED', 'IN_PROGRESS'] } }
      });
      await prisma.officer.update({
        where: { id: off.id },
        data: { currentWorkload: Math.min(off.maxCapacity || 20, realLive) }
      }).catch(() => {});
    }

    return res.json({
      success: true,
      message: `Successfully allocated ${assignmentsCreated.length} verification requests evenly across ${officers.length} officers without exceeding capacity.`,
      allocatedCount: assignmentsCreated.length,
      officerDistribution: officerWorkloads.map(o => ({
        officerId: o.id,
        officerName: o.name,
        role: o.role,
        assignedCount: o.assignmentsMade,
        totalWorkload: o.workload,
        maxCapacity: o.maxCapacity,
      })),
      assignments: assignmentsCreated,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

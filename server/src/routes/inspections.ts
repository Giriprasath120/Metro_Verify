import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateJWT, AuthRequest } from '../middleware/auth';

const router = Router();

// Ensure all inspection endpoints are authenticated
router.use(authenticateJWT);

// Helper to generate unique ID
const genId = (prefix: string) => `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;

// POST /api/inspections/:id/start - Start an inspection for an assignment or resume existing
router.post('/:id/start', async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const officerId = req.officerId!;
    const { assignmentId: bodyAssignmentId, instrumentId: bodyInstrumentId } = req.body;

    const assignmentId = bodyAssignmentId || idParam;

    // Check assignment
    const assignment = await prisma.assignment.findFirst({
      where: {
        OR: [{ id: assignmentId }, { instrumentId: idParam }],
        assignedOfficerId: officerId,
      },
      include: {
        instrument: true,
      },
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found or not assigned to your account',
      });
    }

    // Check if an inspection already exists
    let inspection = await prisma.inspection.findFirst({
      where: {
        assignmentId: assignment.id,
        status: 'IN_PROGRESS',
      },
    });

    if (!inspection) {
      inspection = await prisma.inspection.create({
        data: {
          id: genId('INSP'),
          assignmentId: assignment.id,
          instrumentId: assignment.instrumentId,
          officerId,
          applicationId: assignment.applicationId,
          status: 'IN_PROGRESS',
          startedAt: new Date(),
        },
      });

      // Update assignment and instrument status to IN_PROGRESS
      await prisma.assignment.update({
        where: { id: assignment.id },
        data: { status: 'IN_PROGRESS' },
      });
      await prisma.instrument.update({
        where: { id: assignment.instrumentId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    res.json({
      success: true,
      inspection,
      assignment,
      instrument: assignment.instrument,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/inspections/:id/results - Save measurement results & observations
router.post('/:id/results', async (req: AuthRequest, res: Response) => {
  try {
    const inspectionId = req.params.id;
    const officerId = req.officerId!;
    const {
      standardWeight,
      indicatedValue,
      errorMargin,
      toleranceLimit,
      result,
      observations,
      remarks,
    } = req.body;

    const inspection = await prisma.inspection.findFirst({
      where: { id: inspectionId, officerId },
    });

    if (!inspection) {
      return res.status(404).json({ success: false, error: 'Inspection not found' });
    }

    const updated = await prisma.inspection.update({
      where: { id: inspectionId },
      data: {
        standardWeight: standardWeight !== undefined ? String(standardWeight) : undefined,
        indicatedValue: indicatedValue !== undefined ? String(indicatedValue) : undefined,
        errorMargin: errorMargin !== undefined ? String(errorMargin) : undefined,
        toleranceLimit: toleranceLimit !== undefined ? String(toleranceLimit) : undefined,
        result: result || undefined,
        observations: observations || undefined,
        remarks: remarks || undefined,
      },
    });

    res.json({ success: true, inspection: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/inspections/:id/photos - Attach photo evidence
router.post('/:id/photos', async (req: AuthRequest, res: Response) => {
  try {
    const inspectionId = req.params.id;
    const officerId = req.officerId!;
    const { photoReference, photoBase64 } = req.body;

    const photoData = photoReference || photoBase64;
    if (!photoData) {
      return res.status(400).json({ success: false, error: 'No photo evidence provided' });
    }

    const inspection = await prisma.inspection.findFirst({
      where: { id: inspectionId, officerId },
    });

    if (!inspection) {
      return res.status(404).json({ success: false, error: 'Inspection not found' });
    }

    const updated = await prisma.inspection.update({
      where: { id: inspectionId },
      data: { photoReference: photoData },
    });

    res.json({
      success: true,
      message: 'Photo evidence attached successfully',
      inspectionId: updated.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/inspections/:id/location - Attach GPS and timestamp evidence
router.post('/:id/location', async (req: AuthRequest, res: Response) => {
  try {
    const inspectionId = req.params.id;
    const officerId = req.officerId!;
    const { latitude, longitude, locationTimestamp } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, error: 'Latitude and longitude required' });
    }

    const inspection = await prisma.inspection.findFirst({
      where: { id: inspectionId, officerId },
    });

    if (!inspection) {
      return res.status(404).json({ success: false, error: 'Inspection not found' });
    }

    const updated = await prisma.inspection.update({
      where: { id: inspectionId },
      data: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        locationTimestamp: locationTimestamp || new Date().toISOString(),
      },
    });

    res.json({
      success: true,
      message: 'GPS location attached successfully',
      latitude: updated.latitude,
      longitude: updated.longitude,
      timestamp: updated.locationTimestamp,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/inspections/:id/complete - Complete verification (PASS) via stored procedure sp_CompleteVerification
router.post('/:id/complete', async (req: AuthRequest, res: Response) => {
  try {
    const inspectionId = req.params.id;
    const officerId = req.officerId!;
    const {
      standardWeight,
      indicatedValue,
      errorMargin,
      toleranceLimit,
      observations,
      photoReference,
      latitude,
      longitude,
      locationTimestamp,
    } = req.body;

    // Check if inspection exists or find/create from assignment
    let inspection = await prisma.inspection.findFirst({
      where: {
        OR: [
          { id: inspectionId },
          { assignmentId: inspectionId },
          { applicationId: inspectionId },
          { instrumentId: inspectionId },
        ],
        officerId,
      },
    });

    if (!inspection) {
      // Find assignment to create inspection if needed
      const assignment = await prisma.assignment.findFirst({
        where: {
          OR: [
            { id: inspectionId },
            { instrumentId: inspectionId },
            { applicationId: inspectionId },
          ],
          assignedOfficerId: officerId,
        },
      });

      if (!assignment) {
        return res.status(404).json({ success: false, error: 'Inspection/Assignment not found' });
      }

      inspection = await prisma.inspection.create({
        data: {
          id: genId('INSP'),
          assignmentId: assignment.id,
          instrumentId: assignment.instrumentId,
          officerId,
          applicationId: assignment.applicationId,
          status: 'IN_PROGRESS',
        },
      });
    }

    // Update any final observation/evidence data before procedure call
    await prisma.inspection.update({
      where: { id: inspection.id },
      data: {
        standardWeight: standardWeight !== undefined ? String(standardWeight) : inspection.standardWeight,
        indicatedValue: indicatedValue !== undefined ? String(indicatedValue) : inspection.indicatedValue,
        errorMargin: errorMargin !== undefined ? String(errorMargin) : inspection.errorMargin,
        toleranceLimit: toleranceLimit !== undefined ? String(toleranceLimit) : inspection.toleranceLimit,
        observations: observations || inspection.observations,
        photoReference: photoReference || inspection.photoReference,
        latitude: latitude !== undefined ? parseFloat(latitude) : inspection.latitude,
        longitude: longitude !== undefined ? parseFloat(longitude) : inspection.longitude,
        locationTimestamp: locationTimestamp || inspection.locationTimestamp,
      },
    });

    // Execute atomic stored procedure sp_CompleteVerification with 'PASS'
    await prisma.$queryRawUnsafe('CALL sp_CompleteVerification(?, ?)', inspection.id, 'PASS');

    // Fetch newly created certificate and updated instrument
    const [updatedInspection, updatedInstrument, certificate] = await Promise.all([
      prisma.inspection.findUnique({ where: { id: inspection.id } }),
      prisma.instrument.findUnique({ where: { id: inspection.instrumentId } }),
      prisma.certificate.findFirst({
        where: { inspectionId: inspection.id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.json({
      success: true,
      message: 'Verification Completed Successfully',
      inspectionId: inspection.id,
      instrumentId: inspection.instrumentId,
      result: 'PASS',
      status: 'COMPLETED',
      instrument: updatedInstrument,
      certificate,
      evidence: {
        hasPhoto: !!updatedInspection?.photoReference,
        hasLocation: !!(updatedInspection?.latitude && updatedInspection?.longitude),
        latitude: updatedInspection?.latitude,
        longitude: updatedInspection?.longitude,
        timestamp: updatedInspection?.locationTimestamp || updatedInspection?.completedAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/inspections/:id/failure - Record verification failure via stored procedure sp_CompleteVerification
router.post('/:id/failure', async (req: AuthRequest, res: Response) => {
  try {
    const inspectionId = req.params.id;
    const officerId = req.officerId!;
    const {
      standardWeight,
      indicatedValue,
      errorMargin,
      toleranceLimit,
      observations,
      photoReference,
      latitude,
      longitude,
      locationTimestamp,
    } = req.body;

    let inspection = await prisma.inspection.findFirst({
      where: {
        OR: [
          { id: inspectionId },
          { assignmentId: inspectionId },
          { applicationId: inspectionId },
          { instrumentId: inspectionId },
        ],
        officerId,
      },
    });

    if (!inspection) {
      const assignment = await prisma.assignment.findFirst({
        where: {
          OR: [
            { id: inspectionId },
            { instrumentId: inspectionId },
            { applicationId: inspectionId },
          ],
          assignedOfficerId: officerId,
        },
      });

      if (!assignment) {
        return res.status(404).json({ success: false, error: 'Inspection/Assignment not found' });
      }

      inspection = await prisma.inspection.create({
        data: {
          id: genId('INSP'),
          assignmentId: assignment.id,
          instrumentId: assignment.instrumentId,
          officerId,
          applicationId: assignment.applicationId,
          status: 'IN_PROGRESS',
        },
      });
    }

    // Update measurements
    await prisma.inspection.update({
      where: { id: inspection.id },
      data: {
        standardWeight: standardWeight !== undefined ? String(standardWeight) : inspection.standardWeight,
        indicatedValue: indicatedValue !== undefined ? String(indicatedValue) : inspection.indicatedValue,
        errorMargin: errorMargin !== undefined ? String(errorMargin) : inspection.errorMargin,
        toleranceLimit: toleranceLimit !== undefined ? String(toleranceLimit) : inspection.toleranceLimit,
        observations: observations || inspection.observations,
        photoReference: photoReference || inspection.photoReference,
        latitude: latitude !== undefined ? parseFloat(latitude) : inspection.latitude,
        longitude: longitude !== undefined ? parseFloat(longitude) : inspection.longitude,
        locationTimestamp: locationTimestamp || inspection.locationTimestamp,
      },
    });

    // Execute atomic stored procedure sp_CompleteVerification with 'FAIL'
    await prisma.$queryRawUnsafe('CALL sp_CompleteVerification(?, ?)', inspection.id, 'FAIL');

    const [updatedInspection, updatedInstrument] = await Promise.all([
      prisma.inspection.findUnique({ where: { id: inspection.id } }),
      prisma.instrument.findUnique({ where: { id: inspection.instrumentId } }),
    ]);

    res.json({
      success: true,
      message: 'Verification Recorded as FAILED — Reinspection Required',
      inspectionId: inspection.id,
      instrumentId: inspection.instrumentId,
      result: 'FAIL',
      status: 'REINSPECTION_REQUIRED',
      instrument: updatedInstrument,
      certificate: null, // Guaranteed null on FAIL
      evidence: {
        hasPhoto: !!updatedInspection?.photoReference,
        hasLocation: !!(updatedInspection?.latitude && updatedInspection?.longitude),
        timestamp: updatedInspection?.completedAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/inspections/:id/reinspection - Trigger reinspection request
router.post('/:id/reinspection', async (req: AuthRequest, res: Response) => {
  try {
    const idParam = req.params.id;
    const { preferredDate, remarks } = req.body;

    const assignment = await prisma.assignment.findFirst({
      where: {
        OR: [{ id: idParam }, { instrumentId: idParam }],
      },
    });

    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }

    const updatedAssignment = await prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        status: 'REINSPECTION_REQUIRED',
        scheduledDate: preferredDate || assignment.scheduledDate,
      },
    });

    await prisma.instrument.update({
      where: { id: assignment.instrumentId },
      data: { status: 'REINSPECTION_REQUIRED' },
    });

    res.json({
      success: true,
      message: 'Reinspection scheduled',
      assignment: updatedAssignment,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateJWT, AuthRequest } from '../middleware/auth';

const router = Router();

// Ensure officer authentication
router.use(authenticateJWT);

const genId = (prefix: string) => `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;

// GET /api/offline/status - Check sync connectivity and pending count
router.get('/status', async (req: AuthRequest, res: Response) => {
  try {
    const officerId = req.officerId!;
    const pendingCount = await prisma.inspection.count({
      where: {
        officerId,
        isOffline: true,
        syncedAt: null,
      },
    });

    res.json({
      success: true,
      online: true,
      officerId,
      serverTime: new Date().toISOString(),
      pendingSyncCount: pendingCount,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/offline/sync - Synchronize locally queued verifications to MySQL
router.post('/sync', async (req: AuthRequest, res: Response) => {
  try {
    const officerId = req.officerId!;
    let { verifications } = req.body;

    // Support single record or array
    if (!verifications && req.body.instrumentId) {
      verifications = [req.body];
    }

    if (!Array.isArray(verifications) || verifications.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No offline verifications provided in request',
      });
    }

    const syncResults: any[] = [];

    for (const item of verifications) {
      const {
        assignmentId,
        instrumentId,
        result = 'PASS',
        standardWeight,
        indicatedValue,
        errorMargin,
        toleranceLimit,
        observations,
        remarks,
        photoReference,
        latitude,
        longitude,
        locationTimestamp,
        localId,
      } = item;

      // Find assignment
      const assignment = await prisma.assignment.findFirst({
        where: {
          OR: [
            assignmentId ? { id: assignmentId } : undefined,
            instrumentId ? { instrumentId } : undefined,
          ].filter(Boolean) as any,
          assignedOfficerId: officerId,
        },
      });

      if (!assignment) {
        syncResults.push({
          localId,
          instrumentId,
          status: 'ERROR',
          error: 'Assignment not found or not assigned to you',
        });
        continue;
      }

      // Check if already synced / completed to prevent duplicate submissions on retry
      if (assignment.status === 'COMPLETED') {
        const cert = await prisma.certificate.findFirst({
          where: { instrumentId: assignment.instrumentId },
          orderBy: { createdAt: 'desc' },
        });

        syncResults.push({
          localId,
          instrumentId: assignment.instrumentId,
          assignmentId: assignment.id,
          status: 'ALREADY_SYNCED',
          message: 'Already completed in database',
          certificateNumber: cert?.certificateNumber,
        });
        continue;
      }

      // Create or update inspection
      let inspection = await prisma.inspection.findFirst({
        where: {
          assignmentId: assignment.id,
          officerId,
        },
      });

      if (!inspection) {
        inspection = await prisma.inspection.create({
          data: {
            id: genId('INSP-OFF'),
            assignmentId: assignment.id,
            instrumentId: assignment.instrumentId,
            officerId,
            applicationId: assignment.applicationId,
            status: 'IN_PROGRESS',
            isOffline: true,
            syncedAt: new Date(),
          },
        });
      }

      await prisma.inspection.update({
        where: { id: inspection.id },
        data: {
          standardWeight: standardWeight !== undefined ? String(standardWeight) : undefined,
          indicatedValue: indicatedValue !== undefined ? String(indicatedValue) : undefined,
          errorMargin: errorMargin !== undefined ? String(errorMargin) : undefined,
          toleranceLimit: toleranceLimit !== undefined ? String(toleranceLimit) : undefined,
          observations: observations || undefined,
          remarks: remarks || undefined,
          photoReference: photoReference || undefined,
          latitude: latitude !== undefined ? parseFloat(latitude) : undefined,
          longitude: longitude !== undefined ? parseFloat(longitude) : undefined,
          locationTimestamp: locationTimestamp || new Date().toISOString(),
          isOffline: true,
          syncedAt: new Date(),
        },
      });

      // Execute stored procedure atomically
      const passOrFail = String(result).toUpperCase() === 'PASS' ? 'PASS' : 'FAIL';
      await prisma.$queryRawUnsafe('CALL sp_CompleteVerification(?, ?)', inspection.id, passOrFail);

      // Retrieve certificate if PASS
      let certificate = null;
      if (passOrFail === 'PASS') {
        certificate = await prisma.certificate.findFirst({
          where: { inspectionId: inspection.id },
          orderBy: { createdAt: 'desc' },
        });
      }

      syncResults.push({
        localId,
        assignmentId: assignment.id,
        instrumentId: assignment.instrumentId,
        inspectionId: inspection.id,
        status: 'SYNCED',
        result: passOrFail,
        certificate: certificate ? {
          certificateNumber: certificate.certificateNumber,
          issueDate: certificate.issueDate,
          validUntil: certificate.validUntil,
        } : null,
      });
    }

    res.json({
      success: true,
      message: `Successfully synchronized ${syncResults.filter(r => r.status === 'SYNCED').length} verification(s)`,
      syncedCount: syncResults.filter(r => r.status === 'SYNCED').length,
      results: syncResults,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

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

// POST /api/inspections/:id/pass-to-gatc - LMO Officer completes field verification and passes it to GATC Lab
router.post('/:id/pass-to-gatc', async (req: AuthRequest, res: Response) => {
  try {
    const inspectionId = req.params.id;
    const officerId = req.officerId!;
    const {
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
    } = req.body;

    let inspection = await prisma.inspection.findFirst({
      where: {
        OR: [
          { id: inspectionId },
          { assignmentId: inspectionId },
          { applicationId: inspectionId },
          { instrumentId: inspectionId },
        ],
      },
      include: {
        assignment: true,
        instrument: true,
        officer: true,
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
        },
        include: { instrument: true, assignedOfficer: true },
      });

      if (!assignment) {
        return res.status(404).json({ success: false, error: 'Assignment not found' });
      }

      inspection = await prisma.inspection.create({
        data: {
          id: genId('INSP'),
          assignmentId: assignment.id,
          instrumentId: assignment.instrumentId,
          officerId: assignment.assignedOfficerId || officerId,
          applicationId: assignment.applicationId,
          status: 'IN_PROGRESS',
        },
        include: {
          assignment: true,
          instrument: true,
          officer: true,
        },
      });
    }

    // Generate official LMO Field Verification Certificate
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const lmoCertId = genId('LMO-CERT');
    const lmoCertNumber = `LMO-CERT-TS-${today.getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const lmoSealNumber = `TS-SEAL-${Math.floor(100000 + Math.random() * 900000)}`;

    const lmoCertificate = {
      id: lmoCertId,
      certificateNumber: lmoCertNumber,
      sealNumber: lmoSealNumber,
      type: 'LMO_FIELD_VERIFICATION_CERTIFICATE',
      title: 'Field Verification & Preliminary Test Certificate',
      instrumentId: inspection.instrumentId,
      instrumentModel: (inspection as any).instrument?.model || 'Commercial Scale',
      category: (inspection as any).instrument?.category || 'Weighing Instrument',
      ownerName: (inspection.assignment as any)?.owner?.businessName || (inspection.assignment as any)?.owner?.name || 'Authorized Trader',
      issueDate: todayStr,
      officerName: inspection.officer.name,
      officerBadge: inspection.officer.badgeNumber,
      officerDesignation: inspection.officer.designation || 'Legal Metrology Officer (LMO)',
      district: inspection.officer.district || 'Chennai North',
      standardWeight: standardWeight !== undefined ? String(standardWeight) : inspection.standardWeight || '20 kg',
      indicatedValue: indicatedValue !== undefined ? String(indicatedValue) : inspection.indicatedValue || '20.000 kg',
      errorMargin: errorMargin !== undefined ? String(errorMargin) : inspection.errorMargin || '0.00%',
      toleranceLimit: toleranceLimit !== undefined ? String(toleranceLimit) : inspection.toleranceLimit || '±0.05%',
      status: 'CERTIFIED_BY_LMO_PASSED_TO_GATC',
      gatcTargetLab: 'Tamil Nadu State Legal Metrology Central Laboratory (GATC-01)',
      certifiedAt: today.toISOString(),
      remarks: remarks || inspection.remarks || 'Passed field calibration tests by LMO. Certified and passed to GATC Centre for Form VI Laboratory Endorsement.',
    };

    const finalRemarks = `${remarks || inspection.remarks || 'Passed field calibration tests by LMO. Certified & passed to GATC for final laboratory endorsement.'}\n[LMO_CERTIFICATE_ISSUED]: ${JSON.stringify(lmoCertificate)}`;

    // Save field test results, LMO certificate slip, and pass to GATC
    const updatedInspection = await prisma.inspection.update({
      where: { id: inspection.id },
      data: {
        standardWeight: standardWeight !== undefined ? String(standardWeight) : inspection.standardWeight,
        indicatedValue: indicatedValue !== undefined ? String(indicatedValue) : inspection.indicatedValue,
        errorMargin: errorMargin !== undefined ? String(errorMargin) : inspection.errorMargin,
        toleranceLimit: toleranceLimit !== undefined ? String(toleranceLimit) : inspection.toleranceLimit,
        result: 'PASS',
        observations: observations || inspection.observations,
        remarks: finalRemarks,
        photoReference: photoReference || inspection.photoReference,
        latitude: latitude !== undefined ? parseFloat(latitude) : inspection.latitude,
        longitude: longitude !== undefined ? parseFloat(longitude) : inspection.longitude,
        locationTimestamp: locationTimestamp || new Date().toISOString(),
        status: 'PASSED_TO_GATC',
      },
      include: {
        instrument: true,
        officer: true,
      },
    });

    // Update assignment and instrument status
    await prisma.assignment.update({
      where: { id: inspection.assignmentId },
      data: { status: 'PASSED_TO_GATC' },
    });

    await prisma.instrument.update({
      where: { id: inspection.instrumentId },
      data: { status: 'PASSED_TO_GATC' },
    });

    return res.json({
      success: true,
      message: 'Field Verification Passed by LMO. Official LMO Field Certificate Issued & Handed off to GATC Centre.',
      status: 'PASSED_TO_GATC',
      inspection: updatedInspection,
      instrument: updatedInspection.instrument,
      verifyingOfficer: updatedInspection.officer.name,
      lmoCertificate,
      gatcTarget: 'Tamil Nadu State Legal Metrology Central Laboratory (GATC-01)',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/inspections/pending-gatc - List all inspections awaiting GATC laboratory endorsement with LMO Certificates
router.get('/pending-gatc', async (_req: AuthRequest, res: Response) => {
  try {
    const inspections = await prisma.inspection.findMany({
      where: { status: 'PASSED_TO_GATC' },
      include: {
        instrument: true,
        officer: true,
        assignment: {
          include: {
            owner: true,
          },
        },
        application: true,
      },
      orderBy: { startedAt: 'desc' },
    });

    const enhanced = inspections.map((insp) => {
      let lmoCertificate: any = null;
      if (insp.remarks && insp.remarks.includes('[LMO_CERTIFICATE_ISSUED]:')) {
        try {
          const jsonPart = insp.remarks.split('[LMO_CERTIFICATE_ISSUED]:')[1]?.trim();
          if (jsonPart) {
            lmoCertificate = JSON.parse(jsonPart);
          }
        } catch (e) {
          // ignore
        }
      }

      if (!lmoCertificate) {
        lmoCertificate = {
          id: `LMO-CERT-${insp.id}`,
          certificateNumber: `LMO-CERT-TS-2026-${insp.id.replace(/\D/g, '').slice(0, 5) || '72914'}`,
          sealNumber: `TS-SEAL-${insp.id.replace(/\D/g, '').slice(-6) || '482910'}`,
          type: 'LMO_FIELD_VERIFICATION_CERTIFICATE',
          title: 'Field Verification & Preliminary Test Certificate',
          instrumentId: insp.instrumentId,
          instrumentModel: insp.instrument?.model || 'Commercial Measuring Instrument',
          category: insp.instrument?.category || 'Weighing Scale',
          ownerName: insp.assignment?.owner?.businessName || insp.assignment?.owner?.name || 'Registered Trader',
          issueDate: insp.startedAt ? insp.startedAt.toISOString().split('T')[0] : '2026-09-06',
          officerName: insp.officer?.name || 'V. Ramanathan',
          officerBadge: insp.officer?.badgeNumber || 'LMO-TS-HYD-041',
          officerDesignation: insp.officer?.designation || 'Legal Metrology Officer (LMO)',
          district: insp.officer?.district || 'Chennai North',
          standardWeight: insp.standardWeight || '20 kg',
          indicatedValue: insp.indicatedValue || '20.000 kg',
          errorMargin: insp.errorMargin || '0.00%',
          toleranceLimit: insp.toleranceLimit || '±0.05%',
          status: 'CERTIFIED_BY_LMO_PASSED_TO_GATC',
          gatcTargetLab: 'Tamil Nadu State Legal Metrology Central Laboratory (GATC-01)',
          certifiedAt: insp.startedAt || new Date().toISOString(),
          remarks: insp.remarks || 'Passed field calibration tests by LMO.',
        };
      }

      return {
        ...insp,
        lmoCertificate,
      };
    });

    return res.json({
      success: true,
      count: enhanced.length,
      inspections: enhanced,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/inspections/:id/gatc-endorse - GATC Laboratory reviews LMO field results and issues Form VI Certificate
router.post('/:id/gatc-endorse', async (req: AuthRequest, res: Response) => {
  try {
    const inspectionId = req.params.id;
    const { labRemarks } = req.body;

    const inspection = await prisma.inspection.findFirst({
      where: {
        OR: [
          { id: inspectionId },
          { assignmentId: inspectionId },
          { instrumentId: inspectionId },
        ],
      },
      include: {
        instrument: true,
        officer: true,
        assignment: {
          include: {
            owner: true,
          },
        },
      },
    });

    if (!inspection) {
      return res.status(404).json({ success: false, error: 'Inspection record not found' });
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const expiryDate = new Date(today);
    expiryDate.setFullYear(today.getFullYear() + 1);
    const expiryStr = expiryDate.toISOString().split('T')[0];

    const certId = genId('CERT');
    const certNumber = `IND/LM/TS/${today.getFullYear().toString().slice(-2)}/${Math.floor(1000 + Math.random() * 9000)}`;

    const certPayload = JSON.stringify({
      certNumber,
      instrumentId: inspection.instrumentId,
      ownerId: inspection.assignment.ownerId,
      issueDate: todayStr,
      validUntil: expiryStr,
      verifyingOfficer: inspection.officer.name,
      officerBadge: inspection.officer.badgeNumber,
      endorsingLab: 'Tamil Nadu State Legal Metrology Central Laboratory (GATC-01)',
      status: 'ACTIVE',
      verifyUrl: `/verify/${certId}`,
    });

    // 1. Create Certificate in MySQL with dual endorsement
    const certificate = await prisma.certificate.create({
      data: {
        id: certId,
        certificateNumber: certNumber,
        instrumentId: inspection.instrumentId,
        ownerId: inspection.assignment.ownerId,
        applicationId: inspection.applicationId,
        inspectionId: inspection.id,
        issueDate: todayStr,
        validUntil: expiryStr,
        officerName: inspection.officer.name,
        officerBadge: inspection.officer.badgeNumber,
        officerDesignation: inspection.officer.designation,
        gatcLabName: 'Tamil Nadu State Legal Metrology Central Laboratory',
        gatcOfficerName: 'Central Testing Directorate',
        gatcOfficerBadge: 'GATC-TS-01',
        gatcApproved: true,
        gatcApprovalDate: todayStr,
        qrCodeData: certPayload,
        status: 'ACTIVE',
      },
    });

    // 2. Mark inspection COMPLETED
    await prisma.inspection.update({
      where: { id: inspection.id },
      data: {
        status: 'COMPLETED',
        completedAt: today,
        remarks: labRemarks
          ? `${inspection.remarks || ''}\n[GATC Laboratory Endorsement]: ${labRemarks}`
          : inspection.remarks,
      },
    });

    // 3. Mark assignment COMPLETED
    await prisma.assignment.update({
      where: { id: inspection.assignmentId },
      data: { status: 'COMPLETED' },
    });

    // 4. Update instrument status to VERIFIED and attach certificate
    const updatedInstrument = await prisma.instrument.update({
      where: { id: inspection.instrumentId },
      data: {
        status: 'VERIFIED',
        certificateId: certificate.id,
        lastVerifiedDate: todayStr,
        expiryDate: expiryStr,
      },
    });

    // 5. Decrement LMO workload if > 0
    if (inspection.officer.currentWorkload > 0) {
      await prisma.officer.update({
        where: { id: inspection.officer.id },
        data: { currentWorkload: { decrement: 1 } },
      });
    }

    return res.json({
      success: true,
      message: 'Certificate issued with GATC Laboratory Endorsement & QR Code.',
      certificate,
      instrument: updatedInstrument,
      verifyingOfficer: inspection.officer.name,
      gatcLab: 'Tamil Nadu State Legal Metrology Central Laboratory',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
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


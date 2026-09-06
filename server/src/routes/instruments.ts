import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /instruments & /api/instruments - List instruments from MySQL
router.get('/', async (req: Request, res: Response) => {
  try {
    const { ownerId, status, district } = req.query;
    const where: any = {};

    if (ownerId) where.ownerId = String(ownerId);
    if (status) {
      where.status = String(status).toUpperCase().replace(/ /g, '_');
    }
    if (district) {
      where.district = { contains: String(district) };
    }

    const instruments = await prisma.instrument.findMany({
      where,
      include: {
        certificates: {
          where: { status: 'ACTIVE' },
          take: 1,
        },
        owner: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      count: instruments.length,
      instruments,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /instruments & /api/instruments - Register a new instrument in MySQL
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      serialNumber,
      model,
      manufacturer,
      category,
      subCategory,
      capacity,
      accuracyClass,
      ownerId,
      location,
      district,
      state,
    } = req.body;

    const count = await prisma.instrument.count();
    const instId = `INST-TS-${String(count + 1).padStart(2, '0')}`;

    // Verify or fallback owner
    let owner = await prisma.owner.findUnique({ where: { id: ownerId || 'OWN-101' } });
    if (!owner) {
      owner = await prisma.owner.findFirst();
    }
    const finalOwnerId = owner?.id || 'OWN-101';

    const newInst = await prisma.instrument.create({
      data: {
        id: instId,
        serialNumber: serialNumber || `SN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        model: model || 'Standard Weighing Scale',
        manufacturer: manufacturer || 'Indigenous Metrology Mfr',
        category: category || 'Non-Automatic Weighing Instrument',
        subCategory: subCategory || 'General Trade Scale',
        capacity: capacity || '50 kg',
        accuracyClass: accuracyClass || 'Class III',
        ownerId: finalOwnerId,
        location: location || 'Trade Premises, Osmangunj, Hyderabad',
        district: district || 'Hyderabad North',
        state: state || 'Telangana',
        status: 'PENDING',
      },
      include: {
        owner: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Instrument successfully registered in Metro Verify',
      instrument: newInst,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /instruments/:id/passport & /api/instruments/:id/passport - Dynamic Digital Passport Timeline
router.get('/:id/passport', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const instrument = await prisma.instrument.findFirst({
      where: {
        OR: [{ id }, { serialNumber: id }],
      },
      include: {
        owner: true,
        certificates: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        assignments: {
          include: {
            assignedOfficer: true,
          },
          orderBy: { assignedAt: 'desc' },
          take: 1,
        },
        inspections: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!instrument) {
      return res.status(404).json({ success: false, message: `Instrument ${id} not found.` });
    }

    const latestCert = instrument.certificates[0];
    const latestAsg = instrument.assignments[0];
    const latestInsp = instrument.inspections[0];

    const isVerified = instrument.status === 'VERIFIED';
    const isScheduled = ['SCHEDULED', 'IN_PROGRESS', 'VERIFIED'].includes(instrument.status);
    const isFieldVerified = !!latestInsp && latestInsp.status === 'COMPLETED';

    const passportTimeline = [
      {
        stage: 'Registered',
        date: instrument.createdAt.toISOString().split('T')[0],
        officerName: 'Portal Online Registration',
        note: `Registered by ${instrument.owner.businessName}. Status: Registered.`,
        completed: true,
      },
      {
        stage: 'Verification Requested',
        date: latestAsg ? latestAsg.assignedAt.toISOString().split('T')[0] : instrument.createdAt.toISOString().split('T')[0],
        officerName: 'Owner Submission',
        note: 'Statutory verification requested under Legal Metrology Act, 2009.',
        completed: true,
      },
      {
        stage: 'Inspection Scheduled',
        date: instrument.scheduledDate || (latestAsg ? latestAsg.scheduledDate : 'Pending'),
        officerName: latestAsg?.assignedOfficer?.name || 'Officer Allocation Engine',
        note: latestAsg ? `Assigned to ${latestAsg.assignedOfficer.name} (${latestAsg.assignedOfficer.badgeNumber})` : 'Awaiting officer allocation',
        completed: isScheduled,
      },
      {
        stage: 'Field-Verified',
        date: latestInsp?.completedAt ? latestInsp.completedAt.toISOString().split('T')[0] : (instrument.lastVerifiedDate || 'Pending'),
        officerName: latestAsg?.assignedOfficer?.name || 'Assigned Inspector',
        note: isFieldVerified ? `Physical verification completed. Result: ${latestInsp.result || 'PASS'}.` : 'Pending physical test and sealing.',
        completed: isFieldVerified || isVerified,
      },
      {
        stage: 'Certificate Issued',
        date: latestCert?.issueDate || (instrument.lastVerifiedDate || 'Pending'),
        officerName: latestCert?.officerName || 'Controller of Legal Metrology',
        note: latestCert ? `Form VI Certificate ${latestCert.certificateNumber} issued. Valid until ${latestCert.validUntil}.` : 'Awaiting verification completion.',
        completed: isVerified,
      },
      {
        stage: 'Next Due',
        date: instrument.expiryDate || '1 Year from verification',
        officerName: 'Department of Legal Metrology',
        note: 'Periodic statutory re-verification cycle.',
        completed: false,
      },
    ];

    return res.json({
      success: true,
      instrumentId: instrument.id,
      serialNumber: instrument.serialNumber,
      model: instrument.model,
      manufacturer: instrument.manufacturer,
      status: instrument.status,
      owner: instrument.owner,
      activeCertificate: latestCert || null,
      timeline: passportTimeline,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /instruments/:id & /api/instruments/:id - Single instrument detail
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const instrument = await prisma.instrument.findFirst({
      where: {
        OR: [{ id }, { serialNumber: id }],
      },
      include: {
        owner: true,
        certificates: {
          orderBy: { createdAt: 'desc' },
        },
        assignments: {
          include: {
            assignedOfficer: true,
          },
        },
      },
    });

    if (!instrument) {
      return res.status(404).json({ success: false, message: `Instrument ${id} not found.` });
    }

    return res.json({
      success: true,
      instrument,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

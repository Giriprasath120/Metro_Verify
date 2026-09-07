import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { calculateVerificationFee } from '../config/pricing';
import { allocateSingleSlot } from '../utils/allocationEngine';

const router = Router();

// GET /api/applications - List applications from MySQL
router.get('/', async (req: Request, res: Response) => {
  try {
    const { ownerId, status, includeWithdrawn } = req.query;
    const where: any = {};

    if (ownerId) where.ownerId = String(ownerId);
    if (status) {
      where.status = String(status).toUpperCase();
    } else if (includeWithdrawn !== 'true') {
      where.status = { not: 'WITHDRAWN' };
    }

    const applications = await prisma.application.findMany({
      where,
      include: {
        instrument: true,
        owner: true,
        assignments: {
          include: {
            assignedOfficer: true,
          },
          orderBy: { assignedAt: 'desc' },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return res.json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/applications/:id - Single application detail
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        instrument: true,
        owner: true,
        assignments: {
          include: {
            assignedOfficer: true,
          },
          orderBy: { assignedAt: 'desc' },
        },
      },
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: `Application ${id} not found.`,
      });
    }

    return res.json({
      success: true,
      application,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/applications - Create a new verification request in MySQL
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      instrumentId,
      instrumentName,
      serialNumber,
      manufacturer,
      model,
      ownerId,
      category,
      capacity,
      accuracyClass,
      preferredDate,
      preferredTimeSlot,
      location,
      remarks,
    } = req.body;

    let finalOwnerId = ownerId || 'OWN-101';
    let owner = await prisma.owner.findUnique({ where: { id: finalOwnerId } });
    if (!owner) {
      owner = await prisma.owner.findFirst();
      if (owner) finalOwnerId = owner.id;
    }

    let instrument = null;
    let finalInstrumentId = instrumentId;

    if (finalInstrumentId && finalInstrumentId !== 'NEW') {
      instrument = await prisma.instrument.findUnique({ where: { id: finalInstrumentId } });
    }

    // Auto-create instrument in MySQL if it does not exist or if instrumentId === 'NEW'
    if (!instrument) {
      const instCount = await prisma.instrument.count();
      finalInstrumentId = (!finalInstrumentId || finalInstrumentId === 'NEW')
        ? `INST-TS-${String(instCount + 1).padStart(2, '0')}`
        : finalInstrumentId;

      const instModel = instrumentName || model || 'Commercial Scale';
      const instCat = category || 'Non-Automatic Weighing Instrument';
      const instCap = capacity || '50 kg';
      const instAcc = accuracyClass || 'Class III';
      const instLoc = location || 'Trade Premises, George Town, Chennai';
      const instSerial = serialNumber || `SN-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      instrument = await prisma.instrument.create({
        data: {
          id: finalInstrumentId,
          serialNumber: instSerial,
          model: instModel,
          manufacturer: manufacturer || 'Indigenous Metrology Mfr',
          category: instCat,
          subCategory: 'General Commercial Scale',
          capacity: instCap,
          accuracyClass: instAcc,
          ownerId: finalOwnerId,
          location: instLoc,
          district: 'Chennai North',
          state: 'Tamil Nadu',
          status: 'PENDING',
        },
      });
      console.log(`[Auto-Register] Created new instrument ${finalInstrumentId} (${instModel}) in MySQL.`);
    }

    const count = await prisma.application.count();
    const appId = `APP-2026-${String(count + 1045)}`;

    const cat = category || instrument.category || 'Non-Automatic Weighing Instrument';
    const accClass = accuracyClass || instrument.accuracyClass || 'Class III';
    const cap = capacity || instrument.capacity || '50 kg';
    const feeCalculation = calculateVerificationFee(cat, accClass, cap);

    const newApp = await prisma.application.create({
      data: {
        id: appId,
        instrumentId: instrument.id,
        ownerId: finalOwnerId,
        category: cat,
        capacity: cap,
        accuracyClass: accClass,
        preferredDate: preferredDate || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
        preferredTimeSlot: preferredTimeSlot || '10:00 AM - 01:00 PM',
        status: 'SUBMITTED',
        fee: feeCalculation.totalFee,
        ruleReference: feeCalculation.ruleReference,
        location: location || instrument.location,
        remarks: remarks || 'Standard statutory verification request under Rule 14.',
      },
      include: {
        instrument: true,
        owner: true,
      },
    });

    // Newly submitted applications remain in 'SUBMITTED' state awaiting admin review & allocation
    return res.status(201).json({
      success: true,
      message: `Verification application ${appId} submitted successfully for ₹${feeCalculation.totalFee}. Placed in administrative queue for officer allocation.`,
      application: newApp,
      instrument,
    });
  } catch (error: any) {
    console.error('Error creating application:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/applications/:id/withdraw - Withdraw request
router.post('/:id/withdraw', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const application = await prisma.application.findUnique({ where: { id } });
    if (!application) {
      return res.status(404).json({ success: false, message: `Application ${id} not found.` });
    }

    const updated = await prisma.application.update({
      where: { id },
      data: {
        status: 'WITHDRAWN',
        withdrawnAt: new Date(),
        remarks: reason ? `${application.remarks || ''} [Withdrawn: ${reason}]` : application.remarks,
      },
    });

    // Reset instrument status
    await prisma.instrument.update({
      where: { id: application.instrumentId },
      data: { status: 'PENDING', scheduledDate: null, timeSlot: null },
    });

    return res.json({
      success: true,
      message: `Application ${id} withdrawn successfully. It will no longer appear in active lists.`,
      application: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

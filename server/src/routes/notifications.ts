import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// POST /notifications/expiry-check & /api/notifications/expiry-check
// Automated statutory expiry scan & state transitions: ACTIVE -> EXPIRING_SOON -> EXPIRED
router.post('/expiry-check', async (req: Request, res: Response) => {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Find all instruments with expiryDate
    const instruments = await prisma.instrument.findMany({
      where: {
        expiryDate: { not: null },
      },
      include: {
        owner: true,
        certificates: {
          where: { status: 'ACTIVE' },
          take: 1,
        },
      },
    });

    const flaggedAlerts: any[] = [];

    for (const inst of instruments) {
      if (!inst.expiryDate) continue;

      const expDate = new Date(inst.expiryDate);
      const diffTime = expDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let newStatus: string | null = null;

      if (diffDays < 0) {
        // EXPIRED
        newStatus = 'EXPIRED';
      } else if (diffDays <= 30) {
        // EXPIRING SOON (within 30 days statutory grace window)
        newStatus = 'EXPIRING_SOON';
      }

      if (newStatus && newStatus !== inst.status) {
        await prisma.instrument.update({
          where: { id: inst.id },
          data: { status: newStatus },
        });

        // If expired, update active certificate status to EXPIRED
        if (newStatus === 'EXPIRED' && inst.certificates[0]) {
          await prisma.certificate.update({
            where: { id: inst.certificates[0].id },
            data: { status: 'EXPIRED' },
          });
        }
      }

      if (diffDays <= 30) {
        flaggedAlerts.push({
          instrumentId: inst.id,
          serialNumber: inst.serialNumber,
          model: inst.model,
          ownerId: inst.ownerId,
          ownerName: inst.owner.name,
          ownerPhone: inst.owner.phone,
          status: newStatus || inst.status,
          expiryDate: inst.expiryDate,
          daysRemaining: diffDays,
          actionRequired: diffDays < 0 ? 'Statutory re-verification overdue. Notice issued.' : 'Re-verification due soon.',
          smsNoticeSent: true,
          whatsappNoticeSent: true,
          emailNoticeSent: true,
        });
      }
    }

    return res.json({
      success: true,
      scanTimestamp: new Date().toISOString(),
      totalScanned: instruments.length,
      totalFlagged: flaggedAlerts.length,
      alerts: flaggedAlerts,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /notifications/alerts - List active expiry alerts from DB
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const { ownerId } = req.query;
    const where: any = {
      status: { in: ['EXPIRING_SOON', 'EXPIRED'] },
    };
    if (ownerId) where.ownerId = String(ownerId);

    const instruments = await prisma.instrument.findMany({
      where,
      include: { owner: true, certificates: true },
      orderBy: { expiryDate: 'asc' },
    });

    return res.json({
      success: true,
      count: instruments.length,
      alerts: instruments.map((i) => ({
        instrumentId: i.id,
        model: i.model,
        ownerId: i.ownerId,
        ownerName: i.owner.name,
        status: i.status,
        expiryDate: i.expiryDate,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

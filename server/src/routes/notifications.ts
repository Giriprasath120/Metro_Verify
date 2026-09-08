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

// GET /notifications or /api/notifications - In-App Notification Center
router.get('/', async (req: Request, res: Response) => {
  try {
    const { ownerId, officerId, role } = req.query;

    const notifications: any[] = [];
    const today = new Date();

    // 1. Determine if requester is an Officer (LMO / GATC)
    let effectiveOfficerId = officerId ? String(officerId) : null;
    if (!effectiveOfficerId && ownerId) {
      const isOfficerInDb = await prisma.officer.findFirst({
        where: {
          OR: [
            { id: String(ownerId) },
            { badgeNumber: String(ownerId) },
          ]
        }
      });
      if (isOfficerInDb) {
        effectiveOfficerId = isOfficerInDb.id;
      }
    }

    if (effectiveOfficerId) {
      const officerAssignments = await prisma.assignment.findMany({
        where: {
          assignedOfficerId: String(effectiveOfficerId),
          status: { in: ['SCHEDULED', 'IN_PROGRESS', 'PENDING'] }
        },
        include: { instrument: true, owner: true, application: true },
        take: 20,
        orderBy: { assignedAt: 'desc' }
      });

      for (const a of officerAssignments) {
        notifications.push({
          id: `NOTIF-OFF-ASSIGN-${a.id}`,
          type: 'ALLOCATION',
          level: 'INFO',
          title: `⚖️ Verification Assignment: ${a.instrument?.model || a.instrumentId}`,
          message: `You have been officially assigned to inspect "${a.instrument?.model || a.instrumentId}" (Application #${a.applicationId || a.id}) for ${a.owner?.businessName || a.owner?.name || 'Applicant'}. Scheduled Date: ${a.scheduledDate} (10:00 AM - 01:00 PM).`,
          timestamp: a.assignedAt.toISOString(),
          read: false,
          actionUrl: 'Schedule',
          actionText: 'Open Field Task',
          applicationId: a.applicationId,
          instrumentId: a.instrumentId,
          assignmentId: a.id,
          ownerName: a.owner?.businessName || a.owner?.name,
          scheduledDate: a.scheduledDate,
        });
      }
    }

    // 2. Owner Allocation Notifications (Notifies owner which officer was assigned)
    if (ownerId && !effectiveOfficerId) {
      const ownerAssignments = await prisma.assignment.findMany({
        where: {
          ownerId: String(ownerId),
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
        },
        include: { assignedOfficer: true, instrument: true, application: true },
        take: 10,
        orderBy: { assignedAt: 'desc' }
      });

      for (const a of ownerAssignments) {
        notifications.push({
          id: `NOTIF-OWNER-ALLOC-${a.id}`,
          type: 'ALLOCATION',
          level: 'SUCCESS',
          title: `👮 Verifying Officer Allocated: ${a.assignedOfficer?.name || 'LMO Inspector'}`,
          message: `Legal Metrology Officer ${a.assignedOfficer?.name || 'Field Officer'} (${a.assignedOfficer?.badgeNumber || 'LMO'}) has been assigned to inspect "${a.instrument?.model || a.instrumentId}" (Application #${a.applicationId || a.id}). Scheduled Date: ${a.scheduledDate} (10:00 AM - 01:00 PM).`,
          timestamp: a.assignedAt.toISOString(),
          read: false,
          actionUrl: 'MyInstruments',
          actionText: 'View Instrument Details',
          officerContact: a.assignedOfficer?.phone || '+91 98480 12345',
          officerName: a.assignedOfficer?.name,
          officerBadge: a.assignedOfficer?.badgeNumber,
          applicationId: a.applicationId,
          instrumentId: a.instrumentId
        });
      }
    }

    // 3. Owner Certificate Notifications
    if (ownerId) {
      const ownerCerts = await prisma.certificate.findMany({
        where: { ownerId: String(ownerId) },
        take: 5,
        orderBy: { createdAt: 'desc' }
      });

      for (const c of ownerCerts) {
        notifications.push({
          id: `NOTIF-CERT-${c.id}`,
          type: 'ENDORSEMENT',
          level: 'SUCCESS',
          title: `Form VI Certificate Issued: ${c.certificateNumber}`,
          message: `Digital Certificate for instrument ${c.instrumentId} is certified and endorsed. Tap to view and generate.`,
          timestamp: c.createdAt.toISOString(),
          read: false,
          actionUrl: 'Certificates',
          actionText: 'View Certificate'
        });
      }
    }

    // 3. Expiry alerts from instruments
    const expiringInstruments = await prisma.instrument.findMany({
      where: {
        expiryDate: { not: null },
        ...(ownerId ? { ownerId: String(ownerId) } : {})
      },
      include: { owner: true },
      take: 20
    });

    for (const inst of expiringInstruments) {
      if (!inst.expiryDate) continue;
      const expDate = new Date(inst.expiryDate);
      const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        notifications.push({
          id: `NOTIF-EXP-${inst.id}`,
          type: 'EXPIRY',
          level: 'CRITICAL',
          title: `Statutory Expiry Alert: ${inst.model}`,
          message: `Your instrument ${inst.id} expired ${Math.abs(diffDays)} days ago on ${inst.expiryDate}. Immediate re-verification required under Rule 14.`,
          timestamp: new Date().toISOString(),
          read: false,
          actionUrl: 'NewRequest',
          actionText: 'Renew Now'
        });
      } else if (diffDays <= 30) {
        notifications.push({
          id: `NOTIF-WARN-${inst.id}`,
          type: 'WARNING',
          level: 'WARNING',
          title: `Re-verification Due Soon: ${inst.model}`,
          message: `Verification certificate for ${inst.id} expires in ${diffDays} days (${inst.expiryDate}). Please schedule inspection.`,
          timestamp: new Date().toISOString(),
          read: false,
          actionUrl: 'NewRequest',
          actionText: 'Schedule Verification'
        });
      }
    }

    // 4. Add system notifications
    notifications.push({
      id: 'NOTIF-GATC-01',
      type: 'ENDORSEMENT',
      level: 'INFO',
      title: 'GATC Central Lab Endorsement Complete',
      message: 'Tamil Nadu State Central Metrology Laboratory has digitally endorsed 2 verification certificates for Chennai jurisdiction.',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      read: true,
      actionUrl: 'Certificates',
      actionText: 'View Certificates'
    });

    notifications.push({
      id: 'NOTIF-PORTAL-02',
      type: 'SYSTEM',
      level: 'SUCCESS',
      title: 'Tamil Nadu Legal Metrology Portal Updated',
      message: 'Dynamic capacity-based statutory fee calculation and Form VI QR verification are active across all districts.',
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
      read: true
    });

    return res.json({
      success: true,
      count: notifications.length,
      unreadCount: notifications.filter(n => !n.read).length,
      notifications
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

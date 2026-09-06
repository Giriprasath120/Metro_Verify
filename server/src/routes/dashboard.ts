import { Router, Request, Response } from 'express';
import { mockInstruments, mockOwners, mockOfficers, mockBulkBatches, mockAdminStats } from '../data/mockData';

const router = Router();

// GET /dashboard/:role - Dashboard summary stats per role
router.get('/:role', (req: Request, res: Response) => {
  const { role } = req.params;

  if (role === 'owner') {
    const ownerInstruments = mockInstruments.filter(i => i.ownerId === 'OWN-101');
    const pending = ownerInstruments.filter(i => i.status === 'Pending' || i.status === 'Scheduled').length;
    const expiringSoon = ownerInstruments.filter(i => i.status === 'Expiring Soon').length;
    const verified = ownerInstruments.filter(i => i.status === 'Verified').length;

    return res.json({
      success: true,
      role: 'owner',
      metrics: {
        totalInstruments: ownerInstruments.length,
        pendingVerifications: pending,
        expiringSoon30Days: expiringSoon,
        verifiedActive: verified,
        complianceHealthScore: 92
      },
      recentActivity: [
        { title: 'Weighbridge Reverification Scheduled', date: '2026-09-02', status: 'Scheduled' },
        { title: 'New Certificate Issued IND/LM/TS/26/0482', date: '2026-01-10', status: 'Verified' },
        { title: 'Mandi Counter Scale Calibration Passed', date: '2026-01-10', status: 'Verified' }
      ]
    });
  } else if (role === 'officer') {
    return res.json({
      success: true,
      role: 'officer',
      officer: mockOfficers[0],
      metrics: {
        inspectionsToday: 3,
        completedToday: 1,
        pendingThisWeek: 7,
        offlineRecordsPendingSync: 2
      },
      todaySchedule: [
        {
          instrumentId: 'INST-TS-06',
          name: 'Cast Iron Hexagonal Weights 50kg',
          owner: 'Sri Balaji Mandi & Agro Traders',
          location: 'Grain Weighing Section, Bowenpally',
          distance: '3.8 km',
          timeSlot: '09:00 AM - 10:30 AM',
          status: 'In Progress'
        },
        {
          instrumentId: 'INST-TS-05',
          name: 'Phoenix Digital Platform Scale 500kg',
          owner: 'Sri Balaji Mandi & Agro Traders',
          location: 'Loading Bay 4, Bowenpally Mandi',
          distance: '4.2 km',
          timeSlot: '11:00 AM - 12:30 PM',
          status: 'Pending'
        },
        {
          instrumentId: 'INST-TS-01',
          name: 'Essae SuperWeigh-80T Weighbridge',
          owner: 'Sri Balaji Mandi & Agro Traders',
          location: 'Bowenpally Mandi Gate #2',
          distance: '4.0 km',
          timeSlot: '02:00 PM - 03:30 PM',
          status: 'Scheduled'
        }
      ]
    });
  } else if (role === 'admin') {
    return res.json({
      success: true,
      role: 'admin',
      stats: mockAdminStats,
      activeBulkBatches: mockBulkBatches.length,
      officersOnDuty: mockOfficers.length
    });
  }

  return res.status(400).json({
    success: false,
    message: 'Invalid role for dashboard'
  });
});

export default router;

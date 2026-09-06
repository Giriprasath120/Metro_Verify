import { Router, Request, Response } from 'express';
import { mockBulkBatches, BulkBatch, mockOfficers } from '../data/mockData';
import { allocateBulkBatch } from '../utils/allocationEngine';

const router = Router();
let bulkBatchesDb: BulkBatch[] = [...mockBulkBatches];

// POST /verification-requests - Single verification request
router.post('/', (req: Request, res: Response) => {
  const { instrumentId, ownerId, preferredDate, remarks } = req.body;

  const requestId = `VR-2026-${Date.now().toString().slice(-5)}`;
  return res.status(201).json({
    success: true,
    requestId,
    instrumentId,
    ownerId,
    status: 'Scheduled',
    preferredDate: preferredDate || new Date().toISOString().split('T')[0],
    remarks: remarks || 'Annual statutory reverification request',
    feeEstimated: '₹ 1,200.00',
    message: 'Verification request recorded. Allocated to nearest field officer.'
  });
});

// POST /verification-requests/bulk - Bulk verification request
router.post('/bulk', (req: Request, res: Response) => {
  const { ownerId, instrumentIds, preferredDate, district, state } = req.body;
  const count = Array.isArray(instrumentIds) ? instrumentIds.length : (req.body.count || 25);

  const batchId = `BATCH-2026-${(bulkBatchesDb.length + 1).toString().padStart(3, '0')}`;
  const batchNumber = `BLK/${state ? state.slice(0, 2).toUpperCase() : 'TS'}/HYD/2026/${(bulkBatchesDb.length + 5).toString().padStart(2, '0')}`;

  // Call deterministic allocation engine for bulk split
  const allocation = allocateBulkBatch(
    {
      state: state || 'Telangana',
      district: district || 'Hyderabad North',
      requestedDate: preferredDate || '2026-09-06',
      batchCount: count,
      isBulk: true
    },
    mockOfficers
  );

  const newBatch: BulkBatch = {
    id: batchId,
    batchNumber,
    ownerId: ownerId || 'OWN-101',
    totalInstruments: count,
    verifiedCount: 0,
    pendingCount: count,
    currentBatchIndex: 1,
    totalBatches: Math.ceil(count / 10),
    status: 'Allocated',
    createdAt: new Date().toISOString().split('T')[0],
    assignedOfficers: allocation.distributions.map(d => ({
      officerId: d.officerId,
      officerName: `${d.officerName} (${d.role})`,
      allocatedCount: d.allocatedCount
    })),
    instruments: Array.isArray(instrumentIds) ? instrumentIds : ['INST-TS-02', 'INST-TS-05', 'INST-TS-06']
  };

  bulkBatchesDb.unshift(newBatch);

  return res.status(201).json({
    success: true,
    message: 'Bulk verification request processed and distributed across officers.',
    batch: newBatch,
    allocationSummary: allocation.summaryText,
    distribution: allocation.distributions
  });
});

export default router;

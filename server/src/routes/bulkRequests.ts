import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { calculateVerificationFee } from '../config/pricing';

const router = Router();

// GET /api/bulk-requests - List bulk requests from MySQL
router.get('/', async (req: Request, res: Response) => {
  try {
    const { ownerId, status } = req.query;
    const where: any = {};

    if (ownerId) where.ownerId = String(ownerId);
    if (status) where.status = String(status).toUpperCase();

    const bulkRequests = await prisma.bulkRequest.findMany({
      where,
      include: {
        batches: true,
        owner: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      count: bulkRequests.length,
      bulkRequests,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/bulk-requests/:id - Single bulk request with batches and assignments
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const bulkRequest = await prisma.bulkRequest.findFirst({
      where: {
        OR: [{ id }, { bulkBatchNumber: id }],
      },
      include: {
        batches: {
          include: {
            assignments: {
              include: {
                instrument: true,
                assignedOfficer: true,
              },
            },
          },
        },
        owner: true,
      },
    });

    if (!bulkRequest) {
      return res.status(404).json({
        success: false,
        message: `Bulk request ${id} not found.`,
      });
    }

    return res.json({
      success: true,
      bulkRequest,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/bulk-requests - Create new bulk request in MySQL
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      ownerId,
      facilityName,
      category,
      instrumentCount,
      preferredDate,
      remarks,
    } = req.body;

    const count = Number(instrumentCount) || 10;
    const countTotal = await prisma.bulkRequest.count();
    const bulkId = `BR-2026-${String(countTotal + 1).padStart(3, '0')}`;
    const batchNumber = `BLK/TS/HYD/2026/${String(countTotal + 1).padStart(2, '0')}`;

    const cat = category || 'Non-Automatic Weighing Instrument';
    const unitFee = calculateVerificationFee(cat);
    const totalEstimated = unitFee.totalFee * count;

    // Verify or fallback owner
    let owner = await prisma.owner.findUnique({ where: { id: ownerId || 'OWN-101' } });
    if (!owner) {
      owner = await prisma.owner.findFirst();
    }
    const finalOwnerId = owner?.id || 'OWN-101';

    const newBulk = await prisma.bulkRequest.create({
      data: {
        id: bulkId,
        bulkBatchNumber: batchNumber,
        ownerId: finalOwnerId,
        facilityName: facilityName || 'Commercial Facility',
        category: cat,
        instrumentCount: count,
        verifiedCount: 0,
        pendingCount: count,
        failedCount: 0,
        progressPercent: 0,
        status: 'SUBMITTED',
        preferredDate: preferredDate || new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
        estimatedFee: totalEstimated,
        feeRule: unitFee.ruleReference,
        remarks: remarks || 'Bulk batch submission for commercial instruments.',
      },
      include: {
        batches: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: `Bulk verification request ${bulkId} created for ${count} units. Status: SUBMITTED.`,
      bulkRequest: newBulk,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/bulk-requests/:id/split - Atomically split bulk batch via sp_SplitBulkBatch
router.post('/:id/split', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { officerAllocations } = req.body;

    if (!Array.isArray(officerAllocations) || officerAllocations.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'officerAllocations array required (e.g. [{ officerId, count, batchName }])',
      });
    }

    const bulk = await prisma.bulkRequest.findFirst({
      where: { OR: [{ id }, { bulkBatchNumber: id }] },
    });

    if (!bulk) {
      return res.status(404).json({ success: false, error: 'Bulk request not found' });
    }

    // Call stored procedure sp_SplitBulkBatch
    await prisma.$queryRawUnsafe(
      'CALL sp_SplitBulkBatch(?, ?)',
      bulk.id,
      JSON.stringify(officerAllocations)
    );

    const updated = await prisma.bulkRequest.findUnique({
      where: { id: bulk.id },
      include: {
        batches: {
          include: {
            assignments: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      message: `Bulk request ${bulk.id} split into ${updated?.batches.length} batch(es) successfully.`,
      bulkRequest: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/bulk-requests/:id/progress - Update progress/status
router.patch('/:id/progress', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { verifiedCount, failedCount, status } = req.body;

    const item = await prisma.bulkRequest.findFirst({
      where: { OR: [{ id }, { bulkBatchNumber: id }] },
    });

    if (!item) {
      return res.status(404).json({ success: false, message: `Bulk request ${id} not found.` });
    }

    const newVerified = typeof verifiedCount === 'number' ? verifiedCount : item.verifiedCount;
    const newFailed = typeof failedCount === 'number' ? failedCount : item.failedCount;
    const newPending = Math.max(0, item.instrumentCount - newVerified - newFailed);
    const newProgress = Math.min(100, Math.round((newVerified / item.instrumentCount) * 100));

    let newStatus = status || item.status;
    if (!status) {
      if (newVerified >= item.instrumentCount) {
        newStatus = 'COMPLETED';
      } else if (newVerified > 0) {
        newStatus = 'IN_PROGRESS';
      }
    }

    const updated = await prisma.bulkRequest.update({
      where: { id: item.id },
      data: {
        verifiedCount: newVerified,
        failedCount: newFailed,
        pendingCount: newPending,
        progressPercent: newProgress,
        status: newStatus,
      },
      include: { batches: true },
    });

    return res.json({
      success: true,
      message: `Bulk request ${id} updated successfully.`,
      bulkRequest: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

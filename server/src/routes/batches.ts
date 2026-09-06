import { Router, Request, Response } from 'express';
import { mockBulkBatches, mockInstruments } from '../data/mockData';

const router = Router();

// GET /batches - List all active bulk batches
router.get('/', (req: Request, res: Response) => {
  return res.json({
    success: true,
    count: mockBulkBatches.length,
    batches: mockBulkBatches
  });
});

// GET /batches/:id - Get detailed batch info with instrument progress
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const batch = mockBulkBatches.find(b => b.id === id || b.batchNumber === id);

  if (!batch) {
    return res.status(404).json({
      success: false,
      message: `Bulk batch ${id} not found.`
    });
  }

  const instrumentsInBatch = mockInstruments.filter(i => 
    batch.instruments.includes(i.id) || i.batchId === batch.id
  );

  return res.json({
    success: true,
    batch,
    progressPercentage: Math.round((batch.verifiedCount / batch.totalInstruments) * 100),
    instruments: instrumentsInBatch
  });
});

export default router;

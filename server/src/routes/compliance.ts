import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /compliance/:ownerId/score - Compliance Health Score via sp_CalculateComplianceScore
router.get('/:ownerId/score', async (req: Request, res: Response) => {
  try {
    const { ownerId } = req.params;

    // Check if owner exists in DB
    let owner = await prisma.owner.findUnique({
      where: { id: ownerId },
    });

    if (!owner) {
      owner = await prisma.owner.findFirst();
    }

    if (!owner) {
      return res.status(404).json({ success: false, error: 'Owner not found' });
    }

    // Call stored procedure sp_CalculateComplianceScore
    const result: any = await prisma.$queryRawUnsafe(
      'CALL sp_CalculateComplianceScore(?)',
      owner.id
    );

    // Stored procedure updates Owner row and returns breakdown
    const row = Array.isArray(result) && result[0] ? (Array.isArray(result[0]) ? result[0][0] : result[0]) : null;

    // Reload owner from DB to get persisted score
    const updatedOwner = await prisma.owner.findUnique({ where: { id: owner.id } });

    const complianceScore = updatedOwner?.complianceScore ?? (row ? Number(row.complianceScore ?? row.f1) : 100);
    const expiredCount = row ? Number(row.expiredInstruments ?? row.f3 ?? 0) : 0;
    const reinspectionCount = row ? Number(row.reinspectionRequired ?? row.f4 ?? 0) : 0;
    const failedCount = row ? Number(row.failedInspections ?? row.f5 ?? 0) : 0;
    const totalInst = row ? Number(row.totalInstruments ?? row.f2 ?? 0) : 0;
    const deductionsTotal = row ? Number(row.totalDeductions ?? row.f6 ?? 0) : 0;
    const explanation = row?.explanation ?? row?.f7 ?? 'All registered instruments verified on time.';

    const deductions: { reason: string; points: number }[] = [];
    if (expiredCount > 0) {
      deductions.push({
        reason: `${expiredCount} expired instrument(s) past grace period`,
        points: -(expiredCount * 15),
      });
    }
    if (reinspectionCount > 0) {
      deductions.push({
        reason: `${reinspectionCount} failed inspection(s) requiring reinspection`,
        points: -(reinspectionCount * 20),
      });
    }

    return res.json({
      success: true,
      ownerId: owner.id,
      businessName: owner.businessName,
      complianceScore,
      grade:
        complianceScore >= 90
          ? 'Tier A (Excellent)'
          : complianceScore >= 75
          ? 'Tier B (Standard)'
          : 'Tier C (Risk / Watchlist)',
      deductions,
      explanation,
      auditSummary: {
        totalInstruments: totalInst,
        expired: expiredCount,
        reinspectionRequired: reinspectionCount,
        failedInspections: failedCount,
        deductionsTotal,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

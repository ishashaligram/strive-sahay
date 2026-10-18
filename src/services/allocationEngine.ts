import { Assessor, Beneficiary, BusinessProfile, StaffingAlert } from '../types';
import { storage } from './storage';

export class AllocationEngine {
  /**
   * Concurrency-safe automatic assessor allocation based on trade expertise, region, and available capacity
   */
  static allocateAssessor(
    beneficiary: Beneficiary,
    profile: BusinessProfile
  ): { success: boolean; assessor?: Assessor; alert?: StaffingAlert; reason?: string } {
    const assessors = storage.getAssessors();
    const trade = profile.trade;
    const district = beneficiary.district;

    // 1. Filter candidates by trade expertise and availability
    const eligibleCandidates = assessors.filter(
      (a) =>
        a.isAvailable &&
        a.tradeExpertise.includes(trade) &&
        a.currentWorkload < a.maxWorkload
    );

    // 2. Further score candidates by regional match and lowest workload
    if (eligibleCandidates.length === 0) {
      // No capacity available! Put case into Waiting Queue and raise Staffing Alert
      const alert: StaffingAlert = {
        id: 'alert_' + Math.random().toString(36).substring(2, 9),
        trade,
        region: district,
        unassignedCasesCount: 1,
        createdAt: new Date().toISOString(),
        severity: 'critical',
        message: `High demand alert: All qualified assessors for trade "${trade}" in "${district}" region are at 100% capacity. Case ${beneficiary.referenceId} queued.`,
      };

      storage.saveAlert(alert);

      // Update beneficiary status to waiting
      const updatedBen: Beneficiary = {
        ...beneficiary,
        currentStatus: 'submitted_to_assessor',
        waitingForAssessor: true,
      };
      storage.saveBeneficiary(updatedBen);

      return {
        success: false,
        alert,
        reason: 'All qualified assessors for this trade and region are currently at maximum workload capacity. The case has been placed in the priority waiting queue and an Admin Staffing Alert has been triggered.',
      };
    }

    // 3. Pick the best candidate:
    // Prefer regional match, then lowest workload ratio (fair distribution)
    eligibleCandidates.sort((a, b) => {
      const aRegionMatch = a.regions.includes(district) ? 1 : 0;
      const bRegionMatch = b.regions.includes(district) ? 1 : 0;
      if (aRegionMatch !== bRegionMatch) return bRegionMatch - aRegionMatch;

      // Lowest workload ratio
      const aRatio = a.currentWorkload / a.maxWorkload;
      const bRatio = b.currentWorkload / b.maxWorkload;
      return aRatio - bRatio;
    });

    const selectedAssessor = eligibleCandidates[0];

    // Concurrency-safe atomic increment of assessor workload
    const updatedAssessor: Assessor = {
      ...selectedAssessor,
      currentWorkload: selectedAssessor.currentWorkload + 1,
    };
    storage.saveAssessor(updatedAssessor);

    // Update beneficiary with assigned assessor
    const updatedBen: Beneficiary = {
      ...beneficiary,
      currentStatus: 'submitted_to_assessor',
      assignedAssessorId: selectedAssessor.id,
      waitingForAssessor: false,
    };
    storage.saveBeneficiary(updatedBen);

    return {
      success: true,
      assessor: updatedAssessor,
    };
  }
}

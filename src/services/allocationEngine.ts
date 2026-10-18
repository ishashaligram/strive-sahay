import {Assessor,Beneficiary,BusinessProfile,StaffingAlert} from '../types';
/** Assessor handoff is enforced and persisted by the backend. */
export class AllocationEngine {
  static allocateAssessor(_beneficiary:Beneficiary,_profile:BusinessProfile):{success:boolean;assessor?:Assessor;alert?:StaffingAlert;reason?:string} {
    return {success:false,reason:'Submit the confirmed screening report using the backend workflow.'};
  }
}

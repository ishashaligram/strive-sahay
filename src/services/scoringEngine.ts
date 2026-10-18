import {AssessmentVersion,BusinessProfile} from '../types';
/** Scores must come from the persisted backend rubric, never local version-based constants. */
export class ScoringEngine {
  static evaluateProfile(_profile:BusinessProfile,_version=1,_refined=false,_threshold=7):AssessmentVersion {
    throw new Error('Use the screening backend to calculate and persist evidence-based scores.');
  }
}

import {BusinessProfile} from '../types';
/** Business extraction and mentoring are server-owned. No browser inference fallback. */
export class AiMentorEngine {
  static calculateCompleteness(profile:BusinessProfile):number {
    const facts=[profile.overview,profile.market,profile.finance,profile.operations,profile.risk].flatMap(Object.values);
    return Math.round(100*facts.filter(f=>f.status==='PROVIDED' && f.evidenceQuote).length/facts.length);
  }
}

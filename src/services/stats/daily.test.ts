import { describe, expect, it } from 'vitest';

import { applyReviewToDailyStats } from './daily';
describe('learn-review-stats flow',()=>{it('updates review totals and accuracy inputs',()=>{const start={reviewed:0,correct:0,newWords:1,studySeconds:0};const good=applyReviewToDailyStats(start,3,2500);const again=applyReviewToDailyStats(good,1,1200);expect(again).toEqual({reviewed:2,correct:1,newWords:1,studySeconds:4});});});

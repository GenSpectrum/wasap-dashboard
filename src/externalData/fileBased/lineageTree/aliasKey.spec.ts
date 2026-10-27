import { describe, expect, it } from 'vitest';

import { parseRecombinantParents } from './aliasKey';

describe('parseRecombinantParents', () => {
    it('takes the recombinants and skips the ordinary aliases', () => {
        const result = parseRecombinantParents({
            A: '',
            BA: 'B.1.1.529',
            XBB: ['BJ.1', 'BM.1.1.1'],
        });

        expect(result).toEqual(new Map([['XBB', ['BJ.1', 'BM.1.1.1']]]));
    });

    it('lists a parent of several segments once', () => {
        const result = parseRecombinantParents({ XFG: ['LF.7', 'LP.8.1.2', 'LF.7'] });

        expect(result.get('XFG')).toEqual(['LF.7', 'LP.8.1.2']);
    });

    it('drops the wildcard of a parent', () => {
        const result = parseRecombinantParents({ XE: ['BA.1*', 'BA.2*'] });

        expect(result.get('XE')).toEqual(['BA.1', 'BA.2']);
    });

    it('keeps recombinant parents', () => {
        const result = parseRecombinantParents({ XDV: ['XDE', 'JN.1', 'XDE', 'JN.1'] });

        expect(result.get('XDV')).toEqual(['XDE', 'JN.1']);
    });
});

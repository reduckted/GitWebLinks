import { expect } from 'chai';

import { hasRemote, normalizeRemoteUrl } from '../src/utilities';

describe('utilities', () => {
    describe('hasRemote', () => {
        it('returns true when repository has a remote.', () => {
            expect(hasRemote({ remote: 'a', root: 'b' })).to.be.true;
        });

        it('returns false when repository does not have a remote.', () => {
            expect(hasRemote({ remote: undefined, root: 'b' })).to.be.false;
        });
    });

    describe('normalizeRemoteUrl', () => {
        it('should remove the username from HTTP URLs.', () => {
            expect(normalizeRemoteUrl('http://me@example.com')).to.equal('http://example.com');
        });

        it('should remove the username from HTTPS URLs.', () => {
            expect(normalizeRemoteUrl('https://me@example.com')).to.equal('https://example.com');
        });

        it('should not change the HTTP URL if it does not contain a username.', () => {
            expect(normalizeRemoteUrl('http://example.com')).to.equal('http://example.com');
        });

        it('should remove the SSH prefix.', () => {
            expect(normalizeRemoteUrl('ssh://example.com')).to.equal('example.com');
        });

        it('should remove the "git@" prefix.', () => {
            expect(normalizeRemoteUrl('git@example.com')).to.equal('example.com');
        });

        it('should remove the SSH prefix and the "git@" prefix.', () => {
            expect(normalizeRemoteUrl('ssh://git@example.com')).to.equal('example.com');
        });

        it('should not change the SSH URL if it does not contain the SSH prefix.', () => {
            expect(normalizeRemoteUrl('example.com')).to.equal('example.com');
        });
    });
});

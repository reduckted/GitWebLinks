import { expect } from 'chai';

import { hasRemote, normalizeUrl } from '../src/utilities';

describe('utilities', () => {
    describe('hasRemote', () => {
        it('returns true when repository has a remote.', () => {
            expect(hasRemote({ remote: { url: 'a', name: 'origin' }, root: 'b' })).to.be.true;
        });

        it('returns false when repository does not have a remote.', () => {
            expect(hasRemote({ remote: undefined, root: 'b' })).to.be.false;
        });
    });

    describe('normalizeUrl', () => {
        it('should remove the username from HTTP URLs.', () => {
            expect(normalizeUrl('http://me@example.com')).to.equal('http://example.com');
        });

        it('should remove the username from HTTPS URLs.', () => {
            expect(normalizeUrl('https://me@example.com')).to.equal('https://example.com');
        });

        it('should not change the HTTP URL if it does not contain a username.', () => {
            expect(normalizeUrl('http://example.com')).to.equal('http://example.com');
        });

        it('should remove the SSH prefix.', () => {
            expect(normalizeUrl('ssh://example.com')).to.equal('example.com');
        });

        it('should remove the "git@" prefix.', () => {
            expect(normalizeUrl('git@example.com')).to.equal('example.com');
        });

        it('should remove the SSH prefix and the "git@" prefix.', () => {
            expect(normalizeUrl('ssh://git@example.com')).to.equal('example.com');
        });

        it('should not change the SSH URL if it does not contain the SSH prefix.', () => {
            expect(normalizeUrl('example.com')).to.equal('example.com');
        });

        it('should remove the trailing slash from HTTP URLs.', () => {
            expect(normalizeUrl('http://example.com/')).to.equal('http://example.com');
        });

        it('should remove the trailing slash from SSH URLs.', () => {
            expect(normalizeUrl('ssh://example.com/')).to.equal('example.com');
        });
    });
});

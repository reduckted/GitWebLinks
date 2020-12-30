import { expect } from 'chai';

import { RemoteServer } from '../src/remote-server';
import { StaticServer } from '../src/schema';

describe('RemoteServer', () => {
    let server: RemoteServer;

    describe('single static server', () => {
        beforeEach(() => {
            server = new RemoteServer({
                http: 'http://example.com:8000',
                ssh: 'ssh://git@example.com:9000'
            });
        });

        it('should return undefined when there is no match.', () => {
            expect(server.match('http://example.com:10000/foo/bar')).to.be.undefined;
        });

        it('should return the server when matching to the HTTP address.', () => {
            expect(server.match('http://example.com:8000/foo/bar')).to.deep.equal({
                http: 'http://example.com:8000',
                ssh: 'ssh://git@example.com:9000'
            });
        });

        it('should return the server when matching to the SSH address with the SSH protocol.', () => {
            expect(server.match('ssh://git@example.com:9000/foo/bar')).to.deep.equal({
                http: 'http://example.com:8000',
                ssh: 'ssh://git@example.com:9000'
            });
        });

        it('should return the server when matching to the SSH address without the SSH protocol.', () => {
            expect(server.match('git@example.com:9000/foo/bar')).to.deep.equal({
                http: 'http://example.com:8000',
                ssh: 'ssh://git@example.com:9000'
            });
        });
    });

    describe('multiple static servers', () => {
        beforeEach(() => {
            server = new RemoteServer([
                {
                    http: 'http://example.com:8000',
                    ssh: 'ssh://git@example.com:9000'
                },
                {
                    http: 'http://test.com:6000',
                    ssh: 'ssh://git@test.com:7000'
                }
            ]);
        });

        it('should return undefined when there is no match.', () => {
            expect(server.match('http://test.com:8000/foo/bar')).to.be.undefined;
        });

        it('should return the matching server when matching to the HTTP address.', () => {
            expect(server.match('http://example.com:8000/foo/bar')).to.deep.equal({
                http: 'http://example.com:8000',
                ssh: 'ssh://git@example.com:9000'
            });

            expect(server.match('http://test.com:6000/foo/bar')).to.deep.equal({
                http: 'http://test.com:6000',
                ssh: 'ssh://git@test.com:7000'
            });
        });

        it('should return the matching server when matching to the SSH address with the SSH protocol.', () => {
            expect(server.match('ssh://git@example.com:9000/foo/bar')).to.deep.equal({
                http: 'http://example.com:8000',
                ssh: 'ssh://git@example.com:9000'
            });

            expect(server.match('ssh://git@test.com:7000/foo/bar')).to.deep.equal({
                http: 'http://test.com:6000',
                ssh: 'ssh://git@test.com:7000'
            });
        });

        it('should return the matching server when matching to the SSH address without the SSH protocol.', () => {
            expect(server.match('git@example.com:9000/foo/bar')).to.deep.equal({
                http: 'http://example.com:8000',
                ssh: 'ssh://git@example.com:9000'
            });

            expect(server.match('git@test.com:7000/foo/bar')).to.deep.equal({
                http: 'http://test.com:6000',
                ssh: 'ssh://git@test.com:7000'
            });
        });
    });

    describe('single dynamic server', () => {
        beforeEach(() => {
            server = new RemoteServer({
                pattern: 'http://(.+)\\.example\\.com:8000',
                http: 'http://example.com:8000/repos/{{ match[1] }}',
                ssh: 'ssh://git@example.com:9000/_{{ match[1] }}'
            });
        });

        it('should return undefined when there is no match.', () => {
            expect(server.match('http://example.com:8000/foo/bar')).to.be.undefined;
        });

        it('should create the details of the matching server.', () => {
            expect(server.match('http://foo.example.com:8000/bar/meep')).to.deep.equal({
                http: 'http://example.com:8000/repos/foo',
                ssh: 'ssh://git@example.com:9000/_foo'
            });
        });

        it('should not crash if pattern is invalid.', () => {
            server = new RemoteServer({
                pattern: 'foo[bar',
                http: 'http://example.com',
                ssh: 'ssh://git@example.com'
            });

            expect(server.match('foo')).to.be.undefined;
        });
    });

    describe('multiple dynamic servers', () => {
        beforeEach(() => {
            server = new RemoteServer([
                {
                    pattern: 'http://(.+)\\.example\\.com:8000',
                    http: 'http://example.com:8000/repos/{{ match[1] }}',
                    ssh: 'ssh://git@example.com:9000/_{{ match[1] }}'
                },
                {
                    pattern: 'ssh://git@example\\.com:9000/_([^/]+)',
                    http: 'http://example.com:8000/repos/{{ match[1] }}',
                    ssh: 'ssh://git@example.com:9000/_{{ match[1] }}'
                }
            ]);
        });

        it('should return undefined when there is no match.', () => {
            expect(server.match('http://example.com:8000/foo/bar')).to.be.undefined;
        });

        it('should create the details of the matching server.', () => {
            expect(server.match('http://foo.example.com:8000/bar/meep')).to.deep.equal({
                http: 'http://example.com:8000/repos/foo',
                ssh: 'ssh://git@example.com:9000/_foo'
            });

            expect(server.match('ssh://git@example.com:9000/_foo/bar')).to.deep.equal({
                http: 'http://example.com:8000/repos/foo',
                ssh: 'ssh://git@example.com:9000/_foo'
            });
        });
    });

    describe('mixed static and dynamic servers', () => {
        beforeEach(() => {
            server = new RemoteServer([
                {
                    pattern: 'http://(.+)\\.example\\.com:8000',
                    http: 'http://example.com:8000/repos/{{ match[1] }}',
                    ssh: 'ssh://git@example.com:9000/_{{ match[1] }}'
                },
                {
                    http: 'http://example.com:10000',
                    ssh: 'ssh://git@example.com:11000'
                }
            ]);
        });

        it('should return undefined when there is no match.', () => {
            expect(server.match('http://example.com:7000/foo/bar')).to.be.undefined;
        });

        it('should return the matching server when matching to the static server.', () => {
            expect(server.match('http://example.com:10000/foo/bar')).to.deep.equal({
                http: 'http://example.com:10000',
                ssh: 'ssh://git@example.com:11000'
            });
        });

        it('should create the details of the matching server when matching to the dynamic server.', () => {
            expect(server.match('http://foo.example.com:8000/bar/meep')).to.deep.equal({
                http: 'http://example.com:8000/repos/foo',
                ssh: 'ssh://git@example.com:9000/_foo'
            });
        });
    });

    describe('static server factory', () => {
        let source: StaticServer[];

        beforeEach(() => {
            source = [
                {
                    http: 'http://example.com:8000',
                    ssh: 'ssh://git@example.com:9000'
                },
                {
                    http: 'http://test.com:6000',
                    ssh: 'ssh://git@test.com:7000'
                }
            ];

            server = new RemoteServer(() => source);
        });

        it('should return undefined when there is no match.', () => {
            expect(server.match('http://example.com:9000/foo/bar')).to.be.undefined;
        });

        it('should return the matching server when matching to the HTTP address.', () => {
            expect(server.match('http://example.com:8000/foo/bar')).to.deep.equal({
                http: 'http://example.com:8000',
                ssh: 'ssh://git@example.com:9000'
            });

            expect(server.match('http://test.com:6000/foo/bar')).to.deep.equal({
                http: 'http://test.com:6000',
                ssh: 'ssh://git@test.com:7000'
            });
        });

        it('should return the matching server when matching to the SSH address.', () => {
            expect(server.match('ssh://git@example.com:9000/foo/bar')).to.deep.equal({
                http: 'http://example.com:8000',
                ssh: 'ssh://git@example.com:9000'
            });

            expect(server.match('ssh://git@test.com:7000/foo/bar')).to.deep.equal({
                http: 'http://test.com:6000',
                ssh: 'ssh://git@test.com:7000'
            });
        });

        it('should return the matching server when the remote URL is an HTTP address and the server has no SSH URL.', () => {
            source = [{ http: 'http://example.com:8000', ssh: undefined }];

            expect(server.match('http://example.com:8000/foo/bar')).to.deep.equal({
                http: 'http://example.com:8000',
                ssh: undefined
            });
        });

        it('should not return a match when the remote URL is an SSH address and the server has no SSH URL.', () => {
            source = [{ http: 'http://example.com:8000', ssh: undefined }];

            expect(server.match('ssh://git@test.com:7000/foo/bar')).to.be.undefined;
        });

        it('should not cache the servers returned from the factory.', () => {
            expect(server.match('http://example.com:8000/foo/bar')).to.deep.equal({
                http: 'http://example.com:8000',
                ssh: 'ssh://git@example.com:9000'
            });

            source = [
                {
                    http: 'http://test.com:6000',
                    ssh: 'ssh://git@test.com:7000'
                }
            ];

            expect(server.match('http://example.com:8000/foo/bar')).to.be.undefined;

            source = [
                {
                    http: 'http://example.com:8000',
                    ssh: 'ssh://git@example.com:9000'
                }
            ];

            expect(server.match('http://example.com:8000/foo/bar')).to.deep.equal({
                http: 'http://example.com:8000',
                ssh: 'ssh://git@example.com:9000'
            });
        });
    });
});

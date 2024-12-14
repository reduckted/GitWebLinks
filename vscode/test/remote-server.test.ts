import type { StaticServer } from '../src/schema';

import { expect } from 'chai';

import { RemoteServer } from '../src/remote-server';

describe('RemoteServer', () => {
    let server: RemoteServer;
    let url: string;

    describe('single static server', () => {
        beforeEach(() => {
            server = new RemoteServer({
                http: 'http://example.com:8000',
                ssh: 'ssh://git@example.com:9000'
            });
        });

        it('should return undefined when there is no match.', () => {
            url = 'http://example.com:10000/foo/bar';
            match(undefined, undefined);
        });

        it('should return the server when matching to the HTTP address.', () => {
            url = 'http://example.com:8000/foo/bar';
            match({ http: 'http://example.com:8000', ssh: 'ssh://git@example.com:9000' }, 'same');
        });

        it('should return the server when matching to the SSH address with the SSH protocol.', () => {
            url = 'ssh://git@example.com:9000/foo/bar';
            match(
                { http: 'http://example.com:8000', ssh: 'ssh://git@example.com:9000' },
                undefined
            );
        });

        it('should return the server when matching to the SSH address without the SSH protocol.', () => {
            url = 'git@example.com:9000/foo/bar';
            match(
                { http: 'http://example.com:8000', ssh: 'ssh://git@example.com:9000' },
                undefined
            );
        });

        it('should match the web address when there is a web address.', () => {
            server = new RemoteServer({
                http: 'http://example.com:8000',
                ssh: 'ssh://git@example.com:9000',
                web: 'http://other.com:8000'
            });

            url = 'http://other.com:8000/foo/bar';
            match(undefined, {
                http: 'http://example.com:8000',
                ssh: 'ssh://git@example.com:9000',
                web: 'http://other.com:8000'
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
            url = 'http://test.com:8000/foo/bar';
            match(undefined, undefined);
        });

        it('should return the matching server when matching to the HTTP address.', () => {
            url = 'http://example.com:8000/foo/bar';
            match({ http: 'http://example.com:8000', ssh: 'ssh://git@example.com:9000' }, 'same');

            url = 'http://test.com:6000/foo/bar';
            match({ http: 'http://test.com:6000', ssh: 'ssh://git@test.com:7000' }, 'same');
        });

        it('should return the matching server when matching to the SSH address with the SSH protocol.', () => {
            url = 'ssh://git@example.com:9000/foo/bar';
            match(
                { http: 'http://example.com:8000', ssh: 'ssh://git@example.com:9000' },
                undefined
            );

            url = 'ssh://git@test.com:7000/foo/bar';
            match({ http: 'http://test.com:6000', ssh: 'ssh://git@test.com:7000' }, undefined);
        });

        it('should return the matching server when matching to the SSH address without the SSH protocol.', () => {
            url = 'git@example.com:9000/foo/bar';
            match(
                { http: 'http://example.com:8000', ssh: 'ssh://git@example.com:9000' },
                undefined
            );

            url = 'git@test.com:7000/foo/bar';
            match({ http: 'http://test.com:6000', ssh: 'ssh://git@test.com:7000' }, undefined);
        });

        it('should match the web address when there is a web address.', () => {
            server = new RemoteServer([
                {
                    http: 'http://example.com:8000',
                    ssh: 'ssh://git@example.com:9000',
                    web: 'http://web.example.com'
                },
                {
                    http: 'http://test.com:6000',
                    ssh: 'ssh://git@test.com:7000',
                    web: 'http://web.test.com'
                }
            ]);

            url = 'http://web.example.com/foo/bar';
            match(undefined, {
                http: 'http://example.com:8000',
                ssh: 'ssh://git@example.com:9000',
                web: 'http://web.example.com'
            });

            url = 'http://web.test.com/foo/bar';
            match(undefined, {
                http: 'http://test.com:6000',
                ssh: 'ssh://git@test.com:7000',
                web: 'http://web.test.com'
            });
        });
    });

    describe('single dynamic server', () => {
        beforeEach(() => {
            server = new RemoteServer({
                remotePattern: 'http://(.+)\\.example\\.com:8000',
                http: 'http://example.com:8000/repos/{{ match[1] }}',
                ssh: 'ssh://git@example.com:9000/_{{ match[1] }}'
            });
        });

        it('should return undefined when there is no match.', () => {
            url = 'http://example.com:8000/foo/bar';
            match(undefined, undefined);
        });

        it('should create the details of the matching server.', () => {
            url = 'http://foo.example.com:8000/bar/meep';
            match(
                {
                    http: 'http://example.com:8000/repos/foo',
                    ssh: 'ssh://git@example.com:9000/_foo'
                },
                'same'
            );
        });

        it('should not crash if pattern is invalid.', () => {
            server = new RemoteServer({
                remotePattern: 'foo[bar',
                http: 'http://example.com',
                ssh: 'ssh://git@example.com'
            });

            url = 'foo';
            match(undefined, undefined);
        });

        it('should match the web address when there is a web address.', () => {
            server = new RemoteServer({
                remotePattern: 'http://(.+)\\.example\\.com:8000',
                http: 'http://example.com:8000/repos/{{ match[1] }}',
                ssh: 'ssh://git@example.com:9000/_{{ match[1] }}',
                webPattern: 'http://(.+)\\.test\\.com:8000',
                web: 'http://test.com:8000/repos/{{ match[1] }}'
            });

            url = 'http://foo.test.com:8000/bar/meep';
            match(undefined, {
                http: 'http://example.com:8000/repos/foo',
                ssh: 'ssh://git@example.com:9000/_foo',
                web: 'http://test.com:8000/repos/foo'
            });
        });
    });

    describe('multiple dynamic servers', () => {
        beforeEach(() => {
            server = new RemoteServer([
                {
                    remotePattern: 'http://(.+)\\.example\\.com:8000',
                    http: 'http://example.com:8000/repos/{{ match[1] }}',
                    ssh: 'ssh://git@example.com:9000/_{{ match[1] }}'
                },
                {
                    remotePattern: 'ssh://git@example\\.com:9000/_([^/]+)',
                    http: 'http://example.com:8000/repos/{{ match[1] }}',
                    ssh: 'ssh://git@example.com:9000/_{{ match[1] }}',
                    webPattern: '^$' // This server should only match SSH remote URLs.
                }
            ]);
        });

        it('should return undefined when there is no match.', () => {
            url = 'http://example.com:8000/foo/bar';
            match(undefined, undefined);
        });

        it('should create the details of the matching server.', () => {
            url = 'http://foo.example.com:8000/bar/meep';
            match(
                {
                    http: 'http://example.com:8000/repos/foo',
                    ssh: 'ssh://git@example.com:9000/_foo'
                },
                'same'
            );

            url = 'ssh://git@example.com:9000/_foo/bar';
            match(
                {
                    http: 'http://example.com:8000/repos/foo',
                    ssh: 'ssh://git@example.com:9000/_foo'
                },
                undefined
            );
        });

        it('should match the web address when there is a web address.', () => {
            server = new RemoteServer([
                {
                    remotePattern: 'http://(.+)\\.example\\.com:8000',
                    http: 'http://example.com:8000/repos/{{ match[1] }}',
                    ssh: 'ssh://git@example.com:9000/_{{ match[1] }}',
                    webPattern: 'http://(.+)\\.test\\.com:8000',
                    web: 'http://test.com:8000/repos/{{ match[1] }}'
                },
                {
                    remotePattern: 'ssh://git@example\\.com:9000/_([^/]+)',
                    http: 'http://example.com:8000/repos/{{ match[1] }}',
                    ssh: 'ssh://git@example.com:9000/_{{ match[1] }}',
                    webPattern: 'http://(.+)\\.other\\.com:8000',
                    web: 'http://other.com:8000/repos/{{ match[1] }}'
                }
            ]);

            url = 'http://foo.test.com:8000/bar/meep';
            match(undefined, {
                http: 'http://example.com:8000/repos/foo',
                ssh: 'ssh://git@example.com:9000/_foo',
                web: 'http://test.com:8000/repos/foo'
            });

            url = 'http://foo.other.com:8000/bar/meep';
            match(undefined, {
                http: 'http://example.com:8000/repos/foo',
                ssh: 'ssh://git@example.com:9000/_foo',
                web: 'http://other.com:8000/repos/foo'
            });
        });
    });

    describe('mixed static and dynamic servers', () => {
        beforeEach(() => {
            server = new RemoteServer([
                {
                    remotePattern: 'http://(.+)\\.example\\.com:8000',
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
            url = 'http://example.com:7000/foo/bar';
            match(undefined, undefined);
        });

        it('should return the matching server when matching to the static server.', () => {
            url = 'http://example.com:10000/foo/bar';
            match({ http: 'http://example.com:10000', ssh: 'ssh://git@example.com:11000' }, 'same');
        });

        it('should create the details of the matching server when matching to the dynamic server.', () => {
            url = 'http://foo.example.com:8000/bar/meep';
            match(
                {
                    http: 'http://example.com:8000/repos/foo',
                    ssh: 'ssh://git@example.com:9000/_foo'
                },
                'same'
            );
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
                    ssh: 'ssh://git@test.com:7000',
                    web: 'http://web.test.com'
                }
            ];

            server = new RemoteServer(() => source);
        });

        it('should return undefined when there is no match.', () => {
            url = 'http://example.com:9000/foo/bar';
            match(undefined, undefined);
        });

        it('should return the matching server when matching to the HTTP address.', () => {
            url = 'http://example.com:8000/foo/bar';
            match({ http: 'http://example.com:8000', ssh: 'ssh://git@example.com:9000' }, 'same');

            url = 'http://test.com:6000/foo/bar';
            match(
                {
                    http: 'http://test.com:6000',
                    ssh: 'ssh://git@test.com:7000',
                    web: 'http://web.test.com'
                },
                undefined
            );

            url = 'http://web.test.com/foo/bar';
            match(undefined, {
                http: 'http://test.com:6000',
                ssh: 'ssh://git@test.com:7000',
                web: 'http://web.test.com'
            });
        });

        it('should return the matching server when matching to the SSH address.', () => {
            url = 'ssh://git@example.com:9000/foo/bar';
            match(
                { http: 'http://example.com:8000', ssh: 'ssh://git@example.com:9000' },
                undefined
            );

            url = 'ssh://git@test.com:7000/foo/bar';
            match(
                {
                    http: 'http://test.com:6000',
                    ssh: 'ssh://git@test.com:7000',
                    web: 'http://web.test.com'
                },
                undefined
            );
        });

        it('should return the matching server when the remote URL is an HTTP address and the server has no SSH URL.', () => {
            source = [{ http: 'http://example.com:8000', ssh: undefined }];

            url = 'http://example.com:8000/foo/bar';
            match({ http: 'http://example.com:8000', ssh: undefined }, 'same');
        });

        it('should not return a match when the remote URL is an SSH address and the server has no SSH URL.', () => {
            source = [{ http: 'http://example.com:8000', ssh: undefined }];

            url = 'ssh://git@test.com:7000/foo/bar';
            match(undefined, undefined);
        });

        it('should not cache the servers returned from the factory.', () => {
            url = 'http://example.com:8000/foo/bar';
            match({ http: 'http://example.com:8000', ssh: 'ssh://git@example.com:9000' }, 'same');

            source = [
                {
                    http: 'http://test.com:6000',
                    ssh: 'ssh://git@test.com:7000'
                }
            ];

            match(undefined, undefined);

            source = [
                {
                    http: 'http://example.com:8000',
                    ssh: 'ssh://git@example.com:9000'
                }
            ];

            match({ http: 'http://example.com:8000', ssh: 'ssh://git@example.com:9000' }, 'same');
        });
    });

    function match(
        expectedRemoteMatch: StaticServer | undefined,
        expectedWebMatch: 'same' | StaticServer | undefined
    ): void {
        expect(server.matchRemoteUrl(url), 'remote').to.deep.equal(expectedRemoteMatch);
        expect(server.matchWebUrl(url), 'web').to.deep.equal(
            expectedWebMatch === 'same' ? expectedRemoteMatch : expectedWebMatch
        );
    }
});

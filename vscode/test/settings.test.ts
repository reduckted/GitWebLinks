import { expect } from 'chai';
import * as sinon from 'sinon';
import { workspace } from 'vscode';

import { Settings } from '../src/settings';

describe('Settings', () => {
    let settings: Settings;

    beforeEach(() => {
        settings = new Settings();
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('getServers', () => {
        it('should not return servers without a HTTP URL.', () => {
            setup({
                foo: [
                    { http: 'a', ssh: 'b' },
                    { http: '', ssh: 'd' },
                    { http: undefined, ssh: 'f' },
                    { http: 'g', ssh: '' },
                    { http: 'i', ssh: undefined }
                ]
            });

            expect(settings.getServers('foo')).to.deep.equal([
                { http: 'a', ssh: 'b' },
                { http: 'g', ssh: '' },
                { http: 'i', ssh: undefined }
            ]);
        });

        it('should convert legacy settings.', () => {
            setup({
                bar: [
                    { baseUrl: 'a', sshUrl: 'b' },
                    { baseUrl: '', sshUrl: 'd' }
                ]
            });

            expect(settings.getServers('bar')).to.deep.equal([{ http: 'a', ssh: 'b' }]);
        });
    });

    describe('getDefaultLinkType', () => {
        it('should return "commit" if there is no stored value.', () => {
            setup({ linkType: undefined });
            expect(settings.getDefaultLinkType()).to.equal('commit');
        });

        ['commit', 'branch', 'defaultBranch'].forEach((value) => {
            it(`should return "${value}" when stored value is "${value}".`, () => {
                setup({ linkType: value });
                expect(settings.getDefaultLinkType()).to.equal(value);
            });
        });

        it('should return "commit" when the stored value is "hash".', () => {
            setup({ linkType: 'hash' });
            expect(settings.getDefaultLinkType()).to.equal('commit');
        });

        it('should return "commit" when the stored value is invalid.', () => {
            setup({ linkType: 'foo' });
            expect(settings.getDefaultLinkType()).to.equal('commit');
        });
    });

    describe('getDefaultBranch', () => {
        it('should return undefined if there is no stored value.', () => {
            setup({ defaultBranch: undefined });
            expect(settings.getDefaultBranch()).to.be.undefined;
        });

        it('should return the stored value when it exists.', () => {
            setup({ defaultBranch: 'foo' });
            expect(settings.getDefaultBranch()).to.equal('foo');
        });
    });

    describe('getShowCopy', () => {
        [true, false].forEach((value) => {
            it(`should return ${value} when the stored value is ${value}.`, () => {
                setup({ showCopy: value });
                expect(settings.getShowCopy()).to.equal(value);
            });
        });
    });

    describe('getShowOpen', () => {
        [true, false].forEach((value) => {
            it(`should return ${value} when the stored value is ${value}.`, () => {
                setup({ showOpen: value });
                expect(settings.getShowOpen()).to.equal(value);
            });
        });
    });

    describe('getUseShortHash', () => {
        [true, false].forEach((value) => {
            it(`should return ${value} when the stored value is ${value}.`, () => {
                setup({ useShortHash: value });
                expect(settings.getUseShortHash()).to.equal(value);
            });
        });
    });

    describe('getHandlerSetting', () => {
        it('should return the value of the specified key.', () => {
            setup({ foo: 'bar' });
            expect(settings.getHandlerSetting('foo')).to.equal('bar');
        });
    });

    function setup(data: Record<string, unknown>): void {
        sinon
            .stub(workspace, 'getConfiguration')
            .withArgs('gitweblinks')
            .returns({
                get: (section: string) => data[section],
                has: () => true,
                inspect: () => undefined,
                update: async () => Promise.resolve()
            });
    }
});

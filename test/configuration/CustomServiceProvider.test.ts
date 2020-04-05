import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

import { workspace } from 'vscode';

import { CustomServerProvider } from '../../src/configuration/CustomServerProvider';
import { ServerUrl } from '../../src/utilities/ServerUrl';

const expect = chai.use(sinonChai).expect;

describe('CustomServerProvider', () => {
    afterEach(() => {
        sinon.restore();
    });

    describe('getServers', () => {
        it('should return the servers with the specified type.', () => {
            let provider: CustomServerProvider;
            let get: sinon.SinonSpy;

            get = sinon.stub().returns([]);
            sinon.stub(workspace, 'getConfiguration').returns({ get } as any);

            provider = new CustomServerProvider();
            provider.getServers('foo');

            expect(get).to.have.been.calledWith('gitweblinks.foo');
        });

        it('should not return servers without a base url.', () => {
            let servers: ServerUrl[];
            let provider: CustomServerProvider;
            let get: sinon.SinonSpy;

            provider = new CustomServerProvider();

            get = sinon.stub().returns([
                { baseUrl: 'a', sshUrl: 'b' },
                { baseUrl: '', sshUrl: 'd' },
                { baseUrl: undefined, sshUrl: 'f' },
                { baseUrl: 'g', sshUrl: '' },
                { baseUrl: 'i', sshUrl: undefined }
            ]);

            sinon.stub(workspace, 'getConfiguration').returns({ get } as any);

            provider = new CustomServerProvider();
            servers = provider.getServers('foo');

            expect(servers).to.deep.equal([
                { baseUrl: 'a', sshUrl: 'b' },
                { baseUrl: 'g', sshUrl: '' },
                { baseUrl: 'i', sshUrl: undefined }
            ] as ServerUrl[]);
        });
    });
});

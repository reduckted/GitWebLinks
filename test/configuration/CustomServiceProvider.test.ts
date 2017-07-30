import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

import { workspace } from 'vscode';

import { CustomServerProvider } from '../../src/configuration/CustomServerProvider';
import { ServerUrl } from '../../src/utilities/ServerUrl';


const expect = chai.use(sinonChai).expect;


describe('CustomServerProvider', () => {

    let sandbox: sinon.SinonSandbox;


    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });


    afterEach(() => {
        sandbox.restore();
    });


    describe('getServers', () => {

        it('should return the servers with the specified type.', () => {
            let servers: ServerUrl[];
            let provider: CustomServerProvider;
            let getConfiguration: sinon.SinonSpy;
            let get: sinon.SinonSpy;


            get = sinon.stub().returns([]);
            getConfiguration = sandbox.stub(workspace, 'getConfiguration').returns({ get });

            provider = new CustomServerProvider();
            servers = provider.getServers('foo');

            expect(get).to.have.been.calledWith('gitweblinks.foo');
        });


        it('should not return servers without a base url.', () => {
            let servers: ServerUrl[];
            let provider: CustomServerProvider;
            let getConfiguration: sinon.SinonSpy;
            let get: sinon.SinonSpy;


            provider = new CustomServerProvider();

            get = sinon.stub().returns([
                { baseUrl: 'a', sshUrl: 'b' },
                { baseUrl: '', sshUrl: 'd' },
                { baseUrl: undefined, sshUrl: 'f' },
                { baseUrl: 'g', sshUrl: '' },
                { baseUrl: 'i', sshUrl: undefined }
            ]);

            getConfiguration = sandbox.stub(workspace, 'getConfiguration').returns({ get });

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

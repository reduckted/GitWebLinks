import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

import { workspace } from 'vscode';

import { LinkType, LinkTypeProvider } from '../../src/configuration/LinkTypeProvider';
import { ServerUrl } from '../../src/utilities/ServerUrl';


const expect = chai.use(sinonChai).expect;


describe('LinkTypeProvider', () => {

    let sandbox: sinon.SinonSandbox;


    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });


    afterEach(() => {
        sandbox.restore();
    });


    describe('getLinkType', () => {

        it('should return "hash" if there is no stored value.', () => {
            let provider: LinkTypeProvider;


            setupConfiguration(undefined);
            provider = new LinkTypeProvider();

            expect(provider.getLinkType()).to.equal('hash');
        });


        ['hash', 'branch'].forEach((value) => {
            it(`should return "${value}" when stored value is "${value}".`, () => {
                let provider: LinkTypeProvider;


                setupConfiguration(value);
                provider = new LinkTypeProvider();

                expect(provider.getLinkType()).to.equal(value);
            });
        });


        it('should return "hash" when stored value is invalid.', () => {
            let provider: LinkTypeProvider;


            setupConfiguration('name');
            provider = new LinkTypeProvider();

            expect(provider.getLinkType()).to.equal('hash');
        });

    });


    function setupConfiguration(value: any): void {
        let get: sinon.SinonSpy;


        get = sinon.stub().withArgs('gitweblinks.linkType').returns(value);
        sandbox.stub(workspace, 'getConfiguration').returns({ get });
    }

});

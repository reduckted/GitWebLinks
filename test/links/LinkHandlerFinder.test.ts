import { expect } from 'chai';
import * as sinon from 'sinon';

import { BitbucketCloudHandler } from '../../src/links/BitbucketCloudHandler';
import { BitbucketServerHandler } from '../../src/links/BitbucketServerHandler';
import { GitHubHandler } from '../../src/links/GitHubHandler';
import { LinkHandler } from '../../src/links/LinkHandler';
import { LinkHandlerFinder } from '../../src/links/LinkHandlerFinder';
import { VisualStudioTeamServicesHandler } from '../../src/links/VisualStudioTeamServicesHandler';

describe('LinkHandlerFinder', () => {
    afterEach(() => {
        sinon.restore();
    });

    function getHandlerTypes(): any[] {
        return [
            BitbucketCloudHandler,
            BitbucketServerHandler,
            GitHubHandler,
            VisualStudioTeamServicesHandler
        ];
    }

    describe('find', () => {
        it('should return undefined when no handler matches.', () => {
            let finder: LinkHandlerFinder;
            let result: LinkHandler | undefined;

            getHandlerTypes().forEach((type) => {
                (sinon.stub(type.prototype, 'isMatch') as any).returns(false);
            });

            finder = new LinkHandlerFinder();

            result = finder.find({ remoteUrl: 'a', rootDirectory: 'b' });

            expect(result).to.be.undefined;
        });

        getHandlerTypes().forEach((handler) => {
            it(`should return the ${handler.name} when it matches.`, () => {
                let finder: LinkHandlerFinder;
                let result: LinkHandler | undefined;

                getHandlerTypes().forEach((type) => {
                    (sinon.stub(type.prototype, 'isMatch') as any).returns(
                        type === handler
                    );
                });

                finder = new LinkHandlerFinder();

                result = finder.find({ remoteUrl: 'a', rootDirectory: 'b' });

                expect(result).to.be.an.instanceOf(handler);
            });
        });
    });
});

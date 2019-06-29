import { expect } from 'chai';
import { Uri, WorkspaceFolder } from 'vscode';

import { GitInfo } from '../../src/git/GitInfo';
import { LinkHandler } from '../../src/links/LinkHandler';
import { WorkspaceData } from '../../src/utilities/WorkspaceData';
import { WorkspaceMap } from '../../src/utilities/WorkspaceMap';

import { MockLinkHandler } from '../test-helpers/MockLinkHandler';

describe('WorkspaceMap', () => {
    let map: WorkspaceMap;
    let f1: WorkspaceFolder;
    let f2: WorkspaceFolder;
    let g1: GitInfo;
    let g2: GitInfo;
    let h1: LinkHandler;
    let h2: LinkHandler;

    beforeEach(() => {
        f1 = { index: 0, name: '0', uri: Uri.parse('file:///z/') };
        f2 = { index: 1, name: '1', uri: Uri.parse('file:///z/') };

        g1 = { remoteUrl: '1', rootDirectory: '1' };
        g2 = { remoteUrl: '2', rootDirectory: '2' };

        h1 = new MockLinkHandler();
        h2 = new MockLinkHandler();

        map = new WorkspaceMap();
        map.add(f1, g1, h1);
        map.add(f2, g2, h2);
    });

    describe('get', () => {
        it('should return the data for the given folder.', () => {
            let data: WorkspaceData | undefined;

            data = map.get(f1);
            expect(data, 'folder 1 was not found').to.be.ok;
            expect(data!.gitInfo).to.equal(g1);
            expect(data!.handler).to.equal(h1);

            data = map.get(f2);
            expect(data, 'folder 2 was not found').to.be.ok;
            expect(data!.gitInfo).to.equal(g2);
            expect(data!.handler).to.equal(h2);
        });

        it('should return undefined when folder is not in map.', () => {
            let data: WorkspaceData | undefined;
            let f3: WorkspaceFolder;

            f3 = { index: 2, name: '2', uri: Uri.parse('file:///z/') };
            data = map.get(f3);

            expect(data, 'folder 3 was found').to.be.undefined;
        });
    });

    describe('isEmpty', () => {
        it('should return true when empty.', () => {
            expect(new WorkspaceMap().isEmpty()).to.be.true;
        });

        it('should return false when not.', () => {
            expect(map.isEmpty()).to.be.false;
        });
    });

    describe('remove', () => {
        it('should remove the given folder.', () => {
            expect(map.get(f1)).to.be.ok;
            map.remove(f1);
            expect(map.get(f1)).to.be.undefined;
        });
    });
});

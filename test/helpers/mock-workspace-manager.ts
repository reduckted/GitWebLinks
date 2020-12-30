import { WorkspaceInfo, WorkspaceManager } from '../../src/workspace-manager';

export class MockWorkspaceManager implements Pick<WorkspaceManager, 'get'> {
    public info: WorkspaceInfo | undefined;

    public get(): WorkspaceInfo | undefined {
        return this.info;
    }

    public asManager(): WorkspaceManager {
        return (this as unknown) as WorkspaceManager;
    }
}

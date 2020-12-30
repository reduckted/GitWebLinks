import { WorkspaceInfo, WorkspaceManager } from '../../src/workspace-manager';

/**
 * Mock implementation of `WorkspaceManager`.
 */
export class MockWorkspaceManager implements Pick<WorkspaceManager, 'get'> {
    public info: WorkspaceInfo | undefined;

    /**
     * Gets workspace information.
     *
     * @returns The workspace information.
     */
    public get(): WorkspaceInfo | undefined {
        return this.info;
    }

    /**
     * Casts this instance to a `WorkspaceManager`.
     *
     * @returns This instance, typed as a `WorkspaceManager`.
     */
    public asManager(): WorkspaceManager {
        return (this as unknown) as WorkspaceManager;
    }
}

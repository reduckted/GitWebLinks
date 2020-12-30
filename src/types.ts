/**
 * The type of link to generate.
 */
export type LinkType = 'commit' | 'branch' | 'defaultBranch';

/**
 * Information about a Git repository.
 */
export interface Repository {
    /**
     * The root directory of the repository.
     */
    readonly root: string;

    /**
     * The URL to the default remote, or `undefined` if the repository has no remotes.
     */
    readonly remote: string | undefined;
}

/**
 * Information about a Git repository that has a remote.
 */
export type RepositoryWithRemote = Omit<Repository, 'remote'> & {
    /**
     * The URL of the default remote.
     */
    readonly remote: string;
};

/**
 * Defines a selected range in a file.
 */
export interface Selection {
    /**
     * The one-based line number that the selection starts at.
     */
    readonly startLine: number;

    /**
     * The one-based line number that the selection ends at.
     */
    readonly endLine: number;

    /**
     * The one-based column number that the selection starts at.
     */
    readonly startColumn: number;

    /**
     * The one-based column number that the selection ends at.
     */
    readonly endColumn: number;
}

/**
 * Options for generating a link.
 */
export interface LinkOptions {
    /**
     * The type of link to create.
     *
     * A value of `undefined` means the default link type should be used.
     */
    readonly type: LinkType | undefined;

    /**
     * The selection range to include in the link.
     *
     * A value of `undefined` means no selection range should be included.
     */
    readonly selection: Selection | undefined;
}

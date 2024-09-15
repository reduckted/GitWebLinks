import { StaticServer } from './schema';

/**
 * The type of link to generate.
 */
export type LinkType = 'commit' | 'branch' | 'defaultBranch';

/**
 * The format to use when copying a link.
 */
export type LinkFormat = 'raw' | 'markdown' | 'markdownWithPreview';

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
    readonly remote: Remote | undefined;
}

/**
 * Information about a Git repository that has a remote.
 */
export type RepositoryWithRemote = Omit<Repository, 'remote'> & {
    /**
     * The URL of the default remote.
     */
    readonly remote: Remote;
};

/**
 * A Git remote.
 */
export interface Remote {
    /**
     * The name of the remote.
     */
    readonly name: string;

    /**
     * The URL of the remote.
     */
    readonly url: string;
}

/**
 * Defines a selected range in a file.
 */
export interface SelectedRange {
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
     * The target of the link to create.
     *
     * A value of `undefined` means the link should target the default link type.
     */
    readonly target: LinkTarget;
}

/**
 * A link target.
 */
export type LinkTarget = LinkTargetRef | LinkTargetPreset;

export interface LinkTargetRef {
    /**
     * The abbreviated and symbolic ref to create the link to.
     */
    readonly ref: { readonly abbreviated: string; readonly symbolic: string };

    /**
     * What the ref refers to.
     */
    readonly type: 'commit' | 'branch';
}

export interface LinkTargetPreset {
    /**
     * The type of link to create.
     *
     * A value of `undefined` means the default link type should be used.
     */
    readonly preset: LinkType | undefined;
}

/**
 * Information about a file.
 */
export interface FileInfo {
    /**
     * The path of the file from the root of the repository.
     */
    filePath: string;

    /**
     * The selected range in the file.
     */
    selection?: SelectedRange;
}

/**
 * Information about a URL.
 */
export interface UrlInfo {
    /**
     * The path of the file from the root of the repository.
     */
    filePath: string;

    /**
     * The server URLs determined from the URL.
     */
    server: StaticServer;

    /**
     * The selected range in the file.
     */
    selection: Partial<SelectedRange>;
}

/**
 * Makes all properties on an object read/write.
 */
export type Mutable<T> = {
    -readonly [P in keyof T]: T[P];
};

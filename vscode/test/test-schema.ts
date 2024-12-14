import type { HandlerDefinition, Template } from '../src/schema';
import type { SelectedRange } from '../src/types';

/**
 * Settings to make available during a test.
 */
export type TestSettings = Record<string, unknown>;

/**
 * A handler with test data.
 */
export type HandlerWithTests = HandlerDefinition & {
    /**
     * The test data for the handler.
     */
    tests: Tests;
};

/**
 * The test data for the handler.
 */
export interface Tests {
    /**
     * Settings to make available during all tests.
     */
    settings?: TestSettings;

    /**
     * Defines the test cases for creating URLs.
     */
    createUrl: UrlTests;
}

/**
 * Test cases for creating URLs.
 */
export interface UrlTests {
    /**
     * Tests for different types of remote URLs.
     */
    remotes: RemoteUrlTests;

    /**
     * A test for a file path that contains spaces.
     */
    spaces: UrlTest;

    /**
     * Additional tests for any scenarios that are not covered by the standard tests.
     */
    misc?: CustomTest[];

    /**
     * A test for creating a link using the current branch.
     */
    branch: UrlTest;

    /**
     * A test for creating a link using the current commit hash.
     */
    commit: UrlTest;

    /**
     * Tests for including the selected range in the URL.
     */
    selection: SelectionTests;
}

/**
 * Tests for different types of remote URLs.
 */
export interface RemoteUrlTests {
    /**
     * Settings to make available during all tests.
     */
    settings?: TestSettings;

    /**
     * The HTTP(S) remote URL to test that does not contain a username.
     */
    http: string;

    /**
     * The HTTP(S) remote URL to test that contains a username.
     */
    httpWithUsername: string;

    /**
     * The SSH remote URL to test that does not start with 'ssh://'.
     */
    ssh: string;

    /**
     * The SSH remote URL to test that starts with 'ssh://'.
     */
    sshWithProtocol: string;

    /**
     * The URL that is expected to be created.
     */
    result: Template;
}

export interface UrlTest {
    /**
     * Settings to make available during all tests.
     */
    settings?: TestSettings;

    /**
     * The remote URL to test.
     */
    remote: string;

    /**
     * The URL that is expected to be created.
     */
    result: Template;
}

/**
 * Defines a test that covers a scenario that is not covered by the standard tests.
 */
export interface CustomTest {
    /**
     * The name of the test.
     */
    name: string;

    /**
     * Settings to make available during all tests.
     */
    settings?: TestSettings;

    /**
     * The remote URL to test.
     */
    remote: string;

    /**
     * The name of the file to test.
     */
    fileName?: string;

    /**
     * The name of the branch to test.
     */
    branch?: string;

    /**
     * The type of link to create.
     */
    type?: 'branch' | 'commit';

    /**
     * The selected range to test.
     */
    selection?: CustomTestSelection;

    /**
     * The URL that is expected to be created.
     */
    result: Template;
}

/**
 * Defines a selected range to test.
 */
export interface CustomTestSelection {
    /**
     * The one-based line number that the selection starts on.
     */
    startLine: number;

    /**
     * The one-based column number that the selection starts on.
     */
    startColumn: number;

    /**
     * The one-based line number that the selection ends on.
     */
    endLine: number;

    /**
     * The one-based column number that the selection ends on.
     */
    endColumn: number;
}

/**
 * Defines tests that include a selected range.
 */
export interface SelectionTests {
    /**
     * Settings to make available during all tests.
     */
    settings?: TestSettings;

    /**
     * The remote URL to use in the tests.
     */
    remote: string;

    /**
     * A test for the selection having the same start and end point.
     */
    point: SelectionPointTest;

    /**
     * A test for the selection having different start and end points, but on the same line.
     */
    singleLine: SelectionSingleLineTest;

    /**
     * A test for the selection having different start and end points and on different lines.
     */
    multipleLines: SelectionMultipleLinesTest;
}

/**
 * Defines a test for the selection having the same start and end point.
 */
export interface SelectionPointTest {
    /**
     * The one-based line number that the selection is on.
     */
    line: number;

    /**
     * The URL that is expected to be created.
     */
    result: Template;

    /**
     * The selection range to expect when parsing the URL to file info.
     */
    reverseRange?: Partial<SelectedRange>;
}

/**
 * Defines a test for the selection having different start and end points, but on the same line.
 */
export interface SelectionSingleLineTest {
    /**
     * The one-based line number that the selection is on.
     */
    line: number;

    /**
     * The one-based column number that the selection starts at.
     */
    startColumn: number;

    /**
     * The one-based column number that the selection ends at.
     */
    endColumn: number;

    /**
     * The URL that is expected to be created.
     */
    result: Template;

    /**
     * The selection range to expect when parsing the URL to file info.
     */
    reverseRange?: Partial<SelectedRange>;
}

/**
 * Defines a test for the selection having different start and end points and on different lines.
 */
export interface SelectionMultipleLinesTest {
    /**
     * The one-based line number that the selection starts on.
     */
    startLine: number;

    /**
     * The one-based column number that the selection starts on.
     */
    startColumn: number;

    /**
     * The one-based line number that the selection ends on.
     */
    endLine: number;

    /**
     * The one-based column number that the selection ends on.
     */
    endColumn: number;

    /**
     * The URL that is expected to be created.
     */
    result: Template;

    /**
     * The selection range to expect when parsing the URL to file info.
     */
    reverseRange?: Partial<SelectedRange>;
}

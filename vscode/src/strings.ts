import type { Uri } from 'vscode';

import { format } from 'util';

export const STRINGS = {
    extension: {
        gitExtensionNotFound: 'Could not find the "vscode.git" extension.'
    },
    getLinkCommand: {
        noFileSelected: 'Cannot copy a link because no file is selected.',
        openInBrowser: 'Open in Browser',
        openSettings: 'Open Settings',
        copyAsRawUrl: 'Copy Raw URL',
        copyAsMarkdownLink: 'Copy Markdown',
        copyAsMarkdownLinkWithoutPreview: 'Copy without Code Block',
        copyAsMarkdownLinkWithPreview: 'Copy with Code Block',
        linkCopied: (handlerName: string): string =>
            format('%s link copied to the clipboard.', handlerName),
        error: 'An error occurred while creating the link.',
        notTrackedByGit: (file: Uri): string =>
            format("The file '%s' is not tracked by Git.", file.toString()),
        noRemote: (repositoryRoot: Uri): string =>
            format("The repository '%s' does not have any remotes.", repositoryRoot.toString()),
        noRemoteHead: (repositoryRoot: Uri, remoteName: string): string =>
            format(
                "The repository '%s' does not have a 'HEAD' ref for the '%s' remote. You can fix this by running the command: git remote set-head %s --auto",
                repositoryRoot.toString(),
                remoteName,
                remoteName
            ),
        noHandler: (remote: string): string =>
            format(
                "The Git remote '%s' is not supported. If this is a private Git server, you may need to add the server address to the settings.",
                remote
            )
    },
    goToFileCommand: {
        inputBoxPrompt: 'Enter the URL of the file to go to',
        invalidUrl: 'The value is not a valid URL.',
        unknownUrl: 'Could not determine which file the URL corresponds to.',
        noFilesFound: 'No files were found for the URL.'
    }
};

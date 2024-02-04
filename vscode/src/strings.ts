import { format } from 'util';
import { Uri } from 'vscode';

export const STRINGS = {
    extension: {
        gitNotFound: 'Could not find Git. Make sure Git is installed and in the PATH.'
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
            format("The file '%s' is not tracked by Git.", file),
        noRemote: (repositoryRoot: string): string =>
            format("The repository '%s' does not have any remotes.", repositoryRoot),
        noRemoteHead: (repositoryRoot: string, remoteName: string): string =>
            format(
                "The repository '%s' does not have a 'HEAD' ref for the '%s' remote. You can fix this by running the command: git remote set-head %s --auto",
                repositoryRoot,
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

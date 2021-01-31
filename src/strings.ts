import { format } from 'util';
import { Uri } from 'vscode';

export const STRINGS = {
    extension: {
        gitNotFound: 'Could not find Git. Make sure Git is installed and in the PATH.'
    },
    getLinkCommand: {
        failure: 'Unable to find the repository for the file.',
        noFileSelected: 'Cannot copy a link because no file is selected.',
        openInBrowser: 'Open in Browser',
        openSettings: 'Open Settings',
        linkCopied: (handlerName: string): string =>
            format('%s link copied to the clipboard.', handlerName),
        error: 'An error occurred while creating the link.',
        notTrackedByGit: (file: Uri): string =>
            format("The file '%s' is not tracked by Git.", file),
        noRemote: (repositoryRoot: string): string =>
            format("The repository '%s' does not have any remotes.", repositoryRoot),
        noHandler: (remote: string): string =>
            format(
                "The Git remote '%s' is not supported. If this is a private Git server, you may need to add the server address to the settings.",
                remote
            )
    }
};

import { format } from 'util';
import { Uri } from 'vscode';

export const STRINGS = {
    extension: {
        gitNotFound: 'Could not find Git. Make sure Git is installed and in the PATH.'
    },
    repositoryFinder: {
        failure: 'Unable to find the repository for the workspace.'
    },
    command: {
        noFileSelected: 'Cannot copy a link because no file is selected.',
        openInWeb: 'Open in Web',
        linkCopied: (handlerName: string): string =>
            format('%s link copied to the clipboard.', handlerName),
        error: 'An error occurred while creating the link.',
        fileNotInWorkspace: (file: Uri): string =>
            format("Cannot copy a link to '%s' because it's not in a workspace.", file),
        noWorkspaceInfo: (folder: Uri): string =>
            format("Could not find the workspace information for '%s'.", folder),
        notTrackedByGit: (folder: Uri): string =>
            format("The workspace at '%s' is not tracked by Git.", folder),
        noRemote: (repositoryRoot: string): string =>
            format("The repository '%s' does not have any remotes.", repositoryRoot),
        noHandler: (remote: string): string =>
            format(
                "The Git remote '%s' is not supported. If this is a private Git server, you may need to add the server address to the settings.",
                remote
            )
    }
};

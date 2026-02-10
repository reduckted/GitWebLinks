export const EXTENSION = {
    id: 'gitweblinks',
    name: 'Git Web Links'
};

export const CONFIGURATION = {
    section: EXTENSION.id,
    linkType: 'linkType',
    linkFormat: 'linkFormat',
    defaultBranch: 'defaultBranch',
    preferredRemoteName: 'preferredRemoteName',
    showCopy: 'showCopy',
    showOpen: 'showOpen',
    useShortHash: 'useShortHash'
};

export const CONTEXT = {
    hasRepositories: `${EXTENSION.id}:hasRepositories`,
    canCopy: `${EXTENSION.id}:canCopy`,
    canOpen: `${EXTENSION.id}:canOpen`
};

export const COMMANDS = {
    copyFile: `${EXTENSION.id}.copyFile`,
    copySelection: `${EXTENSION.id}.copySelection`,
    copySelectionToDefaultBranch: `${EXTENSION.id}.copySelectionToDefaultBranch`,
    copySelectionToBranch: `${EXTENSION.id}.copySelectionToBranch`,
    copySelectionToCommit: `${EXTENSION.id}.copySelectionToCommit`,
    copySelectionToTag: `${EXTENSION.id}.copySelectionToTag`,
    copySelectionToChoice: `${EXTENSION.id}.copySelectionToChoice`,
    openFile: `${EXTENSION.id}.openFile`,
    openSelection: `${EXTENSION.id}.openSelection`,
    goToFile: `${EXTENSION.id}.goToFile`
};

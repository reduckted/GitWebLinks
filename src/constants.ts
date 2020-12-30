export const EXTENSION = {
    id: 'gitweblinks',
    name: 'Git Web Links'
};

export const CONFIGURATION = {
    section: EXTENSION.id,
    linkType: 'linkType',
    defaultBranch: 'defaultBranch'
};

export const CONTEXT = {
    canCopy: `${EXTENSION.id}:canCopy`
};

export const COMMANDS = {
    copyFile: `${EXTENSION.id}.copyFile`,
    copySelection: `${EXTENSION.id}.copySelection`,
    copySelectionToDefaultBranch: `${EXTENSION.id}.copySelectionToDefaultBranch`,
    copySelectionToBranch: `${EXTENSION.id}.copySelectionToBranch`,
    copySelectionToCommit: `${EXTENSION.id}.copySelectionToCommit`
};

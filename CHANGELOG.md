# Changelog

## 2.15.0 (2026-01-16)

-   ⭐ GitHub Remotes: Allow tags to be selected when choosing what ref to create a link to.
-   ⭐ VS Code: The Quick Pick for selecting the ref to create a link to now has icons.
-   🐛 Exclude the detached HEAD from the list of branches to create a link to.
-   🔨 Dependency updates.


## 2.14.1 (2026-01-16)

-   🐛 Supported SSH user specifications other than "git".
-   🔨 Dependency updates.

## 2.14.0 (2025-02-05)

### Changes

-   ✨ Visual Studio: Better error messages when Git is not installed.

## 2.13.0 (2025-01-15)

### New Features

-   ⭐ VS Code: Repositories are found using VS Code's Git extension.
-   ⭐ Visual Studio: A notification is shown when a link is copied.
-   ⭐ Visual Studio: Go to the file that a URL points to using the _Go To File From Link_ command (<kbd>Ctrl</kbd>+<kbd>1</kbd>,<kbd>Ctrl</kbd>+<kbd>L</kbd>).

### Maintenance

-   🔨 Dependency updates.

## 2.12.0 (2024-09-22)

### New Features

-   ⭐ Allow Gitiles URL for HTTP remote to be different to URL for the web interface.

## 2.11.0 (2024-03-20)

### New Features

-   ⭐ Added support for Gitea.

## 2.10.0 (2024-02-05)

### New Features

-   ⭐ Added an option to format the copied links as either a plain URL, a markdown link, or a markdown link with a code block that contains the selected lines.

## 2.9.3 (2023-08-22)

### New Features

-   ⭐ Bitbucket Cloud branch URLs now use a shorter format when possible.

## 2.9.2 (2022-12-23)

### Maintenance

-   🔨 Dependency updates.

## 2.9.0 (2022-10-30)

-   ⭐ New command that lets you choose which branch or commit to generate the link to.

## 2.8.1 (2022-10-22)

### Bug Fixes

-   🐛 VS Code: Changed the keyboard shortcut to <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>L</kbd> on Windows and Linux, and <kbd>Ctrl</kbd>+<kbd>Cmd</kbd>+<kbd>L</kbd> on macOS to avoid conflicts with VS Code's default keyboard shortcuts.

## 2.8.0 (2022-10-08)

### New Features

-   ⭐ VS Code: Use the keyboard shortcut <kbd>Ctrl</kbd>+<kbd>G</kbd>,<kbd>Ctrl</kbd>+<kbd>L</kbd> to copy the link to the current selection (thanks @rubengmurray).

### Maintenance

-   🔨 Dependency updates.

## 2.7.0 (2022-02-21)

## New Features

-   ⭐ You can now generate links that use short SHA hashes.
-   ⭐ You can use a remote other than "origin".

### Maintenance

-   🔨 Dependency updates.

## 2.6.0 (2021-10-30)

### New Features

-   ⭐ Setting to create [github.dev](https://github.dev) links instead of [github.com](https://github.com) links (thanks @jungaretti).

### Maintenance

-   🔨 Dependency updates.

## 2.5.3 (2021-09-30)

### Changes

-   ✨ Better handling of markdown files for GitHub.

### Maintenance

-   🔨 Dependency updates.

## 2.5.2 (2021-08-09)

### Bug Fixes

-   🐛 GitHub links now handle hashes in file names.

## 2.5.1 (2021-07-10)

### Bug Fixes

-   🐛 GitHub links now prevent markdown files from being rendered.
-   🐛 Selections that end at the start of a new line are adjusted to end at the end of the previous line.

### Maintenance

-   🔨 Dependency updates.

## 2.5.0 (2021-04-11)

### Changes

-   ✨ The default branch is discovered using the the remote's `HEAD` ref (thanks @kvart714).

### Maintenance

-   🔨 Dependency updates.

## 2.4.0 (2021-03-11)

### New Features

-   ⭐ Added support for Gitiles (thanks @csm10495).

## 2.3.0 (2021-02-07)

### New Features

-   ⭐ VS Code: Go to the file that a URL points to using the _Go To File_ command.

### Maintenance

-   🔨 Dependency updates.

## 2.2.0 (2021-01-28)

### New Features

-   ⭐ VS Code: The notification shown after copying a link contains a button to open the link in the browser (thanks @kvart714).
-   ⭐ New commands to open links directly in the browser instead of copying to the clipboard (see the readme for the new settings).

## 2.1.1 (2021-01-26)

### Bug Fixes

-   🐛 Fixed "file is not tracked by Git" errors in Linux.

## 2.1.0 (2021-01-24)

### New Features

-   ⭐ Added support for Git worktrees (thanks @ecraig12345).

### Changes

-   ✨ VS Code: Workspaces that contain multiple repositories are now supported.

## 2.0.0 (2020-12-30)

### New Features

-   ⭐ Added the ability to generate links using the default branch name instead of the current branch name.
-   ⭐ Added commands to generate a link using the current commit hash, current branch name or default branch name (instead of using the link type specified in the settings).

### Changes

-   ✨ On-premise URL settings have been renamed from `baseUrl`/`sshUrl` to `http`/`ssh`. The existing properties are still supported, but you may see warnings appear when viewing your `settings.json` file.
-   ✨ The `hash` link type has been renamed to `commit`. The existing value is still supported, but you may see a warning appear when viewing your `settings.json` file.

## 1.9.0 (2020-11-15)

### New Features

-   ⭐ Added support for Azure DevOps Server (thanks @kvart714).

## 1.8.1 (2020-07-12)

### Changes

-   ✨ VS Code: Logging improvements.

## 1.8.0 (2020-07-12)

### New Features

-   ⭐ VS Code: Logging to the "GitWebLinks" output channel.

## 1.7.0 (2020-05-24)

### New Features

-   ⭐ GitLab support.

## 1.6.0 (2020-05-17)

### New Features

-   ⭐ Supported getting web links for symlinked files and directories.

## 1.5.2 (2020-05-06)

### New Features

-   ⭐ Handled VSTS repositories in sub-directories.

### Maintenance

-   🔨 Replaced `vscode` dependency with `@types/vscode`.

## 1.5.1 (2020-04-05)

### Maintenance

-   🔨 Dependency updates.

## 1.5.0 (2020-02-12)

### New Features

-   ⭐ VS Code: A notification is shown when a link is copied.
-   ⭐ VS Code: Commands can now be run via the command palette or shortcut keys (#2).

### Changes

-   ✨ VS Code: Commands are listed under the "Git Web Links" category.

### Maintenance

-   🔨 Dependency updates.

## 1.4.1 (2019-11-20)

### Bug Fixes

-   🐛 Fixed selection ranges in Azure DevOps.

## 1.4.0 (2019-06-29)

### New Features

-   ⭐ Added support for Azure DevOps.

## 1.3.1 (2019-06-09)

### Maintenance

-   🔨 Dependency updates.

## 1.3.0 (2018-12-13)

### Changes

-   ✨ VS Code: Used VS Code's clipboard API. No longer requires `xclip` on Linux!

## 1.2.3 (2018-11-27)

### Maintenance

-   🔨 Dependency updates

## 1.2.1 (2017-12-31)

### New Features

-   ⭐ Added support for Visual Studio Team Services repositories in collections.

## 1.2.0 (2017-12-08)

### New Features

-   ⭐ Added the ability to generate links using the current branch name of current commit hash.

### Bug Fixes

-   🐛 Fixed a bug that would create the wrong URL when there was a space in the file path.

## 1.1.1 (2017-11-12)

### Added

-   ⭐ VS Code: Support for multi-root workspaces.

## 1.0.0 (2017-08-03)

-   🎉 Initial release.

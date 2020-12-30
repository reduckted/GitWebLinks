# [2.0.0] (2020-12-30)

## New Features

-   ⭐ Added the ability to generate links using the default branch name instead of the current branch name.
-   ⭐ Added commands to generate a link using the current commit hash, current branch name or default branch name (instead of using the link type specified in the settings).

## Changes

-   ✨ On-premise URL settings have been renamed from `baseUrl`/`sshUrl` to `http`/`ssh`. The existing properties are still supported, but you may see warnings appear when viewing your `settings.json` file.
-   ✨ The `hash` link type has been renamed to `commit`. The existing value is still supported, but you may see a warning appear when viewing your `settings.json` file.

# [1.9.0] (2020-11-15)

## New Features

-   ⭐ Added support for Azure DevOps Server.

# [1.8.1] (2020-07-12)

## Changes

-   ✨ Logging improvements.

# [1.8.0] (2020-07-12)

## New Features

-   ⭐ Logging to the "GitWebLinks" output channel.

# [1.7.0] (2020-05-24)

## New Features

-   ⭐ GitLab support.

# [1.6.0] (2020-05-17)

## New Features

-   ⭐ Supported getting web links for symlinked files and directories.

# [1.5.2] (2020-05-06)

## New Features

-   ⭐ Handled VSTS repositories in sub-directories.

## Maintenance

-   🔨 Replaced `vscode` dependency with `@types/vscode`.

# [1.5.1] (2020-04-05)

## Maintenance

-   🔨 Dependency updates.

# [1.5.0] (2020-02-12)

## New Features

-   ⭐ A notification is shown when a link is copied.
-   ⭐ Commands can now be run via the command palette or shortcut keys (#2).

## Changes

-   ✨ Commands are listed under the "Git Web Links" category.

## Maintenance

-   🔨 Dependency updates.

# [1.4.1] (2019-11-20)

## Bug Fixes

-   🐛 Fixed selection ranges in Azure DevOps.

# [1.4.0] (2019-06-29)

## New Features

-   ⭐ Added support for Azure DevOps.

# [1.3.1] (2019-06-09)

## Maintenance

-   🔨 Dependency updates.

# [1.3.0] (2018-12-13)

## Changes

-   ✨ Used VS Code's clipboard API. No longer requires `xclip` on Linux!

# [1.2.3] (2018-11-27)

## Maintenance

-   🔨 Dependency updates

# [1.2.1] (2017-12-31)

## New Features

-   ⭐ Added support for Visual Studio Team Services repositories in collections.

# [1.2.0] (2017-12-08)

## New Features

-   ⭐ Added the ability to generate links using the current branch name of current commit hash.

## Bug Fixes

-   🐛 Fixed a bug that would create the wrong URL when there was a space in the file path.

# [1.1.1] (2017-11-12)

## Added

-   ⭐ Support for multi-root workspaces.

# [1.0.0] (2017-08-03)

-   🎉 Initial release.

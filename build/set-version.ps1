param (
    [switch] $Major,
    [switch] $Minor,
    [switch] $Patch
)

Set-StrictMode -Version 3.0
$ErrorActionPreference = 'Stop'

$root = Split-Path -Path $PSScriptRoot -Parent

$current = [System.Version]::Parse((Get-Content -Path "$root/vscode/package.json" | ConvertFrom-Json | Select-Object -ExpandProperty "version"))

if ($Major) {
    $new = New-Object -TypeName System.Version -ArgumentList ($current.Major + 1), 0, 0

} elseif ($Minor) {
    $new = New-Object -TypeName System.Version -ArgumentList $current.Major, ($current.Minor + 1), 0

} elseif ($Patch) {
    $new = New-Object -TypeName System.Version -ArgumentList $current.Major, $current.Minor, ($current.Build + 1)

} else {
    Write-Host "Specify the -Major, -Minor or -Patch switch."
    return
}

Write-Host "Current version: $current"
Write-Host "New version: $new"

Write-Host "Updating VS Code extension..."
Push-Location "$root/vscode"
try {
    & npm version $new.ToString() --no-git-tag-version | Out-Null

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to update the VS Code extension."
        return
    }

} finally {
    Pop-Location
}

Write-Host "Updating Visual Studio extension..."
# Set the version in the props file.
$manifestFileName = Join-Path $root -ChildPath "visual-studio/source/GitWebLinks/source.extension.vsixmanifest"
$manifest = New-Object -TypeName System.Xml.XmlDocument
$manifest.PreserveWhitespace = $true
$manifest.Load($manifestFileName)
$namespace = @{ x = "http://schemas.microsoft.com/developer/vsx-schema/2011" }
$identity = Select-Xml -Xml $manifest -XPath "/x:PackageManifest/x:Metadata/x:Identity" -Namespace $namespace
([System.Xml.XmlElement]$identity.Node).SetAttribute("Version", $new.ToString())
$manifest.Save($manifestFileName)

# Set the version in the manifest's generated code-behind file.
$codeFileName = Join-Path -Path $root -ChildPath "visual-studio/source/GitWebLinks/source.extension.cs"
$code = Get-Content -Path $codeFileName -Raw
$code = $code -replace "public const string Version = `"[\d.]+`";", "public const string Version = `"$($new.ToString())`";"
Set-Content -Path $codeFileName -Value $code -NoNewLine

# Set the version in the assembly info.
$assemblyInfoFileName = Join-Path -Path $root -ChildPath "visual-studio/source/GitWebLinks/Properties/AssemblyInfo.cs"
$assemblyInfo = Get-Content -Path $assemblyInfoFileName -Raw
$assemblyInfo = $assemblyInfo -replace "Version\(`"[\d.]+`"\)", "Version(`"$($new.ToString()).0`")"
Set-Content -Path $assemblyInfoFileName -Value $assemblyInfo -NoNewLine

Write-Host "Done"

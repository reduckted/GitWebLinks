#nullable enable

using System;
using System.IO;
using System.Runtime.InteropServices;

namespace GitWebLinks;

internal static class NativeMethods {

    public const int FILE_ATTRIBUTE_DIRECTORY = 0x10;
    public const int FILE_ATTRIBUTE_NORMAL = 0x80;
    public const uint FILE_READ_EA = 0x8;
    public const uint FILE_FLAG_BACKUP_SEMANTICS = 0x02000000;

    public static readonly IntPtr INVALID_HANDLE_VALUE = new(-1);


    [DllImport("shlwapi.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    [DefaultDllImportSearchPaths(DllImportSearchPath.System32)]
    public static extern unsafe int PathRelativePathTo(char* pszPath, string pszFrom, int dwAttrFrom, string pszTo, int dwAttrTo);


    [DllImport("Kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    [DefaultDllImportSearchPaths(DllImportSearchPath.System32)]
    public static extern unsafe uint GetFinalPathNameByHandle(IntPtr hFile, char* lpszFilePath, uint cchFilePath, uint dwFlags);


    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    [DefaultDllImportSearchPaths(DllImportSearchPath.System32)]
    public static extern IntPtr CreateFile(
        string filename,
        uint access,
        [MarshalAs(UnmanagedType.U4)] FileShare share,
        IntPtr securityAttributes,
        [MarshalAs(UnmanagedType.U4)] FileMode creationDisposition,
        uint flagsAndAttributes,
        IntPtr templateFile
    );


    [DllImport("kernel32.dll", SetLastError = true)]
    [DefaultDllImportSearchPaths(DllImportSearchPath.System32)]
    public static extern bool CloseHandle(IntPtr hObject);

}

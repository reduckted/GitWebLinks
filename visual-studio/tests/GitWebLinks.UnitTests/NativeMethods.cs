using System.Runtime.InteropServices;

namespace GitWebLinks;

internal static class NativeMethods {

    public const int SYMBOLIC_LINK_FLAG_DIRECTORY = 1;


    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    [DefaultDllImportSearchPaths(DllImportSearchPath.System32)]
    [return: MarshalAs(UnmanagedType.I1)]
    public static extern bool CreateSymbolicLink(string lpSymlinkFileName, string lpTargetFileName, int dwFlags);

}

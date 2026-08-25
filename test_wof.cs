using System;
using System.IO;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

class Program {
    [StructLayout(LayoutKind.Sequential)]
    struct WOF_EXTERNAL_INFO {
        public uint Version;
        public uint Provider;
    }

    [StructLayout(LayoutKind.Sequential)]
    struct FILE_PROVIDER_EXTERNAL_INFO_V1 {
        public uint Version;
        public uint Algorithm;
        public uint Flags;
    }

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    static extern SafeFileHandle CreateFile(
        string lpFileName, uint dwDesiredAccess, uint dwShareMode,
        IntPtr lpSecurityAttributes, uint dwCreationDisposition,
        uint dwFlagsAndAttributes, IntPtr hTemplateFile);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool DeviceIoControl(
        SafeFileHandle hDevice, uint dwIoControlCode,
        IntPtr lpInBuffer, uint nInBufferSize,
        IntPtr lpOutBuffer, uint nOutBufferSize,
        out uint lpBytesReturned, IntPtr lpOverlapped);

    static void Main(string[] args) {
        if (args.Length == 0) return;
        string path = args[0];
        
        using (SafeFileHandle handle = CreateFile(path, 0x40000000 | 0x80000000, 0, IntPtr.Zero, 3, 0x02000000, IntPtr.Zero)) {
            if (handle.IsInvalid) {
                Console.WriteLine("CreateFile failed: " + Marshal.GetLastWin32Error());
                return;
            }

            int inBufferSize = Marshal.SizeOf<WOF_EXTERNAL_INFO>() + Marshal.SizeOf<FILE_PROVIDER_EXTERNAL_INFO_V1>();
            IntPtr inBuffer = Marshal.AllocHGlobal(inBufferSize);

            // WOF_EXTERNAL_INFO
            Marshal.WriteInt32(inBuffer, 0, 1); // Version = 1
            Marshal.WriteInt32(inBuffer, 4, 2); // Provider = WOF_PROVIDER_FILE (2)

            // FILE_PROVIDER_EXTERNAL_INFO_V1
            Marshal.WriteInt32(inBuffer, 8, 1); // Version = 1
            Marshal.WriteInt32(inBuffer, 12, 3); // Algorithm = FILE_PROVIDER_COMPRESSION_LZX (3)
            Marshal.WriteInt32(inBuffer, 16, 0); // Flags = 0

            uint bytesReturned;
            // FSCTL_SET_EXTERNAL_BACKING = 0x9030C
            bool success = DeviceIoControl(handle, 0x9030C, inBuffer, (uint)inBufferSize, IntPtr.Zero, 0, out bytesReturned, IntPtr.Zero);
            
            Marshal.FreeHGlobal(inBuffer);

            Console.WriteLine("Compression: " + success + (success ? "" : " Error: " + Marshal.GetLastWin32Error()));
        }
    }
}

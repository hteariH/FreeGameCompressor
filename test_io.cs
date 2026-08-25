using System;
using System.Runtime.InteropServices;

class Program {
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern IntPtr CreateJobObjectW(IntPtr lpJobAttributes, string lpName);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool SetInformationJobObject(IntPtr hJob, int JobObjectInformationClass, ref JOBOBJECT_IO_RATE_CONTROL_INFORMATION lpJobObjectInformation, int cbJobObjectInformationLength);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    struct JOBOBJECT_IO_RATE_CONTROL_INFORMATION {
        public long MaxIops;
        public long MaxBandwidth;
        public long ReservationIops;
        public IntPtr VolumeName;
        public uint BaseIoSize;
        public uint ControlFlags;
    }

    static void Main() {
        IntPtr hJob = CreateJobObjectW(IntPtr.Zero, null);
        var ioInfo = new JOBOBJECT_IO_RATE_CONTROL_INFORMATION {
            MaxBandwidth = 50 * 1024 * 1024, // 50 MB/s
            ControlFlags = 1 // JOB_OBJECT_IO_RATE_CONTROL_ENABLE
        };
        
        bool success = SetInformationJobObject(hJob, 33, ref ioInfo, Marshal.SizeOf(ioInfo));
        Console.WriteLine("Success: " + success);
        if (!success) {
            Console.WriteLine("Error: " + Marshal.GetLastWin32Error());
        }
    }
}

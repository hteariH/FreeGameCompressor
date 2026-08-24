import os from 'os';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { DriveInfo } from '../../renderer/src/types';

const execAsync = promisify(exec);

export async function getDriveInfos(): Promise<DriveInfo[]> {
  const isWindows = process.platform === 'win32';
  const isLinux = process.platform === 'linux';
  const isMac = process.platform === 'darwin';
  const drives: DriveInfo[] = [];

  if (isWindows) {
    try {
      const { stdout } = await execAsync(
        `powershell -NoProfile -Command "Get-CimInstance -ClassName Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 } | Select-Object DeviceID, VolumeName, Size, FreeSpace, FileSystem | ConvertTo-Json -Compress"`
      );
      if (stdout.trim()) {
        const data = JSON.parse(stdout.trim());
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          const total = parseInt(item.Size || '0', 10);
          const free = parseInt(item.FreeSpace || '0', 10);
          drives.push({
            mount: item.DeviceID || 'C:',
            label: item.VolumeName || `Local Disk (${item.DeviceID})`,
            totalBytes: total,
            freeBytes: free,
            usedBytes: Math.max(0, total - free),
            savedBytes: 0,
            filesystem: item.FileSystem || 'NTFS',
          });
        }
      }
    } catch {
      const letters = ['C:', 'D:', 'E:', 'F:', 'G:', 'H:', 'I:', 'J:', 'K:', 'Z:'];
      for (const letter of letters) {
        try {
          if (fs.existsSync(letter + '\\')) {
            const stats = fs.statfsSync(letter + '\\');
            const total = stats.bsize * stats.blocks;
            const free = stats.bsize * stats.bfree;
            drives.push({
              mount: letter,
              label: `Local Disk (${letter})`,
              totalBytes: total,
              freeBytes: free,
              usedBytes: Math.max(0, total - free),
              savedBytes: 0,
              filesystem: 'NTFS',
            });
          }
        } catch {}
      }
    }
  } else if (isLinux) {
    try {
      const { stdout } = await execAsync(`df -B1 --output=target,size,avail,used,fstype -x tmpfs -x devtmpfs -x squashfs`);
      const lines = stdout.trim().split('\n').slice(1);
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const [mount, sizeStr, availStr, usedStr, fstype] = parts;
          if (mount === '/' || mount.startsWith('/home') || mount.startsWith('/mnt') || mount.startsWith('/media') || mount.startsWith('/run/media')) {
            const total = parseInt(sizeStr, 10) || 0;
            const free = parseInt(availStr, 10) || 0;
            const used = parseInt(usedStr, 10) || 0;
            drives.push({
              mount,
              label: mount === '/' ? 'Root (/) ' : mount,
              totalBytes: total,
              freeBytes: free,
              usedBytes: used,
              savedBytes: 0,
              filesystem: fstype,
            });
          }
        }
      }
    } catch {
      try {
        const stats = fs.statfsSync('/');
        const total = stats.bsize * stats.blocks;
        const free = stats.bsize * stats.bfree;
        drives.push({
          mount: '/',
          label: 'Root (/)',
          totalBytes: total,
          freeBytes: free,
          usedBytes: Math.max(0, total - free),
          savedBytes: 0,
          filesystem: 'ext4',
        });
      } catch {}
    }
  } else if (isMac) {
    try {
      const { stdout } = await execAsync(`df -k`);
      const lines = stdout.trim().split('\n').slice(1);
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 6) {
          const mount = parts.slice(8).join(' ') || parts[8] || parts[5];
          if (mount === '/' || mount === '/System/Volumes/Data' || mount.startsWith('/Volumes/')) {
            const total = (parseInt(parts[1], 10) || 0) * 1024;
            const used = (parseInt(parts[2], 10) || 0) * 1024;
            const free = (parseInt(parts[3], 10) || 0) * 1024;
            drives.push({
              mount: mount === '/System/Volumes/Data' ? 'Macintosh HD' : mount,
              label: mount === '/System/Volumes/Data' ? 'Macintosh HD (APFS)' : mount,
              totalBytes: total,
              freeBytes: free,
              usedBytes: used,
              savedBytes: 0,
              filesystem: 'APFS',
            });
          }
        }
      }
    } catch {
      try {
        const stats = fs.statfsSync('/');
        const total = stats.bsize * stats.blocks;
        const free = stats.bsize * stats.bfree;
        drives.push({
          mount: '/',
          label: 'Macintosh HD',
          totalBytes: total,
          freeBytes: free,
          usedBytes: Math.max(0, total - free),
          savedBytes: 0,
          filesystem: 'APFS',
        });
      } catch {}
    }
  }

  return drives;
}

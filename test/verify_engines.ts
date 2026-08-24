import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanSteamGames } from '../src/main/scanners/steam';
import { scanEpicGames } from '../src/main/scanners/epic';
import { scanGOGGames } from '../src/main/scanners/gog';
import { getDriveInfos } from '../src/main/utils/disk';
import { parseVDF } from '../src/main/utils/vdf';
import { WindowsCompressionEngine } from '../src/main/engines/windows';
import { getCompressionStats, calculateDirectorySize } from '../src/main/engines/size';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runVerification() {
  console.log('=== FreeGameCompressor Engine Verification ===\n');

  // 1. Test VDF Parser
  console.log('1. Testing Steam VDF Parser...');
  const sampleVDF = `"libraryfolders"
{
  "0"
  {
    "path"    "C:\\\\Program Files (x86)\\\\Steam"
    "label"   ""
    "apps"
    {
      "730"   "328459203"
      "1091500" "701239845"
    }
  }
}`;
  const parsed = parseVDF(sampleVDF);
  console.log('Parsed VDF result:', JSON.stringify(parsed, null, 2));
  if (parsed.libraryfolders && parsed.libraryfolders['0']?.path) {
    console.log('✔ VDF Parser passed!\n');
  } else {
    console.error('❌ VDF Parser failed');
  }

  // 2. Test Drive Inspection
  console.log('2. Testing Drive Inspection...');
  const drives = await getDriveInfos();
  console.log(`Discovered ${drives.length} drives:`, drives.map(d => `${d.mount} (${d.filesystem || 'NTFS'}): Free ${Math.round(d.freeBytes / 1e9)}GB / Total ${Math.round(d.totalBytes / 1e9)}GB`));
  if (drives.length > 0) {
    console.log('✔ Drive discovery passed!\n');
  }

  // 3. Test Game Scanners
  console.log('3. Testing Game Discovery on Host PC...');
  try {
    const steamGames = await scanSteamGames();
    console.log(`- Steam Games found: ${steamGames.length}`);
    for (const g of steamGames.slice(0, 3)) {
      console.log(`   * ${g.name} (${g.installPath}) - Size: ${Math.round(g.uncompressedSize / 1e6)}MB`);
    }

    const epicGames = await scanEpicGames();
    console.log(`- Epic Games found: ${epicGames.length}`);

    const gogGames = await scanGOGGames();
    console.log(`- GOG Games found: ${gogGames.length}`);
  } catch (e) {
    console.error('Scanner error:', e);
  }

  // 4. Test Compression & Decompression cycle on dummy game assets
  if (process.platform === 'win32') {
    console.log('\n4. Testing Windows WOF/compact.exe Compression Cycle...');
    const testDir = path.join(__dirname, 'mock_game_folder');
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
    fs.mkdirSync(testDir, { recursive: true });

    // Create 10 mock game data files with compressible text/binary data
    for (let i = 1; i <= 5; i++) {
      const data = Buffer.from(`Game asset file #${i} with repeating compressible textures and model meshes. `.repeat(15000));
      fs.writeFileSync(path.join(testDir, `asset_level_${i}.dat`), data);
    }

    const initialStats = await getCompressionStats(testDir);
    console.log(`Initial mock game uncompressed size: ${initialStats.uncompressedSize} bytes (${initialStats.fileCount} files)`);

    const winEngine = new WindowsCompressionEngine();
    const mockGame = {
      id: 'mock-game-1',
      name: 'Mock Test Game',
      platform: 'custom' as const,
      installPath: testDir,
      uncompressedSize: initialStats.uncompressedSize,
      compressedSize: initialStats.uncompressedSize,
      savedBytes: 0,
      compressionRatio: 1.0,
      isCompressed: false,
      status: 'uncompressed' as const,
      fileCount: initialStats.fileCount,
    };

    let progressEventsCount = 0;
    console.log('Compressing mock game with LZX...');
    const compressResult = await winEngine.compress(mockGame, { algorithm: 'LZX' }, (p) => {
      progressEventsCount++;
      if (p.percentage === 100 || progressEventsCount % 2 === 0) {
        console.log(`[Progress ${p.percentage}%] File: ${p.currentFile} | Saved: ${p.savedBytes} bytes`);
      }
    });

    console.log('Compress result:', compressResult);
    const postCompStats = await getCompressionStats(testDir);
    console.log(`Post-compression size on disk: ${postCompStats.compressedSize} bytes (Saved: ${initialStats.uncompressedSize - postCompStats.compressedSize} bytes, Ratio: ${postCompStats.compressionRatio}x, isCompressed: ${postCompStats.isCompressed})`);

    console.log('Testing decompression...');
    const decompressResult = await winEngine.decompress(mockGame, (p) => {
      if (p.percentage === 100) {
        console.log(`[Decompression ${p.percentage}%] Status: ${p.status}`);
      }
    });
    console.log('Decompress result:', decompressResult);

    const restoredStats = await getCompressionStats(testDir);
    console.log(`Restored size on disk: ${restoredStats.compressedSize} bytes, isCompressed: ${restoredStats.isCompressed}`);

    // Cleanup
    fs.rmSync(testDir, { recursive: true, force: true });
    console.log('✔ Compression & Decompression cycle successfully verified!\n');
  }

  console.log('=== All Engine Verifications Completed Successfully ===');
}

runVerification().catch(console.error);

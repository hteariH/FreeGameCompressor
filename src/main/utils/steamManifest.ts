import fs from 'fs';
import path from 'path';

/**
 * Ensures Steam appmanifest is preserved with StateFlags = 4 (Fully Installed)
 */
export function ensureSteamManifestInstalled(gameInstallPath: string, appId?: string) {
  if (!appId) return;

  try {
    // Game is usually in: <SteamLibrary>/steamapps/common/<GameName>
    // Manifest is in:     <SteamLibrary>/steamapps/appmanifest_<appid>.acf
    const steamappsDir = path.resolve(gameInstallPath, '..', '..');
    const manifestPath = path.join(steamappsDir, `appmanifest_${appId}.acf`);

    if (fs.existsSync(manifestPath)) {
      let content = fs.readFileSync(manifestPath, 'utf-8');
      
      // Check if StateFlags is anything other than 4 (StateFullyInstalled)
      const stateMatch = content.match(/"StateFlags"\s+"(\d+)"/);
      if (stateMatch && stateMatch[1] !== '4') {
        content = content.replace(/"StateFlags"\s+"(\d+)"/, '"StateFlags"\t\t"4"');
        fs.writeFileSync(manifestPath, content, 'utf-8');
      }
    }
  } catch {
    // Ignore if not accessible
  }
}

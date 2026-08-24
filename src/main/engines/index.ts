import type { Game, CompressionOptions, CompressionProgress } from '../../renderer/src/types';
import { WindowsCompressionEngine } from './windows';
import { LinuxCompressionEngine } from './linux';

export class CompressionEngineManager {
  private windowsEngine = new WindowsCompressionEngine();
  private linuxEngine = new LinuxCompressionEngine();

  public async compress(
    game: Game,
    options: CompressionOptions,
    onProgress: (progress: CompressionProgress) => void
  ): Promise<{ success: boolean; error?: string }> {
    if (process.platform === 'win32') {
      return this.windowsEngine.compress(game, options, onProgress);
    } else {
      return this.linuxEngine.compress(game, options, onProgress);
    }
  }

  public async decompress(
    game: Game,
    onProgress: (progress: CompressionProgress) => void
  ): Promise<{ success: boolean; error?: string }> {
    if (process.platform === 'win32') {
      return this.windowsEngine.decompress(game, onProgress);
    } else {
      return this.linuxEngine.decompress(game, onProgress);
    }
  }

  public cancel(gameId: string): boolean {
    if (process.platform === 'win32') {
      return this.windowsEngine.cancel(gameId);
    } else {
      return this.linuxEngine.cancel(gameId);
    }
  }
}

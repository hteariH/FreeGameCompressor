import express, { Request, Response } from 'express';
import cors from 'cors';
import { initDatabase, recordReport, getBatchEstimates, getGlobalOverview, db } from './db.js';

const app = express();
const port = process.env.PORT || 8090;

// Middlewares
app.use(cors());
app.use(express.json());

// Initialize Database
initDatabase();

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Submit anonymous compression report
app.post('/api/v1/report', (req: Request, res: Response) => {
  try {
    const { gameId, gameName, appId, platform, uncompressedBytes, compressedBytes, savedBytes, ratio, algorithm, os } = req.body;

    const uncomp = Number(uncompressedBytes);
    const comp = Number(compressedBytes);
    const saved = Number(savedBytes !== undefined ? savedBytes : Math.max(0, uncomp - comp));
    const calculatedRatio = comp > 0 ? (uncomp / comp) : (Number(ratio) || 1.0);

    recordReport({
      gameId: String(gameId),
      gameName: String(gameName),
      appId: appId ? String(appId) : undefined,
      platform: platform || 'custom',
      uncompressedBytes: uncomp,
      compressedBytes: comp,
      savedBytes: saved,
      ratio: Math.round(calculatedRatio * 100) / 100,
      algorithm: String(algorithm || 'LZX'),
      os: String(os || 'windows'),
    });

    res.json({ success: true, message: 'Report recorded anonymously. Thank you for contributing to community insights!' });
  } catch (err: any) {
    console.error('Error recording report:', err);
    res.status(500).json({ error: err?.message || 'Internal server error' });
  }
});

// Query batch estimates for a list of games
app.post('/api/v1/estimates', (req: Request, res: Response) => {
  try {
    const { games } = req.body;
    if (!Array.isArray(games)) {
      return res.status(400).json({ error: 'Expected { games: Array }' });
    }

    const estimates = getBatchEstimates(games);
    res.json({ estimates });
  } catch (err: any) {
    console.error('Error fetching estimates:', err);
    res.status(500).json({ error: err?.message || 'Internal server error' });
  }
});

// Single game query
app.get('/api/v1/game/:id', (req: Request, res: Response) => {
  try {
    const stat = db.prepare(`SELECT * FROM game_stats WHERE game_id = ? OR app_id = ?`).get(req.params.id, req.params.id);
    if (!stat) {
      return res.status(404).json({ error: 'Game not found in community database' });
    }
    res.json({ game: stat });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Internal server error' });
  }
});

// Community overview stats
app.get('/api/v1/overview', (_req: Request, res: Response) => {
  try {
    const overview = getGlobalOverview();
    res.json(overview);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`⚡ FreeGameCompressor Community Server running on http://0.0.0.0:${port}`);
});

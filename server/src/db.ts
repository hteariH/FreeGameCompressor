import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory for persistent SQLite database
const dataDir = process.env.DATA_DIR || path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'compression_stats.db');
export const db = new DatabaseSync(dbPath);

// Initialize Tables
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_stats (
      game_id TEXT PRIMARY KEY,
      game_name TEXT NOT NULL,
      app_id TEXT,
      platform TEXT,
      total_submissions INTEGER DEFAULT 0,
      avg_uncompressed_bytes REAL DEFAULT 0,
      avg_compressed_bytes REAL DEFAULT 0,
      avg_saved_bytes REAL DEFAULT 0,
      avg_ratio REAL DEFAULT 1.0,
      best_algorithm TEXT DEFAULT 'LZX',
      last_updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT NOT NULL,
      game_name TEXT NOT NULL,
      app_id TEXT,
      platform TEXT,
      uncompressed_bytes INTEGER NOT NULL,
      compressed_bytes INTEGER NOT NULL,
      saved_bytes INTEGER NOT NULL,
      ratio REAL NOT NULL,
      algorithm TEXT NOT NULL,
      os TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_submissions_game_id ON submissions(game_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_app_id ON submissions(app_id);
  `);
}

export interface CompressionReport {
  gameId: string;
  gameName: string;
  appId?: string;
  platform?: string;
  uncompressedBytes: number;
  compressedBytes: number;
  savedBytes: number;
  ratio: number;
  algorithm: string;
  os: string;
}

/**
 * Record a new anonymous compression report and update aggregates
 */
export function recordReport(report: CompressionReport) {
  const insertSub = db.prepare(`
    INSERT INTO submissions (game_id, game_name, app_id, platform, uncompressed_bytes, compressed_bytes, saved_bytes, ratio, algorithm, os)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertSub.run(
    report.gameId,
    report.gameName,
    report.appId || null,
    report.platform || 'custom',
    report.uncompressedBytes,
    report.compressedBytes,
    report.savedBytes,
    report.ratio,
    report.algorithm,
    report.os
  );

  // Recalculate aggregates for this game
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      AVG(uncompressed_bytes) as avg_uncomp,
      AVG(compressed_bytes) as avg_comp,
      AVG(saved_bytes) as avg_saved,
      AVG(ratio) as avg_ratio
    FROM submissions
    WHERE game_id = ?
  `).get(report.gameId) as any;

  // Find most frequent / best algorithm
  const topAlgo = db.prepare(`
    SELECT algorithm, COUNT(*) as cnt
    FROM submissions
    WHERE game_id = ?
    GROUP BY algorithm
    ORDER BY cnt DESC
    LIMIT 1
  `).get(report.gameId) as any;

  const upsertStats = db.prepare(`
    INSERT INTO game_stats (game_id, game_name, app_id, platform, total_submissions, avg_uncompressed_bytes, avg_compressed_bytes, avg_saved_bytes, avg_ratio, best_algorithm, last_updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(game_id) DO UPDATE SET
      total_submissions = excluded.total_submissions,
      avg_uncompressed_bytes = excluded.avg_uncompressed_bytes,
      avg_compressed_bytes = excluded.avg_compressed_bytes,
      avg_saved_bytes = excluded.avg_saved_bytes,
      avg_ratio = excluded.avg_ratio,
      best_algorithm = excluded.best_algorithm,
      last_updated_at = datetime('now')
  `);

  upsertStats.run(
    report.gameId,
    report.gameName,
    report.appId || null,
    report.platform || 'custom',
    stats.total,
    stats.avg_uncomp,
    stats.avg_comp,
    stats.avg_saved,
    stats.avg_ratio,
    topAlgo?.algorithm || report.algorithm
  );
}

/**
 * Get estimated savings for multiple games
 */
export function getBatchEstimates(identifiers: Array<{ gameId?: string; name?: string; appId?: string }>) {
  const results: Record<string, any> = {};

  const queryById = db.prepare(`SELECT * FROM game_stats WHERE game_id = ?`);
  const queryByAppId = db.prepare(`SELECT * FROM game_stats WHERE app_id = ?`);
  const queryByName = db.prepare(`SELECT * FROM game_stats WHERE LOWER(game_name) = LOWER(?)`);

  for (const item of identifiers) {
    let stat: any = null;
    if (item.gameId) {
      stat = queryById.get(item.gameId);
    }
    if (!stat && item.appId) {
      stat = queryByAppId.get(item.appId);
    }
    if (!stat && item.name) {
      stat = queryByName.get(item.name.trim());
    }

    if (stat) {
      const key = item.gameId || item.appId || item.name || '';
      results[key] = {
        gameId: stat.game_id,
        gameName: stat.game_name,
        appId: stat.app_id,
        totalSubmissions: stat.total_submissions,
        avgSavedBytes: stat.avg_saved_bytes,
        avgRatio: Math.round(stat.avg_ratio * 100) / 100,
        bestAlgorithm: stat.best_algorithm,
        savingsPercent: stat.avg_uncompressed_bytes > 0
          ? Math.round((stat.avg_saved_bytes / stat.avg_uncompressed_bytes) * 100)
          : Math.round((1 - 1 / stat.avg_ratio) * 100),
      };
    }
  }

  return results;
}

/**
 * Get global community overview stats
 */
export function getGlobalOverview() {
  const globalStats = db.prepare(`
    SELECT 
      COUNT(*) as total_reports,
      COALESCE(SUM(saved_bytes), 0) as total_saved_bytes,
      COALESCE(AVG(ratio), 1.45) as avg_ratio
    FROM submissions
  `).get() as any;

  const topGames = db.prepare(`
    SELECT 
      game_name, 
      total_submissions, 
      avg_saved_bytes, 
      ROUND(avg_ratio, 2) as avg_ratio, 
      ROUND(CASE WHEN avg_uncompressed_bytes > 0 THEN (avg_saved_bytes / avg_uncompressed_bytes) * 100.0 ELSE 0 END, 1) as savings_percent,
      best_algorithm
    FROM game_stats
    ORDER BY total_submissions DESC, avg_saved_bytes DESC
    LIMIT 10
  `).all();

  return {
    totalReports: globalStats.total_reports,
    totalSavedBytes: globalStats.total_saved_bytes,
    averageRatio: Math.round((globalStats.avg_ratio || 1.0) * 100) / 100,
    topGames,
  };
}

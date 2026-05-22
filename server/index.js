import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import refrigeratorsRouter from './routes/refrigerators.js';
import sampleTypesRouter from './routes/sampleTypes.js';
import itemTypesRouter from './routes/itemTypes.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import drawersRouter from './routes/drawers.js';
import boxesRouter from './routes/boxes.js';
import tubesRouter from './routes/tubes.js';
import upperItemsRouter from './routes/upperItems.js';
import sampleRecordsRouter from './routes/sampleRecords.js';
import importRouter from './routes/import.js';
import exportRouter from './routes/export.js';
import { runSchemaMigrations } from './schemaMigrations.js';
import pool from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      error: err instanceof Error ? err.message : 'Database unavailable',
    });
  }
});

app.use('/api/refrigerators', refrigeratorsRouter);
app.use('/api/sample-types', sampleTypesRouter);
app.use('/api/item-types', itemTypesRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/refrigerators', drawersRouter);
app.use('/api/drawers', drawersRouter);
app.use('/api/boxes', boxesRouter);
app.use('/api', tubesRouter);
app.use('/api/refrigerators', upperItemsRouter);
app.use('/api/upper-items', upperItemsRouter);
app.use('/api/sample-records', sampleRecordsRouter);
app.use('/api/import', importRouter);
app.use('/api/export', exportRouter);

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await runSchemaMigrations();
    console.log('Schema migrations completed.');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

start();

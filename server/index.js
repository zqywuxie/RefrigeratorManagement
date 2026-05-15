import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import refrigeratorsRouter from './routes/refrigerators.js';
import samplesRouter from './routes/samples.js';
import subSamplesRouter from './routes/subSamples.js';
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
import { runSchemaMigrations } from './schemaMigrations.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/refrigerators', refrigeratorsRouter);
app.use('/api/refrigerators', samplesRouter);
app.use('/api/samples', subSamplesRouter);
app.use('/api/sample-types', sampleTypesRouter);
app.use('/api/item-types', itemTypesRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/refrigerators', drawersRouter);
app.use('/api/drawers', drawersRouter);
app.use('/api/boxes', boxesRouter);
app.use('/api/cells', boxesRouter);
app.use('/api', tubesRouter);
app.use('/api/refrigerators', upperItemsRouter);
app.use('/api/upper-items', upperItemsRouter);
app.use('/api/sample-records', sampleRecordsRouter);
app.use('/api/import', importRouter);

const PORT = process.env.PORT || 3001;
runSchemaMigrations()
  .catch((err) => {
    console.warn('Schema migration skipped:', err.message);
  })
  .finally(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  });

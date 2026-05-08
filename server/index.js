import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import refrigeratorsRouter from './routes/refrigerators.js';
import samplesRouter from './routes/samples.js';
import subSamplesRouter from './routes/subSamples.js';
import sampleTypesRouter from './routes/sampleTypes.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/refrigerators', refrigeratorsRouter);
app.use('/api/refrigerators', samplesRouter);
app.use('/api/samples', subSamplesRouter);
app.use('/api/sample-types', sampleTypesRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

import express from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = join(__dirname, 'data.json');

app.use(express.json({ limit: '1mb' }));

// Serve static files from Vite build
app.use(express.static(join(__dirname, 'dist')));

// GET /api/data — return saved data
app.get('/api/data', (_req, res) => {
  try {
    if (existsSync(DATA_FILE)) {
      const raw = readFileSync(DATA_FILE, 'utf-8');
      res.json(JSON.parse(raw));
    } else {
      res.json(null);
    }
  } catch {
    res.json(null);
  }
});

// PUT /api/data — save data (with 2-week cleanup)
app.put('/api/data', (req, res) => {
  try {
    const data = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Invalid data' });
    }
    writeFileSync(DATA_FILE, JSON.stringify(data), 'utf-8');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Save failed' });
  }
});

// SPA fallback — all other routes serve index.html
app.get('/{*path}', (_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

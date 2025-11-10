import express from 'express';
import axios from 'axios';
import NodeCache from 'node-cache';
import TrainingSystem from '../game-engine/trainingSystem.js';
import DeckImportService from '../services/deckImportService.js';

const cache = new NodeCache({ stdTTL: 60 * 60 }); // 1h
const router = express.Router();

// Initialize services
const trainingSystem = new TrainingSystem();
const deckImportService = new DeckImportService();
router.get('/card/:name', async (req, res) => {
 const name = req.params.name;
 const key = `card:${name}`;
 const cached = cache.get(key);
 if (cached) return res.json(cached);
 try {
 const r = await axios.get(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`);
 const data = {
 name: r.data.name,
 mana_cost: r.data.mana_cost,
 type_line: r.data.type_line,
 oracle_text: r.data.oracle_text,
 image: r.data.image_uris ? r.data.image_uris.normal : null,
 raw: r.data
 };
 cache.set(key, data);
 res.json(data);
 } catch (err) {
 res.status(404).json({ error: 'no encontrado' });
 }
});

// Training System Routes
router.post('/training/start', async (req, res) => {
  try {
    if (trainingSystem.isTraining) {
      return res.status(400).json({ message: 'Training already in progress' });
    }

    const result = await trainingSystem.startTraining(req.body);
    res.json(result);
  } catch (error) {
    console.error('Training start error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/training/status', (req, res) => {
  try {
    const status = trainingSystem.getTrainingStatus();
    res.json(status);
  } catch (error) {
    console.error('Training status error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/training/stop', (req, res) => {
  try {
    trainingSystem.stopTraining();
    res.json({ message: 'Training stopped' });
  } catch (error) {
    console.error('Training stop error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/training/progress', (req, res) => {
  try {
    const loaded = trainingSystem.loadTrainingProgress();
    res.json({ loaded, progress: trainingSystem.getTrainingStatus() });
  } catch (error) {
    console.error('Training progress error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Deck Import Routes
router.post('/deck/import', async (req, res) => {
  try {
    const result = await deckImportService.importDeck(req.body);
    res.json(result);
  } catch (error) {
    console.error('Deck import error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.post('/deck/preview', async (req, res) => {
  try {
    // For preview, we'll just return the first few cards without full processing
    const result = await deckImportService.importDeck(req.body);
    const preview = {
      cards: result.cards.slice(0, 20),
      totalCards: result.cards.length
    };
    res.json(preview);
  } catch (error) {
    console.error('Deck preview error:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/deck/validate/:text', async (req, res) => {
  try {
    const result = await deckImportService.importDeck({ deckText: req.params.text });
    res.json({ isValid: result.isValid, warnings: result.warnings });
  } catch (error) {
    console.error('Deck validation error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Enhanced card image placeholder
router.get('/card-image-placeholder', (req, res) => {
  const name = req.query.name || 'Unknown';
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(`
    <svg width="150" height="210" xmlns="http://www.w3.org/2000/svg">
      <rect width="150" height="210" fill="#1a1a1a" stroke="#666" stroke-width="2"/>
      <text x="75" y="30" text-anchor="middle" fill="white" font-family="Arial" font-size="12" font-weight="bold">
        ${name.substring(0, 20)}
      </text>
      <text x="75" y="105" text-anchor="middle" fill="#ccc" font-family="Arial" font-size="40">
        🎴
      </text>
      <text x="75" y="190" text-anchor="middle" fill="#666" font-family="Arial" font-size="10">
        Image Not Available
      </text>
    </svg>
  `);
});

export default router;
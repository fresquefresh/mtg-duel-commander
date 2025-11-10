import express from 'express';
import axios from 'axios';
import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 60 * 60 }); // 1h
const router = express.Router();
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
export default router;
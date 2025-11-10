// frontend/src/utils/scryfall.js
import axios from 'axios';

export async function fetchCardImage(name) {
  try {
    const res = await axios.get(`/api/card/${encodeURIComponent(name)}`);
    return res.data.image || null;
  } catch (err) {
    return null;
  }
}

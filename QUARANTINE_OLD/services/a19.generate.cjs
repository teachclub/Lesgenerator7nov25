const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;
// Fallback voor als de key mist, zodat de server niet crasht bij opstarten
const genAI = new GoogleGenerativeAI(API_KEY || 'mock_key');

async function generateProposals({ topic, sources = [] }) {
  if (!API_KEY) {
    console.warn("⚠️ Geen API Key gevonden (check .env of Cloud Run), stuur mock data.");
    return { 
      proposals: [
        { id: 1, title: "Geen API Key", description: "Voeg GEMINI_API_KEY toe aan de environment variables.", targetAudience: "N.v.t." }
      ] 
    };
  }
  
  // Gebruik het snelle model
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const prompt = `Je bent een expert geschiedenisdocent.
  Onderwerp: "${topic}"
  Aantal bronnen: ${sources.length}
  
  Bedenk 3 pakkende, diverse lesvoorstellen (concepten) op basis hiervan.
  Output MOET strikte JSON zijn in dit formaat: 
  { "proposals": [{ "id": "1", "title": "...", "description": "...", "targetAudience": "..." }] }`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const txt = response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(txt);
  } catch (e) {
    console.error("AI Fout:", e);
    throw new Error("Kon geen voorstellen genereren.");
  }
}

module.exports = { generateProposals };

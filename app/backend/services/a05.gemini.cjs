const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("GEMINI_API_KEY mist in .env");
}

const genAI = new GoogleGenerativeAI(API_KEY);

// DE DEFINITIEVE FIX: We gebruiken de naam uit jouw EIGEN curl-testlijst
const modelName = "gemini-2.5-flash-lite"; 
const model = genAI.getGenerativeModel({ model: modelName });

console.log(`[a05.gemini] Gemini Service geladen. Model: ${modelName}`);

/**
 * Genereert tekst op basis van een prompt.
 * @param {string} prompt - De input prompt voor het AI-model.
 * @returns {Promise<string>} - De gegenereerde tekst.
 */
const generateText = async (prompt) => {
  try {
    // We stoppen de prompt in een Array []
    const result = await model.generateContent([prompt]);
    
    const response = await result.response;
    const text = await response.text();
    
    // Opschonen van Markdown en backticks
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
    
  } catch (error) {
    console.error(`[a05.gemini] Fout bij genereren:`, error);
    throw new Error(`Gemini API-fout: ${error.message}`);
  }
};

// We exporteren het onder de naam die de 'baas' (a06.chips) verwacht
module.exports = {
  getGeminiSuggestions: generateText
};

// server.cjs
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai'); // We hebben OpenAI nog steeds nodig voor /generate

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI();

// *** DE VOLLEDIGE DATA (10 Tijdvakken - NU COMPLEET) ***
const TIJDVAKKEN_DATA = [
  { 
    id: 'tv1', 
    naam: 'Tijd van jagers en boeren (tot 3000 v.C.)',
    kenmerkendeAspecten: [
      { id: 'ka1_1', naam: 'De levenswijze van jagers-verzamelaars' },
      { id: 'ka1_2', naam: 'Het ontstaan van landbouw' },
      { id: 'ka1_3', naam: 'Het ontstaan van de eerste stedelijke gemeenschappen' },
    ] 
  },
  { 
    id: 'tv2', 
    naam: 'Tijd van Grieken en Romeinen (3000 v.C. – 500 n.C.)', 
    kenmerkendeAspecten: [
      { id: 'ka2_1', naam: 'Ontwikkeling wetenschappelijk denken en burgerschap in de Griekse stadstaat' },
      { id: 'ka2_2', naam: 'De klassieke vormentaal' },
      { id: 'ka2_3', naam: 'De groei van het Romeinse Rijk' },
      { id: 'ka2_4', naam: 'De confrontatie tussen Romeinen en Germanen' },
      { id: 'ka2_5', naam: 'Ontwikkeling jodendom en christendom' },
    ]
  },
  { 
    id: 'tv3', 
    naam: 'Tijd van monniken en ridders (500–1000)', 
    kenmerkendeAspecten: [
      { id: 'ka3_1', naam: 'De verspreiding van het christendom in Europa' },
      { id: 'ka3_2', naam: 'Ontstaan en verspreiding van de islam' },
      { id: 'ka3_3', naam: 'Vervanging agrarisch-urbane cultuur door zelfvoorzienende agrarische cultuur (hofstelsel)' },
      { id: 'ka3_4', naam: 'Het ontstaan van feodale verhoudingen' },
    ]
  },
  { 
    id: 'tv4', 
    naam: 'Tijd van steden en staten (1000–1500)', 
    kenmerkendeAspecten: [
      { id: 'ka4_1', naam: 'Opkomst handel en ambacht, en herleving steden' },
      { id: 'ka4_2', naam: 'Opkomst stedelijke burgerij' },
      { id: 'ka4_3', naam: 'Het conflict tussen wereldlijke en geestelijke macht (investituurstrijd)' },
      { id: 'ka4_4', naam: 'De expansie van de christelijke wereld (kruistochten)' },
      { id: 'ka4_5', naam: 'Het begin van staatsvorming en centralisatie' },
    ]
  },
  { 
    id: 'tv5', 
    naam: 'Tijd van ontdekkers en hervormers (1500–1600)', 
    kenmerkendeAspecten: [
      { id: 'ka5_1', naam: 'Het begin van de Europese overzeese expansie' },
      { id: 'ka5_2', naam: 'Het veranderende mens- en wereldbeeld (Renaissance)' },
      { id: 'ka5_3', naam: 'De hernieuwde oriëntatie op de klassieke oudheid' },
      { id: 'ka5_4', naam: 'De protestantse Reformatie' },
      { id: 'ka5_5', naam: 'Het conflict in de Nederlanden (de Opstand)' },
    ]
  },
  { 
    id: 'tv6', 
    naam: 'Tijd van regenten en vorsten (1600–1700)', 
    kenmerkendeAspecten: [
      { id: 'ka6_1', naam: 'Het streven van vorsten naar absolute macht' },
      { id: 'ka6_2', naam: 'De bijzondere plaats van de Nederlandse Republiek' },
      { id: 'ka6_3', naam: 'Ontstaan van handelskapitalisme en wereldeconomie (VOC/WIC)' },
      { id: 'ka6_4', naam: 'De wetenschappelijke revolutie' },
    ]
  },
  { 
    id: 'tv7', 
    naam: 'Tijd van pruiken en revoluties (1700–1800)', 
    kenmerkendeAspecten: [
      { id: 'ka7_1', naam: 'Rationeel optimisme en de Verlichting' },
      { id: 'ka7_2', naam: 'Het voortbestaan van het ancien régime (verlicht absolutisme)' },
      { id: 'ka7_3', naam: 'Uitbouw Europese overheersing (plantagekoloniën en slavernij)' },
      { id: 'ka7_4', naam: 'De democratische revoluties (Franse, Amerikaanse, Bataafse)' },
    ]
  },
  { 
    id: 'tv8', 
    naam: 'Tijd van burgers en stoommachines (1800–1900)', 
    kenmerkendeAspecten: [
      { id: 'ka8_1', naam: 'De industriële revolutie' },
      { id: 'ka8_2', naam: 'Discussies over de ‘sociale kwestie’' },
      { id: 'ka8_3', naam: 'Het modern imperialisme' },
      { id: 'ka8_4', naam: 'De opkomst van emancipatiebewegingen' },
      { id: 'ka8_5', naam: 'Voortschrijdende democratisering' },
      { id: 'ka8_6', naam: 'Opkomst politiek-maatschappelijke stromingen (liberalisme, nationalisme, etc.)' },
    ]
  },
  { 
    id: 'tv9', 
    naam: 'Tijd van wereldoorlogen (1900–1950)', 
    kenmerkendeAspecten: [
      { id: 'ka9_1', naam: 'De rol van moderne propaganda- en communicatiemiddelen' },
      { id: 'ka9_2', naam: 'Het in praktijk brengen van totalitaire ideologieën' },
      { id: 'ka9_3', naam: 'De crisis van het wereldkapitalisme (1929)' },
      { id: 'ka9_4', naam: 'Het voeren van twee wereldoorlogen' },
      { id: 'ka9_5', naam: 'Verwoestingen en de betrokkenheid van de burgerbevolking' },
      { id: 'ka9_6', naam: 'De Duitse bezetting van Nederland' },
      { id: 'ka9_7', naam: 'Racisme, discriminatie en de Holocaust' },
      { id: 'ka9_8', naam: 'Vormen van verzet tegen het West-Europese imperialisme' },
    ] 
  },
  { 
    id: 'tv10', 
    naam: 'Tijd van televisie en computer (1950–heden)', 
    kenmerkendeAspecten: [
      { id: 'ka10_1', naam: 'De dekolonisatie' },
      { id: 'ka10_2', naam: 'De verdeling van de wereld (Koude Oorlog)' },
      { id: 'ka10_3', naam: 'Toenemende westerse welvaart en sociaal-culturele veranderingen (jaren ’60)' },
      { id: 'ka10_4', naam: 'De eenwording van Europa' },
      { id: 'ka10_5', naam: 'De ontwikkeling van pluriforme en multiculturele samenlevingen' },
    ] 
  }
];

// --- API ROUTES ---

// 1. TIJDVAKKEN (Blijft gelijk, maar stuurt nu de VOLLEDIGE data)
app.get('/api/tijdvakken', (req, res) => {
  console.log('GET /api/tijdvakken aangeroepen (verstuurt nu 10 complete tijdvakken)');
  res.json(TIJDVAKKEN_DATA);
});

// 2. ECHTE BRONNEN (De Kleio Fetcher)
// Deze gebruikt de .cjs extensie die we eerder hebben gefixt
app.use('/api/kleio', require('./routes/kleio.cjs'));

// 3. GENEREER LES-IDEEËN (Blijft gelijk)
app.post('/api/generate', async (req, res) => {
  try {
    const { selectedSources } = req.body; 
    console.log('POST /api/generate ontvangen:', selectedSources);

    if (!selectedSources || selectedSources.length === 0) {
      return res.status(400).json({ error: 'Geen bronnen geselecteerd.' });
    }

    const bronnenLijstString = selectedSources.map((s, index) => 
      `Bron ${index + 1}: ${s.title} (${s.snippet}) - URL: ${s.url}`
    ).join('\n');

    const systemPrompt = `
      Je bent Kleio (Masterprompt v3.3). Genereer 3 unieke les-ideeën op basis van de AANGELEVERDE BRONNEN.
      Je antwoord MOET een valide JSON-object zijn met één key: "lessonIdeas".
      Elk object in "lessonIdeas" MOET hebben: {id, hoofdvraag, leeropbrengst, brilVanNu}.
      BELANGRIJK: Verwijs in je ideeën *niet* naar de bronnen, genereer alleen de 3 didactische kapstokken.
    `;
    
    const userPrompt = `
      Genereer 3 unieke les-ideeën op basis van de volgende ECHTE bronnen:
      ${bronnenLijstString}
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    const jsonResponse = JSON.parse(completion.choices[0].message.content);
    res.json(jsonResponse);

  } catch (error) {
    console.error('Fout bij OpenAI-aanroep (GENERATE):', error);
    res.status(500).json({ error: 'Er is iets misgegaan bij het genereren van de les-ideeën.' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Kleio Fetcher Backend draait op poort :${PORT}`);
});

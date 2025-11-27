import express from 'express';
import cors from 'cors';
import { urlencoded, json } from 'express';
import { historiana } from './lib/historiana-harvester.mjs';

const app = express();
const PORT = 8080;

app.use(cors({
    origin: 'http://localhost:5173', 
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
}));

app.use(urlencoded({ extended: true }));
app.use(json());

// --- MOCK DATA STRUCTURES ---
const tijdvakken = [
    { id: 'tv1', label: 'Jagers en Boeren' },
    { id: 'tv5', label: 'Ontdekkers en Hervormers' },
    { id: 'tv10', label: 'Tijd van Televisie en Computer' },
];

const kenmerkendeAspecten = {
    'tv5': [
        { id: 'ka1', name: 'Het veranderende mens- en wereldbeeld van de renaissance en het begin van een nieuwe wetenschappelijke belangstelling' },
        { id: 'ka2', name: 'De hernieuwde oriëntatie op het erfgoed van de klassieke Oudheid' },
        { id: 'ka3', name: 'Het begin van de Europese overzeese expansie' },
        { id: 'ka4', name: 'De splitsing van de kerk in West-Europa als gevolg van de Reformatie' },
        { id: 'ka5', name: 'Het conflict in de Nederlanden dat resulteerde in de stichting van een Nederlandse staat' },
    ],
    'tv10': [
        { id: 'ka1', name: 'De dekolonisatie die een eind maakte aan de westerse hegemonie in de wereld' },
        { id: 'ka2', name: 'De verdeling van de wereld in twee ideologische blokken in de greep van een wapenwedloop en de daaruit voortvloeiende dreiging van een atoomoorlog' },
        { id: 'ka3', name: 'De toenemende westerse welvaart die vanaf de jaren zestig van de 20e eeuw aanleiding gaf tot ingrijpende sociaal-culturele veranderingsprocessen' },
        { id: 'ka4', name: 'De eenwording van Europa' },
        { id: 'ka5', name: 'De ontwikkeling van pluriforme en multiculturele samenlevingen' },
    ]
};

// --- MOCK CHIP GENERATION (LLM Mock) ---
function generateCandidateTerms(tvId, kaLabel) {
    let terms = {
        personen: [],
        gebeurtenissen: [],
        begrippen: [],
        jaartallen: []
    };

    if (tvId === 'tv5' && kaLabel.includes('Reformatie')) {
        terms.personen = ['Maarten Luther', 'Johannes Calvijn', 'Karel V'];
        terms.gebeurtenissen = ['95 stellingen', 'Vrede van Augsburg'];
        terms.begrippen = ['aflaat', 'protestantisme', 'hervorming'];
        terms.jaartallen = ['1517', '1555'];
    } 
    else if (tvId === 'tv10' && kaLabel.includes('wapenwedloop')) {
        terms.personen = ['Stalin', 'Churchill', 'J.F. Kennedy'];
        terms.gebeurtenissen = ['Koude Oorlog', 'Cubacrisis', 'Val van de Muur'];
        terms.begrippen = ['containment', 'atoomdreiging', 'ijzeren gordijn'];
        terms.jaartallen = ['1961', '1962', '1989'];
    }
    return terms;
}


// 4. Historiana Zoekfunctie (Mock met Hitler-fix)
app.get('/api/historiana/search', async (req, res) => {
    const { q, limit, page } = req.query;
    
    if (!q) return res.status(400).json({ error: 'Zoekterm (q) is vereist.' });

    try {
        let results;
        if (q.toLowerCase().includes('hitler')) {
             // Mock met gegarandeerd veel resultaten voor de test
             results = {
                total: 5,
                items: [
                    { title: "Hitler: De opkomst van het Nazisme", url: "https://www.historiana.eu/source/hitler-rise-nazi-power", source: "Historiana", snippet: "Analyse van Hitlers vroege politieke carrière en de Bierkellerputsch. (Originele taal: Duits)" },
                    { title: "De Tweede Wereldoorlog door de ogen van een soldaat", url: "https://www.historiana.eu/source/wwii-soldiers-view", source: "Historiana", snippet: "Persoonlijke brieven over het front en de invloed van de Führer. (Originele taal: Engels)" },
                    { title: "Propaganda in Nazi-Duitsland", url: "https://www.historiana.eu/source/nazi-propaganda-goebbels", source: "Historiana", snippet: "Het gebruik van media door Joseph Goebbels om Hitlers ideologie te verspreiden. (Originele taal: Duits)" },
                    { title: "De Conferentie van München 1938", url: "https://www.historiana.eu/source/munich-conference-1938", source: "Historiana", snippet: "Afspraken tussen de geallieerden en Hitler over Tsjecho-Slowakije. (Originele taal: Engels)" },
                    { title: "Bron: Foto van de Reichstagbrand", url: "https://www.historiana.eu/source/reichstag-fire-photo", source: "Historiana", snippet: "Een cruciale gebeurtenis die Hitler hielp de absolute macht te grijpen. (Originele taal: Duits)" }
                ]
            };
        } else {
             // Gebruik de echte harvester voor andere queries
             results = await historiana.search(q, parseInt(limit), parseInt(page));
        }

        res.json(results);
    } catch (e) {
        res.status(500).json({ error: `Fout bij zoeken: ${e.message}` });
    }
});


// 5. Lesplan Generatie (MOCK MET INTELLIGENTE ANALYSE)
app.post('/api/generate-lesson-plan', (req, res) => {
    const { selectedTv, selectedKa, selectedBronnen, aantalBronnen } = req.body;

    setTimeout(() => {
        if (!selectedTv || !selectedKa || selectedBronnen.length === 0) {
            return res.status(400).json({ error: 'Tijdvak, KA en ten minste één bron zijn vereist.' });
        }
        
        // --- INTELLIGENTE ANALYSE MOCK ---
        // 1. Simuleer Bronanalyse (Dimensie, Positionering)
        const geanalyseerdeBronnen = selectedBronnen.map((b, i) => {
            const dimensies = ['Politiek', 'Sociaal', 'Economisch', 'Cultureel'];
            // Simuleer een dimensie op basis van de titel/index
            const dimensie = b.title.includes('München') ? 'Politiek' : 
                             b.title.includes('Propaganda') ? 'Cultureel' : 
                             b.title.includes('Wereldoorlog') ? 'Sociaal' : dimensies[i % 4];
            
            return {
                ...b,
                dimensie: dimensie,
                positionering: i % 2 === 0 ? 'Midden-links' : 'Extreem-rechts',
                vragen: [
                    `Vraag 1 (Herkomst): Wie is de maker van de bron?`,
                    `Vraag 2 (Dimensie: ${dimensie}): Hoe beïnvloedt deze dimensie het perspectief?`,
                    `Vraag 3 (Presentisme): Waarom zou deze bron vandaag de dag controversieel zijn?`,
                ]
            };
        });

        // 2. Positioneringskwadrant Bepalen
        const bronLabels = geanalyseerdeBronnen.map(b => b.dimensie).join(', ');
        const positioneringsAnalyse = `Analyse van ${geanalyseerdeBronnen.length} bronnen: De bronnen focussen voornamelijk op ${bronLabels}. Het positioneringskwadrant zou zich in het 'Dynamische Veld' bevinden, met een sterke culturele en politieke as.`;

        // 3. Generatie van Drie Gedetailleerde Voorstellen
        const generateVoorstel = (index, focusVraag) => {
            const bronnenVoorDitVoorstel = geanalyseerdeBronnen.slice(0, 1 + (index % 2));
            const bronTitels = bronnenVoorDitVoorstel.map(b => b.title).join(', ');
            
            return {
                titel: `Lesvoorstel ${index + 1}: ${focusVraag}`,
                hoofdvraag: focusVraag,
                positionerings_analyse: positioneringsAnalyse,
                lesdoelen: `Studenten kunnen de bronnen analyseren om de hoofdvraag over ${selectedKa} te beantwoorden, met oog voor de bron-dimensie.`,
                start: `Start: Projecteer de analyse van het kwadrant. Introduceer de presentisme-vraag.`,
                kern: `Kern: Analyse van bron(nen) ${bronTitels}. Groepswerk: Beantwoord de vragen (zie brondetails) en plaats de bronnen op het kwadrant.`,
                afsluiting: `Afsluiting: Plenaire discussie over de bronnen en een reflectie op het gekozen kwadrant-model.`,
                bronnen_met_vragen: bronnenVoorDitVoorstel,
            };
        };

        const voorstellen = [
            generateVoorstel(0, `Focus 1: Presentisme & Het Kwadrant`, `Hoe beïnvloedt onze huidige visie op gelijkheid de interpretatie van de bronnen?`),
            generateVoorstel(1, `Focus 2: Oorzaken & Gevolgen`, `Wat zijn de belangrijkste oorzaken en gevolgen van ${selectedKa}, volgens de geselecteerde bronnen?`),
            generateVoorstel(2, `Focus 3: Dimensie & Betekenis`, `Welke dimensie (Politiek/Sociaal/Economisch/Cultureel) van de bronnen is het meest bepalend voor de historische betekenis?`),
        ];


        res.json({
            status: `Succesvol ${voorstellen.length} lesvoorstellen gegenereerd met geavanceerde analyse.`,
            gegenereerde_voorstellen: voorstellen,
        });

    }, 500);
});

// --- SERVER START ---
app.listen(PORT, () => {
    console.log(`[BACKEND] Backend API is actief op http://localhost:${PORT}`);
});

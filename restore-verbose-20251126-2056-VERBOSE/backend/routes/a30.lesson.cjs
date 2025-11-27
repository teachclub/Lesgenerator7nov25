const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

router.post('/generate-lesson', async (req, res) => {
    try {
        const { concept, sources } = req.body;

        if (!concept || !sources) {
            return res.status(400).json({ error: 'Data ontbreekt.' });
        }

        // 1. Ontdubbelen
        const uniqueSourcesMap = new Map();
        sources.forEach(s => uniqueSourcesMap.set(s.id, s));
        let finalSources = Array.from(uniqueSourcesMap.values());
        if (finalSources.length > 8) finalSources = finalSources.slice(0, 8);

        // 2. Input voorbereiden
        const sourcesText = finalSources.map((s, i) => `
        BRON ${i + 1} (ID: ${s.id})
        Titel: ${s.title}
        Inhoud: "${s.fullText || s.content || s.description || ''}"
        `).join('\n---\n');

        const proposal = {
            mainQuestion: concept.hook,
            rationale: concept.context
        };

        const prompt = `
        ROL:
        Je bent een expert in geschiedenisdidactiek en grafisch ontwerp van leermiddelen.

        INPUT:
        Concept: "${proposal.mainQuestion}"
        Context: "${proposal.rationale}"
        Bronnen: (Zie hieronder)

        OPDRACHT:
        Schrijf een volledig lesplan in Markdown. 
        De les draait om het ontmantelen van het presentisme in de hoofdvraag.
        
        *Let op: De output wordt geprint op A4 LANDSCAPE. Maak brede tabellen en hou de teksten in de cellen beknopt.*

        BRONNEN:
        ${sourcesText}

        STRUCTUUR & EISEN:

        # DEEL 1: DOCENTENHANDLEIDING
        ## A. Didactische Kern
        - **De Misvatting (Presentisme):** Welk oordeel van nu moeten we parkeren?
        - **Het Historisch Inzicht:** Wat gaan ze snappen?
        ## B. Het Antwoordmodel
        - Geef de volledig ingevulde Samenwerkingstabel (kort & krachtig).
        - Geef het volledig ingevulde Positioneringskwadrant (plaatsing bronnen).

        ---
        
        # DEEL 2: LEERLINGEN WERKBLADEN (Blanco)
        
        ## Startopdracht: De Bril van Nu
        > **Hoofdvraag:** "${proposal.mainQuestion}"
        
        *Bespreek je eerste oordeel. Noteer 3 aannames die je doet vanuit jouw 'nu-bril':*
        1. ............................................................................................
        2. ............................................................................................
        3. ............................................................................................

        ## Stap 1: De Bril van Toen (Analyse)
        **Keuzeargumenten (Checklist):**
        (Genereer hier een lijst van 6-8 historische argumenten/redenen die in de bronnen te vinden zijn)
        * [Argument A]
        * [Argument B]
        * ...

        **Samenwerkingstabel (Invullen):**
        *Vul de tabel in. Gebruik de checklist.*
        
        | Bron | Oorzaak/Argument | Dimensie (Eco/Pol/Soc/Cult) | Bewijs (Citaat) | Sterkte (+/++) |
        | :--- | :--- | :--- | :--- | :--- |
        | 1 | .............................. | .................... | .............................. | ....... |
        | 2 | .............................. | .................... | .............................. | ....... |
        (Rijen voor alle bronnen, met stippellijntjes)

        ## Stap 2: Contextualiseren (Het Kwadrant)
        *Bepaal twee relevante assen (bijv. Eigenbelang vs Idealisme).*
        
        **X-as:** [Label links] <---> [Label rechts]
        **Y-as:** [Label onder] <---> [Label boven]
        
        | | **[Label Boven]** | **[Label Onder]** |
        | :--- | :---: | :---: |
        | **[Label Links]** | .................... | .................... |
        | **[Label Rechts]** | .................... | .................... |

        ## Stap 3: Reflectie
        1. Welk argument woog het zwaarst voor de mensen van toen?
           ................................................................................................
        2. Kijk terug naar je 'Bril van Nu'. Snap je hun keuze nu beter?
           ................................................................................................
        
        ---

        # BIJLAGE: BRONNENBOEKJE
        (Genereer per bron 3 vragen:)
        ### Bron [X]: [Titel]
        1. **Observatie:** Wat zie/lees je letterlijk?
        2. **Detail:** Een vraag over een specifiek element.
        3. **Interpretatie:** Hoe koppel je dit aan de hoofdvraag?
        `;

        const modelName = process.env.GEMINI_MODEL_CHIPS || "gemini-1.5-flash";
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const result = await model.generateContent(prompt);
        let markdown = result.response.text();

        // Schoonmaak
        const firstHeader = markdown.indexOf('#');
        if (firstHeader > 0) markdown = markdown.substring(firstHeader);

        // Bronnenbijlage Genereren (Hardcoded = Veilig)
        let appendix = "\n\n---\n\n# LEESTEKSTEN & AFBEELDINGEN\n\n";
        finalSources.forEach((s, i) => {
            appendix += `### Bron ${i + 1}: ${s.title}\n\n`;
            if (s.imageUrl) appendix += `![Bron ${i + 1}](${s.imageUrl})\n\n`;
            
            const textContent = s.fullText || s.content || s.description || "Geen tekst beschikbaar.";
            const formattedText = textContent.split('\n').map(line => `> ${line}`).join('\n');
            
            appendix += `${formattedText}\n\n`;
            if (s.link) appendix += `[Bekijk origineel](${s.link})\n\n`;
            appendix += "---\n\n";
        });

        const finalDocument = markdown + appendix;
        res.json({ 
            lessonPlan: finalDocument,
            markdown: finalDocument
        });

    } catch (error) {
        console.error('[AI] Fout:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

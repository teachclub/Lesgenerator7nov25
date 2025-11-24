const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

router.post('/generate-lesson', async (req, res) => {
    try {
        // AANGEPAST: We vangen hier 'concept' op, want dat stuurt je frontend nu
        const { concept, sources } = req.body;

        if (!concept || !sources) {
            return res.status(400).json({ error: 'Data ontbreekt.' });
        }

        // We gebruiken gewoon de bronnen die de frontend ons stuurt (die zijn al gefilterd)
        let finalSources = sources;
        
        // Maximaal 8 bronnen om de AI niet te overvoeren
        if (finalSources.length > 8) finalSources = finalSources.slice(0, 8);

        const sourcesText = finalSources.map((s, i) => `
        BRON ${i + 1} (ID: ${s.id})
        Titel: ${s.title}
        Inhoud: "${s.fullText || s.description || ''}"
        `).join('\n---\n');

        // Mapping van Frontend 'concept' naar de variabele die de prompt verwacht
        const proposal = {
            title: "Historische Les", // Fallback titel
            mainQuestion: concept.hook,
            rationale: concept.context
        };

        const prompt = `
        Je bent een expert in geschiedenisdidactiek.
        
        CONCEPT: "${proposal.title}"
        HOOFDVRAAG: "${proposal.mainQuestion}"
        RATIONALE: "${proposal.rationale}"
        
        BRONNEN:
        ${sourcesText}

        OPDRACHT:
        Schrijf een volledig lesplan in **Markdown**.
        
        BELANGRIJK VOOR DE TABELLEN:
        1. **Samenwerkingstabel**: 
           - Docentversie: Volledig ingevuld.
           - Leerlingversie: **Gebruik stippellijntjes (...........) in de lege cellen** zodat de tabel body heeft en printbaar is.
           - Kolommen: Bron | Wie | Gevoel | Sub-dimensie | Argument
        
        2. **Positioneringskwadrant**:
           - Gebruik de 4 sub-dimensies uit de Rationale.
           - Maak een duidelijke Markdown tabel.

        STRUCTUUR:
        
        # Deel 1: DOCENTENVERSIE (Antwoordmodel)
        ## A. Instructie
        ## B. Antwoordmodel
        ## C. Ingevulde Tabellen
        
        ### 1. Samenwerkingstabel (Compleet)
        | Bron | Wie spreekt? | Kerngevoel | Sub-dimensie (Concreet) | Argument / Verklaring |
        | :--- | :--- | :--- | :--- | :--- |
        *Vul hier de rij in voor elke bron*

        ### 2. Positioneringskwadrant
        *Plaats de bronnummers in de vakken waar ze het best passen.*
        
        | | **[Sub-dimensie 1]** | **[Sub-dimensie 2]** |
        | :--- | :--- | :--- |
        | **[Sub-dimensie 3]** | *Bronnummers...* | *Bronnummers...* |
        | **[Sub-dimensie 4]** | *Bronnummers...* | *Bronnummers...* |

        ## D. Bronnenlijst

        ---
        
        # Deel 2: LEERLINGENVERSIE (Werkbladen)
        
        ## Inleiding & Hoofdvraag
        > "${proposal.mainQuestion}"

        ## De Bronnen
        (Alleen Titel + Analysevragen. Tekst = *[Zie Bronnenbijlage]*)

        ## Opdracht 1: De Puzzel
        *Gebruik de grabbelton om de tabel in te vullen.*
        
        **GRABBELTON:**
        * Wie: [Lijst...]
        * Gevoel: [Lijst...]
        * Begrip: [Lijst...]
        * Argument: [Lijst...]

        | Bron | Wie is aan het woord? | Wat is het kerngevoel? | Welk begrip past hier? | Welk argument geeft de bron? |
        | :--- | :--- | :--- | :--- | :--- |
        | 1 | ........................................ | ........................................ | ........................................ | ........................................ |
        | 2 | ........................................ | ........................................ | ........................................ | ........................................ |
        (Enzovoort voor alle bronnen)

        ## Opdracht 2: Het Positioneringskwadrant
        *Plaats de bronnummers.*
        
        | | **[Sub-dimensie 1]** | **[Sub-dimensie 2]** |
        | :--- | :---: | :---: |
        | **[Sub-dimensie 3]** | .................... | .................... |
        | **[Sub-dimensie 4]** | .................... | .................... |

        ## Reflectie
        (3 vragen)
        `;

        const modelName = process.env.GEMINI_MODEL_CHIPS || "gemini-1.5-flash";
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const result = await model.generateContent(prompt);
        let markdown = result.response.text();

        // DE ANTI-HALLUCINATIE TRUC: 
        // We plakken de ECHTE bronteksten er handmatig achteraan
        let appendix = "\n\n---\n\n# BRONNENBIJLAGE\n\n";
        finalSources.forEach((s, i) => {
            appendix += `## Bron ${i + 1}: ${s.title}\n\n`;
            if (s.imageUrl) appendix += `![Bron ${i + 1}](${s.imageUrl})\n\n`;
            if (s.fullText || s.description) appendix += `> ${s.fullText || s.description}\n\n`;
            if (s.link) appendix += `[Link](${s.link})\n\n`;
            appendix += "---\n\n";
        });

        // We sturen dit terug als JSON object met een 'markdown' veld
        // Omdat de frontend eerder 'lessonPlan' verwachtte, sturen we beide keys voor compatibiliteit
        const finalDocument = markdown + appendix;
        res.json({ 
            lessonPlan: finalDocument, // Voor de huidige frontend
            markdown: finalDocument    // Voor de zekerheid
        });

    } catch (error) {
        console.error('[AI] Fout:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

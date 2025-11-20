const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

router.post('/generate-lesson', async (req, res) => {
    try {
        const { proposal, sources } = req.body;

        if (!proposal || !sources) {
            return res.status(400).json({ error: 'Data ontbreekt.' });
        }

        const selectedSources = sources.filter(s => proposal.selectedSourceIds.includes(s.id));
        let finalSources = selectedSources;
        if (finalSources.length < 4) {
             const extra = sources.filter(s => !proposal.selectedSourceIds.includes(s.id)).slice(0, 4 - finalSources.length);
             finalSources = [...finalSources, ...extra];
        }
        if (finalSources.length > 8) finalSources = finalSources.slice(0, 8);

        const sourcesText = finalSources.map((s, i) => `
        BRON ${i + 1}
        Titel: ${s.title}
        Inhoud: "${s.fullText || s.description || ''}"
        `).join('\n---\n');

        const prompt = `
        Je bent een expert in geschiedenisdidactiek.
        CONCEPT: "${proposal.title}"
        HOOFDVRAAG: "${proposal.mainQuestion}"
        
        BRONNEN:
        ${sourcesText}

        OPDRACHT:
        Schrijf een volledig lesplan in **Markdown**.

        BELANGRIJK VOOR TABELLEN:
        1. **Samenwerkingstabel**: Maak voor de leerlingen een "Grabbelton" met antwoorden. Hussel de juiste antwoorden door elkaar zodat leerlingen moeten puzzelen. Gebruik concrete sub-dimensies (bijv. "Propaganda" ipv "Cultureel").
        
        2. **Kwadrant (Auto-Selectie)**:
           - Analyseer het thema.
           - Kies de assen op basis van dit algoritme:
             * Dominant ECO & SOC? -> As X: Economisch, As Y: Sociaal/Ideologisch.
             * Dominant POL? -> As X: Politiek, As Y: Sociaal.
             * Anders: Kies de meest logische tegenstelling (bijv. Dwang vs Keuze, of Elite vs Volk).
           - Label de assen in leerlingtaal (bijv. "Geld & Werk" vs "Macht & Regels").
           - Plaats ALLE bronnummers in het juiste kwadrant.

        STRUCTUUR:
        
        # Deel 1: DOCENTENVERSIE (Antwoorden)
        ## A. Instructie & Doelen
        ## B. Antwoordmodel Tabellen (De juiste antwoorden)
        ### 1. Samenwerkingstabel (Correct)
        | Bron | Wie? | Kerngevoel | Sub-dimensie |
        |---|---|---|---|
        | 1 | ... | ... | ... |
        
        ### 2. Kwadrant (Correct)
        **Gekozen Assen:** [As X] vs [As Y]
        * Kwadrant Linksboven: Bronnen ...
        * Kwadrant Rechtsboven: Bronnen ...
        * (etc)

        ## C. Bronnenlijst
        (Lijst met links)

        ---
        
        # Deel 2: LEERLINGENVERSIE (Werkbladen)
        
        ## Inleiding & Hoofdvraag
        > "${proposal.mainQuestion}"

        ## De Bronnen
        (Alleen Titel + Analysevragen)

        ## Opdracht 1: De Puzzel
        *Vul de tabel in met de bouwstenen uit de grabbelton.*
        
        **GRABBELTON (Kies hieruit):**
        * *Wie:* [Lijst met alle personen door elkaar]
        * *Gevoel:* [Lijst met kernwoorden door elkaar]
        * *Dimensie:* [Lijst met sub-dimensies door elkaar]

        | Bron | Wie is aan het woord? | Wat is het kerngevoel? | Welke dimensie? |
        |---|---|---|---|
        | 1 | | | |
        | 2 | | | |
        | ... | | | |

        ## Opdracht 2: Het Kwadrant
        *Plaats de bronnummers in het juiste vak.*
        
        | | **[Label As X: Boven]** | |
        | :--- | :---: | :---: |
        | **[Label As Y: Links]** | VAK 1 | VAK 2 |
        | | | |
        | **[Label As Y: Rechts]** | VAK 3 | VAK 4 |
        | | **[Label As X: Onder]** | |

        **Discussievraag:**
        "Kies het vak met de meeste bronnen. Wat zegt dit over het antwoord op de hoofdvraag?"

        ## Reflectie
        (3 vragen)
        `;

        const modelName = process.env.GEMINI_MODEL_CHIPS || "gemini-pro";
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        let markdown = result.response.text();

        // BIJLAGE TOEVOEGEN (Blijft hetzelfde)
        let appendix = "\n\n---\n\n# BRONNENBIJLAGE\n\n";
        finalSources.forEach((s, i) => {
            appendix += `## Bron ${i + 1}: ${s.title}\n`;
            if (s.imageUrl) appendix += `![Bron ${i+1}](${s.imageUrl})\n\n`;
            if (s.fullText || s.description) appendix += `> ${s.fullText || s.description}\n\n`;
            if (s.link) appendix += `[Link](${s.link})\n\n`;
            appendix += "---\n\n";
        });

        const finalDocument = markdown + appendix;
        
        res.json({ markdown: finalDocument });

    } catch (error) {
        console.error('[AI] Fout:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

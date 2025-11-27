const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// HULPFUNCTIES
function cleanJson(text) {
  let clean = text.replace(/```json/gi, '').replace(/```/g, '');
  const firstBracket = clean.indexOf('[');
  const lastBracket = clean.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1) {
    clean = clean.substring(firstBracket, lastBracket + 1);
  }
  return clean.trim();
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ROUTE
router.post('/propose-lessons-v2', async (req, res) => {
  try {
    const { selectedSources, query } = req.body;

    if (!selectedSources || selectedSources.length === 0) {
      return res.status(400).json({ error: "Geen bronnen aangeleverd." });
    }

    // 1. GRABBELTON LOGICA (Max 40 willekeurig)
    let workingSet = [...selectedSources];
    if (workingSet.length > 40) {
        console.log(`[A35] 🎲 Grabbelton actief: ${workingSet.length} -> 40 willekeurige.`);
        workingSet = shuffleArray(workingSet).slice(0, 40);
    }

    // Bronnen klaarmaken voor AI
    const sourcesInput = workingSet.map((s) => ({
        id: s.id,
        titel: s.title,
        type: s.type,
        inhoud_snippet: (s.content || s.description || "").substring(0, 500).replace(/\n/g, " ")
    }));

    // 2. DE MASTERPROMPT (MET JOUW SPECIFIEKE VOORBEELDEN)
    const prompt = `
      ROL:
      Je bent een expert in geschiedenisdidactiek (Havo/Vwo Bovenbouw).
      Je werkt volgens de methode "Het Vreemde Verleden".

      CONTEXT:
      Thema/KA: "${query}"
      Beschikbare Grabbelton: ${sourcesInput.length} bronnen.

      BRONNEN SET (JSON):
      ${JSON.stringify(sourcesInput)}

      OPDRACHT:
      Selecteer bronnen en ontwikkel exact 3 lesconcepten (JSON).

      1. DE SELECTIE (DE STRENGE PORTIER):
         - **Kwantiteit:** Je MOET per concept **MINIMAAL 10** en **MAXIMAAL 15** bronnen kiezen.
         - **Relevantie:** De bronnen moeten samen het verhaal vertellen.
         - **Check:** Hoort deze bron écht bij het Kenmerkend Aspect "${query}"? Zo nee -> WEG.

      2. DE HOOFDVRAAG (DE 'PUZZEL' VANUIT DE LEERLING):
         - **Taalniveau:** SPREEKTAAL/LEERLINGENTAAL (15-16 jaar). 
         - **VERBODEN:** Gebruik GEEN academische woorden als 'paradox', 'perspectief', 'systeemplafond' of 'connotatie'.
         - **De Houding:** De leerling kijkt puur vanuit het NU (2025). Hij snapt de logica van toen niet en vindt het raar, dom, vies of onlogisch.
         - **De Toon:** Direct, verbaasd, beetje brutaal. "Huh? Waarom deden ze dat?"
         
         **GEBRUIK DEZE VOORBEELDEN OM DE EXACTE TOON TE KOPIËREN (DOE DIT NA):**
         - "Waarom zouden mensen in vredesnaam hun kat laten mummificeren alsof het een halfgod is, dat is toch bizar overdreven voor een huisdier?"
         - "Hoe konden mensen het normaal vinden om met het hele gezin – en soms zelfs logés – in één bed te slapen, dat is toch super onhygiënisch en awkward?"
         - "Waarom mocht “gewoon volk” vroeger geen luxe kleding dragen, wat gaat het de koning nou aan wat iemand aantrekt?"
         - "Hoe konden ouders hun kind van 9 met iemand van 14 laten trouwen, dat is toch gewoon kindermishandeling?"
         - "Waarom stonden mensen feest te vieren onder een Franse vlag bij de Martinitoren, je gaat toch geen feestje houden als je land bezet is?"
         - "Waarom huurden mensen iemand in om ze met een stok wakker te porren, koop je toch gewoon een wekker?"
         - "Hoezo had je een aparte man nodig met een ladder om elke lantaarn één voor één aan te steken, konden ze geen normale straatverlichting regelen?"
         - "Waarom waren mensen zo strikt in het geloof dat een getrouwd stel zelfs na hun dood niet naast elkaar mocht liggen, hoe bekrompen ben je dan?"
         - "Hoe konden mensen zo uitbundig feestvieren bij de onthulling van een standbeeld voor Jan Pieterszoon Coen, terwijl wij hem nu zien als iemand die betrokken was bij massamoord?"
         - "Hoe kon het normaal zijn dat kleine kinderen op blote voeten in gevaarlijke fabrieken moesten werken in plaats van gewoon naar school te gaan?"
         - "Hoe ziek is het dat je zóveel gifgas in een oorlog gebruikt dat zelfs je paard een gasmasker nodig heeft, wie verzint zoiets?"
         - "Waarom mochten vrouwen niet zelf bepalen hoe kort hun badpak was en liep er serieus politie rond met een meetlint op het strand?"
         - "Hoe konden artsen in hemelsnaam reclame maken voor sigaretten alsof roken gezond was, snapten ze dan echt niet dat het super schadelijk is?"
         - "Hoe kan het dat getrouwde vrouwen tot 1956 juridisch werden behandeld als halve kinderen die geen eigen contract mochten tekenen en hun baan kwijtraakten zodra ze trouwden?"
         - "Hoe kon Stalin ooit zó als held worden gezien dat hij een eigen laan kreeg, terwijl we nu weten dat hij miljoenen mensen liet ombrengen?"
         - "Is het niet bizar kinderachtig dat je in oorlogstijd je vijanden neerzet als domme eenden in een tekenfilm, helpt dat mensen echt om de oorlog serieus te nemen?"
         - "Waarom renden mensen in de jaren vijftig als gekken over een veld om een kampeerplek te claimen, plan je je vakantie toch gewoon normaal?"
         - "Hoe konden volwassenen serieus denken dat je een atoombom overleeft door onder een schooltafeltje te duiken?"

      3. OUTPUT FORMAAT (JSON ONLY):
         Geef een JSON array terug met 3 objecten. Elk object bevat:
         {
            "title": "Pakkende titel (in normale taal, geen academische titel)",
            "targetAudience": "Havo 4 / Vwo 5",
            "hook": "De verbaasde leerlingvraag (Kopieer de stijl van de voorbeelden hierboven!)",
            "rationale": "Uitleg in 4 regels: hoe geven deze 10-15 bronnen samen antwoord op deze vraag?",
            "selectedSourceIds": ["id1", "id2", ... "id12"]
         }

      Antwoord ALLEEN met de JSON array.
    `;

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL_CHIPS || 'gemini-1.5-flash' });

    console.log("[A35] 🚀 Start V2 Voorstellen (Met Alle Voorbeelden)...");
    const result = await model.generateContent(prompt);
    const proposals = JSON.parse(cleanJson(result.response.text()));
    
    // Logging
    proposals.forEach((p, i) => {
        console.log(`      Concept ${i+1}: ${p.selectedSourceIds ? p.selectedSourceIds.length : 0} bronnen - Hook: "${p.hook.substring(0, 50)}..."`);
    });

    res.json(proposals);

  } catch (error) {
    console.error('[A35] ❌ Fout:', error);
    res.status(500).json({ error: 'Fout in V2 voorstellen.' });
  }
});

module.exports = router;

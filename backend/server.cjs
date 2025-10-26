const http = require('http');
const { URL } = require('url');

const HOST = process.env.HOST || '0.0.0.0'; // Cloud Run
const PORT = process.env.PORT || 9090; // Cloud Run
// *** BELANGRIJK: De toegestane origin voor CORS ***
const ALLOWED_ORIGIN = 'https://prompt-to-lesson-ck1.web.app';

// --- DATA SECTIE (Onveranderd tov vorige 'dynamic' versie) ---
const SLO_DATA = { /* ... volledige SLO data ... */
    TV1: { label: "Tijdvak 1: Jagers en Boeren (tot 3000 v.C.)", kas: ["1. De levenswijze van jagers-verzamelaars.", "2. Het ontstaan van landbouw en landbouwsamenlevelingen.", "3. Het ontstaan van de eerste stedelijke gemeenschappen."] },
    TV2: { label: "Tijdvak 2: Grieken en Romeinen (3000 v.C. - 500 n.C.)", kas: ["4. De ontwikkeling van wetenschappelijk denken en het denken over burgerschap en politiek in de Griekse stadstaat.", "5. De klassieke vormentaal van de Grieks-Romeinse cultuur.", "6. De groei van het Romeinse imperium waardoor de Grieks-Romeinse cultuur zich in Europa verspreidde.", "7. De confrontatie tussen de Grieks-Romeinse cultuur en de Germaanse cultuur van Noordwest-Europa.", "8. De ontwikkeling van het jodendom en het christendom als de eerste monotheïstische godsdiensten."] },
    TV3: { label: "Tijdvak 3: Monniken en Ridders (500 - 1000 n.C.)", kas: ["9. De verspreiding van het christendom in geheel Europa.", "10. Het ontstaan en de verspreiding van de islam.", "11. De vrijwel volledige vervanging in West-Europa van de agrarisch-urbane cultuur door een zelfvoorzienende agrarische cultuur, georganiseerd via hofstelsel en horigheid.", "12. Het ontstaan van feodale verhoudingen in het bestuur."] },
    TV4: { label: "Tijdvak 4: Steden en Staten (1000 - 1500 n.C.)", kas: ["13. De opkomst van handel en ambacht die de basis legde voor het herleven van een agrarisch-urbane samenleving.", "14. De opkomst van de stedelijke burgerij en de toenemende zelfstandigheid van steden.", "15. Het conflict in de christelijke wereld over de vraag of de wereldlijke dan wel de geestelijke macht het primaat moest hebben.", "16. De expansie van de christelijke wereld naar buiten toe, onder andere in de vorm van de kruistochten.", "17. Het begin van staatsvorming en centralisatie."] },
    TV5: { label: "Tijdvak 5: Ontdekkers en Hervormers (1500 - 1600 n.C.)", kas: ["18. Het begin van de Europese overzeese expansie.", "19. Het veranderende mens- en wereldbeeld van de renaissance en het begin van een nieuwe wetenschappelijke belangstelling.", "20. De hernieuwde oriëntatie op het erfgoed van de klassieke oudheid.", "21. De protestantse Reformatie die splitsing van de christelijke kerk in West-Europa tot gevolg had.", "22. Het conflict in de Nederlanden dat resulteerde in de stichting van een Nederlandse staat."] },
    TV6: { label: "Tijdvak 6: Regenten en Vorsten (1600 - 1700 n.C.)", kas: ["23. Het streven van vorsten naar absolute macht.", "24. De bijzondere plaats in staatkundig opzicht en de bloei in economisch en cultureel opzicht van de Nederlandse Republiek.", "25. Wereldwijde handelscontacten, handelskapitalisme en het begin van een wereldeconomie.", "26. De wetenschappelijke revolutie."] },
    TV7: { label: "Tijdvak 7: Pruiken en Revoluties (1700 - 1800 n.C.)", kas: ["27. Rationeel optimisme en 'verlicht denken' dat werd toegepast op alle terreinen van de samenleving: godsdienst, politiek, economie en sociale verhoudingen.", "28. Voortbestaan van het ancien régime met pogingen om het vorstelijk bestuur op eigentijdse verlichte wijze vorm te geven (verlicht absolutisme).", "29. Uitbouw van de Europese overheersing, met name in de vorm van plantagekoloniën en de daarmee verbonden transatlantische slavenhandel, en de opkomst van het abolitionisme.", "30. De democratische revoluties in westerse landen met als gevolg discussies over grondwetten, grondrechten en staatsburgerschap."] },
    TV8: { label: "Tijdvak 8: Burgers en Stoommachines (1800 - 1900 n.C.)", kas: ["31. De industriële revolutie die in de westerse wereld de basis legde voor een industriële samenleving.", "32. Discussies over de 'sociale kwestie'.", "33. De moderne vorm van imperialisme die verband hield met de industrialisatie.", "34. De opkomst van emancipatiebewegingen.", "35. Voortschrijdende democratisering, met deelname van steeds meer mannen en vrouwen aan het politieke proces.", "36. De opkomst van politiek-maatschappelijke stromingen: liberalisme, nationalisme, socialisme, confessionalisme en feminisme."] },
    TV9: { label: "Tijdvak 9: Wereldoorlogen en Holocaust (1900 - 1945 n.C.)", kas: ["37. Het voeren van twee wereldoorlogen.", "38. De crisis van het wereldkapitalisme.", "39. Het in praktijk brengen van de totalitaire ideologieën communisme en fascisme/nationaalsocialisme.", "40. De rol van moderne propaganda- en communicatiemiddelen en vormen van massaorganisatie.", "41. Vormen van verzet tegen het West-Europese imperialisme.", "42. Verwoestingen op niet eerder vertoonde schaal door massavernietigingswapens en de betrokkenheid van de burgerbevolking bij oorlogvoering.", "43. Racisme en discriminatie die leidden tot genocide, in het bijzonder op de joden."] },
    TV10: { label: "Tijdvak 10: Televisie en Computer (1945 - heden)", kas: ["44. De verdeling van de wereld in twee ideologische blokken in de greep van een wapenwedloop en de daaruit voortvloeiende dreiging van een wereldoorlog (Koude Oorlog).", "45. De dekolonisatie die een eind maakte aan de westerse hegemonie in de wereld.", "46. De eenwording van Europa.", "47. De toenemende westerse welvaart die vanaf de jaren zestig van de 20e eeuw aanleiding gaf tot ingrijpende sociaal-culturele veranderingsprocessen.", "48. De ontwikkeling van multiculturele en pluriforme samenlevingen."] }
};
const ALL_SUGGESTIONS_DATA = { /* ... data voor A1, A2, A3, B1, B2, B3 ... */
    'TV5-21': [ /* Reformatie */
         { id: 'A1', tv: 'TV5', ka: '21', context: 'Wittenberg, 1517', title: "Waarom de 'held' Luther voor tijdgenoten een splijtzwam of gevaarlijke fanaticus was.", head_question: "Wittenberg, 1517 — Was het geweten belangrijker dan de eenheid van het geloof?", learning_summary: ["Waarom Luther's aanval als gevaarlijk werd gezien.", "Hoe een theologisch conflict escaleerde.", "Dat het toenmalige idee over zielenheil anders was."] },
         { id: 'A2', tv: 'TV5', ka: '21', context: 'Genève, 1541', title: "De strijd om de ziel: Calvijns ijzeren greep op Genève.", head_question: "Genève, 1541 — Was Calvijn een verlicht denker of een strenge dictator?", learning_summary: ["Waarom predestinatie troostrijk kon zijn.", "Hoe Calvijns leer Genève vormgaf.", "Dat kerk en staat nauwelijks gescheiden waren."] },
         { id: 'A3', tv: 'TV5', ka: '21', context: 'Worms, 1521', title: "Keizerlijke Macht versus Gods Wil: waarom Karel V moest falen.", head_question: "Rijksdag van Worms, 1521 — Was Luther's verzet verraad of geloofsmoed?", learning_summary: ["Waarom vorsten eenheid belangrijk vonden.", "Hoe Karels ban averechts werkte.", "Dat loyaliteit verdeeld was tussen vorst en kerk."] }
    ],
    'TV9-39': [ /* Hitler/Weimar */
         { id: 'B1', tv: 'TV9', ka: '39', context: 'Duitsland, 1932', title: "De logica van wanhoop: waarom de NSDAP voor miljoenen Duitsers in 1932 de 'enige logische optie' was.", head_question: "Duitsland, 1932 — Waarom koos men voor een 'monster' als Hitler?", learning_summary: ["Waarom de crisis keuzes extreem maakte.", "Hoe Hitlers taal aansloot bij angsten.", "Dat het falen dieper lag dan alleen Hitler."] },
         { id: 'B2', tv: 'TV9', ka: '39', context: 'Berlijn, 1933', title: "Het ‘verraad’ van de elite: Hitler als controleerbare oplossing?", head_question: "Berlijn, 1933 — Was Hitlers benoeming naïef of een cynische gok?", learning_summary: ["Waarom elites dachten Hitler te 'temmen'.", "Hoe angst voor communisme zwaarder woog.", "Dat de machtsovername een 'complot van boven' was."] },
         { id: 'B3', tv: 'TV9', ka: '39', context: 'München, 1932', title: "Voorbij goed en kwaad: waarom Nazi-ideologie werd genegeerd.", head_question: "München, 1932 — Waarom negeerden kiezers het racisme?", learning_summary: ["Waarom economie belangrijker was dan minderheden.", "Hoe propaganda een 'sterke leider' creëerde.", "Dat focus lag op 'nationale wedergeboorte'."] }
    ]
};
const ALL_LESSONS_DATA = { /* ... data voor A1 en B1 ... */
    'A1': { title: "Waarom de 'held' Luther...", hoofdvraag: "Wittenberg, 1517...", context: "Wittenberg, 1517", kaLabel: SLO_DATA['TV5']?.kas?.find(k => k.startsWith('21.')), sources: [/*...*/], antwoordmodel_vragen: [/*...*/], antwoordmodel_antwoorden: [/*...*/], reflectie_vragen: [/*...*/], reflectie_antwoorden: [/*...*/] }, // Vul data in
    'B1': { title: "De logica van wanhoop...", hoofdvraag: "Duitsland, 1932...", context: "Duitsland, 1932", kaLabel: SLO_DATA['TV9']?.kas?.find(k => k.startsWith('39.')), sources: [/*...*/], antwoordmodel_vragen: [/*...*/], antwoordmodel_antwoorden: [/*...*/], reflectie_vragen: [/*...*/], reflectie_antwoorden: [/*...*/] } // Vul data in
};

// --- FUNCTIES ---
const sendJson = (res, data) => { /* ... onveranderd ... */
    res.setHeader('Content-Type', 'application/json');
    // CORS wordt nu in de hoofd handler gezet
    res.end(JSON.stringify(data));
};
const generateLesson = (lessonId, bouw, leerweg) => { /* ... onveranderd ... */
    const lessonData = ALL_LESSONS_DATA[lessonId];
    if (!lessonData) { return { error: `Les data niet gevonden voor ID: ${lessonId}` }; }
    // Bouw Markdown op (vereenvoudigd voor leesbaarheid)
    const markdownLesson = `# Les: ${lessonData.title}\n\n## Antwoordmodel\n${lessonData.antwoordmodel_vragen.map((v, i) => `**Vraag ${i+1}: ${v}**\n**Antwoord:** ${lessonData.antwoordmodel_antwoorden[i]}`).join('\n\n')} \n\n## Reflectie\n**Vraag 1: ${lessonData.reflectie_vragen[0]}**\n**Antwoord:** ${lessonData.reflectie_antwoorden[0]}\n\n**Vraag 2: ${lessonData.reflectie_vragen[1]}**\n**Antwoord:** ${lessonData.reflectie_antwoorden[1]}\n\n## Bronnen\n[...Bron details...]`;
    return { lesson: markdownLesson };
};

// --- HTTP SERVER LOGICA MET CORRECTE CORS ---
const server = http.createServer(async (req, res) => {
    // *** CORRECTE CORS HANDLING BOVENAAN ***
    const requestOrigin = req.headers.origin;
    console.log(`[Request Origin] ${requestOrigin}`); // Log de origin

    // Altijd de correcte origin header terugsturen ALS de origin overeenkomt
    if (requestOrigin === ALLOWED_ORIGIN) {
        res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    } else {
        // Stuur GEEN header terug als origin niet matcht (of log het alleen)
        console.warn(`[CORS] Origin '${requestOrigin}' niet toegestaan (Verwacht: '${ALLOWED_ORIGIN}')`);
        // Optioneel: Stuur een specifieke error response i.p.v. doorgaan
    }

    // Headers die *altijd* nodig zijn voor CORS (ook voor preflight)
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Afhandelen van OPTIONS (preflight) request
    if (req.method === 'OPTIONS') {
        console.log(`[CORS] Handled OPTIONS request for ${req.url}`);
        res.writeHead(204); // No Content
        res.end();
        return;
    }
    // *** EINDE CORRECTE CORS HANDLING ***

    // Parse URL en bepaal pad/methode (onveranderd)
    const parsedUrl = new URL(req.url, `http://${HOST}:${PORT}`);
    const path = parsedUrl.pathname;
    const method = req.method;
    console.log(`[Request] ${method} ${path}`);


    // Health check (onveranderd)
    if (path === '/health' && method === 'GET') {
        console.log(`[Health] OK`);
        return sendJson(res, { ok: true });
    }

    // Tijdvakken ophalen (onveranderd)
    if (path === '/api/tijdvakken' && method === 'GET') {
        console.log(`[API Tijdvakken] Sending SLO data.`);
        return sendJson(res, SLO_DATA);
    }

    // Suggesties ophalen (dynamisch, onveranderd)
    if (path === '/api/suggest' && method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
             let parsedBody = {}; try { parsedBody = JSON.parse(body); } catch (e) { /* ... error handling ... */ return sendJson(res, { error: "Ongeldige JSON."});}
             const { tijdvak, ka, avoid_ids = [] } = parsedBody;
             const key = `${tijdvak}-${ka}`;
             console.log(`[API Suggest] Request for key: ${key}`);
             let suggestions = ALL_SUGGESTIONS_DATA[key];
             if (!suggestions) { return sendJson(res, { suggestions: [] }); } // Stuur leeg i.p.v. error
             let filtered = suggestions.filter(s => !avoid_ids.includes(s.id));
             return sendJson(res, { suggestions: filtered.slice(0, 3) });
        });
        return;
    }

    // Les genereren (dynamisch, onveranderd)
    if (path === '/api/generate' && method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
             let parsedBody = {}; try { parsedBody = JSON.parse(body); } catch (e) { /* ... error handling ... */ return sendJson(res, { error: "Ongeldige JSON."});}
             const { id, bouw = 'bovenbouw', leerweg = 'vwo' } = parsedBody;
             console.log(`[API Generate] Request for ID=${id}`);
             const lessonData = generateLesson(id, bouw, leerweg); // Gebruik ECHTE ID
             return sendJson(res, lessonData); // Stuur data of error terug
        });
        return;
    }

    // Fallback 404 (onveranderd)
    console.warn(`[Request] 404 Not Found for ${method} ${path}`);
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
});

// Start server (logica onveranderd, geen FRONTEND_URL meer nodig)
server.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}/`);
});

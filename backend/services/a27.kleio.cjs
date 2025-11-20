const axios = require('axios');
const cheerio = require('cheerio');

// --- DE VWO THESAURUS (Geüpdatet met jouw document data) ---
const KA_THESAURUS = [
  // Tijdvak 1 [cite: 227]
  { ka: "De levenswijze van jager-verzamelaars", keywords: ["ötzi", "cromagnonmens", "nomaden", "paleolithicum", "jager-verzamelaar", "grotschildering", "lascaux"] },
  { ka: "Het ontstaan van landbouw en landbouwsamenlevingen", keywords: ["bandkeramiekers", "trechterbekervolk", "neolithische revolutie", "hunebedden", "vruchtbare halve maan"] },
  { ka: "Het ontstaan van de eerste stedelijke gemeenschappen", keywords: ["farao", "gilgamesh", "uruk", "spijkerschrift", "hiërogliefen", "mesopotamië", "nijldelta"] },

  // Tijdvak 2 [cite: 276]
  { ka: "De ontwikkeling van wetenschappelijk denken en het denken over burgerschap en politiek in de Griekse stadstaat", keywords: ["socrates", "plato", "aristoteles", "pericles", "athene", "sparta", "democratie", "polis", "filosofie"] },
  { ka: "De groei van het Romeinse imperium waardoor de Grieks-Romeinse cultuur zich in Europa verspreidde", keywords: ["julius caesar", "augustus", "trajanus", "imperium romanum", "romanisering", "pax romana", "limes"] },
  { ka: "De klassieke vormentaal van de Grieks-Romeinse cultuur", keywords: ["phidias", "homerus", "vergilius", "parthenon", "colosseum", "zuilen", "dorisch", "ionisch", "korintisch"] },
  { ka: "De confrontatie tussen de Grieks-Romeinse cultuur en de Germaanse cultuur van Noordwest-Europa", keywords: ["julius civilis", "arminius", "bataven", "limes", "teutoburgerwoud", "volksverhuizingen"] },
  { ka: "De ontwikkeling van het jodendom en het christendom als de eerste monotheïstische godsdiensten", keywords: ["jezus", "paulus", "constantijn", "monotheïsme", "bijbel", "messias", "edict van milaan", "christendom"] },

  // Tijdvak 3 [cite: 312]
  { ka: "Het ontstaan en de verspreiding van de islam", keywords: ["mohammed", "karel martel", "koran", "jihad", "kalifaat", "mekka", "poitiers", "reconquista"] },
  { ka: "De vrijwel volledige vervanging in West-Europa van de agrarisch-urbane cultuur door een zelfvoorzienende agrarische cultuur", keywords: ["hofstelsel", "horigheid", "autarkie", "domein", "herendiensten", "vroonland"] },
  { ka: "Het ontstaan van feodale verhoudingen in het bestuur", keywords: ["karel de grote", "feodalisme", "leenstelsel", "leenheer", "vazal", "eed van trouw"] },
  { ka: "De verspreiding van het christendom in geheel Europa", keywords: ["willibrord", "bonifatius", "clovis", "missionaris", "klooster", "kerstening"] },

  // Tijdvak 4 [cite: 347]
  { ka: "De opkomst van handel en ambacht die de basis legde voor het herleven van een agrarisch-urbane samenleving", keywords: ["hanze", "marco polo", "gilde", "wisselbrief", "zwarte dood", "pest", "jaarmarkt"] },
  { ka: "De opkomst van de stedelijke burgerij en de toenemende zelfstandigheid van steden", keywords: ["stadsrechten", "guldensporenslag", "patriciaat", "schepenen", "stadslucht maakt vrij"] },
  { ka: "Het begin van staatsvorming en centralisatie", keywords: ["filips de goede", "karel de stoute", "centralisatie", "staten-generaal", "bourgondië"] },
  { ka: "Het conflict in de christelijke wereld over de vraag of de wereldlijke dan wel de geestelijke macht het primaat behoorde te hebben", keywords: ["gregorius vii", "hendrik iv", "investituurstrijd", "canossa", "concordaat van worms", "tweezwaardenleer"] },
  { ka: "De expansie van de christelijke wereld naar buiten toe, onder andere in de vorm van de kruistochten", keywords: ["urbanus ii", "godfried van bouillon", "saladin", "kruistocht", "jeruzalem", "heilige land"] },

  // Tijdvak 5 [cite: 381]
  { ka: "Het veranderende mens- en wereldbeeld van de renaissance en het begin van een nieuwe wetenschappelijke belangstelling", keywords: ["erasmus", "leonardo da vinci", "copernicus", "humanisme", "carpe diem", "uomo universalis", "heliocentrisme"] },
  { ka: "De hernieuwde oriëntatie op het erfgoed van de klassieke oudheid", keywords: ["michelangelo", "rafaël", "renaissance", "perspectief", "sixtijnse kapel"] },
  { ka: "Het begin van de Europese overzeese expansie", keywords: ["columbus", "vasco da gama", "magelhaes", "cortés", "conquistadores", "nieuwe wereld", "1492"] },
  { ka: "De protestantse reformatie die splitsing van de christelijke kerk in West-Europa tot gevolg had", keywords: ["luther", "calvijn", "karel v", "reformatie", "95 stellingen", "aflaat", "beeldenstorm", "protestantisme"] },
  { ka: "Het conflict in de Nederlanden dat resulteerde in de stichting van een Nederlandse staat", keywords: ["willem van oranje", "filips ii", "alva", "tachtigjarige oorlog", "plakkaat van verlatinghe", "unie van utrecht", "watergeuzen"] },

  // Tijdvak 6 [cite: 411]
  { ka: "Wereldwijde handelscontacten, handelskapitalisme en het begin van een wereldeconomie", keywords: ["voc", "wic", "jan pieterszoon coen", "piet hein", "driehoekshandel", "wereldeconomie", "handelskapitalisme", "batavia"] },
  { ka: "De bijzondere plaats in staatkundig opzicht en de bloei in economisch en cultureel opzicht van de Nederlandse Republiek", keywords: ["rembrandt", "johan de witt", "michiel de ruyter", "gouden eeuw", "regenten", "stadhouder", "rampjaar"] },
  { ka: "Het streven van vorsten naar absolute macht", keywords: ["lodewijk xiv", "zonnekoning", "absolutisme", "versailles", "droit divin"] },
  { ka: "De wetenschappelijke revolutie", keywords: ["newton", "descartes", "van leeuwenhoek", "spinoza", "empirisme", "rationalisme", "natuurwetten"] },

  // Tijdvak 7 [cite: 442]
  { ka: "Rationeel optimisme en \"verlicht denken\" dat werd toegepast op alle terreinen van de samenleving", keywords: ["voltaire", "rousseau", "montesquieu", "adam smith", "verlichting", "trias politica", "volkssoevereiniteit", "encyclopedie"] },
  { ka: "Voortbestaan van het ancien régime met pogingen om het vorstelijk bestuur op eigentijdse verlichte wijze vorm te geven", keywords: ["frederik de grote", "catharina de grote", "ancien régime", "verlicht absolutisme", "alles voor het volk"] },
  { ka: "De democratische revoluties in westerse landen met als gevolg discussies over grondwetten, grondrechten en staatsburgerschap", keywords: ["napoleon", "patriotten", "franse revolutie", "bataafse revolutie", "guillotine", "grondwet", "1789"] },
  { ka: "Uitbouw van de Europese overheersing, met name in de vorm van plantagekoloniën en de daarmee verbonden transatlantische slavenhandel, en de opkomst van het abolitionisme", keywords: ["william wilberforce", "tula", "slavernij", "abolitionisme", "transatlantische slavenhandel", "keti koti", "driehoekshandel"] },

  // Tijdvak 8 [cite: 473]
  { ka: "De industriële revolutie die in de westerse wereld de basis legde voor een industriële samenleving", keywords: ["james watt", "stoommachine", "industriële revolutie", "fabriek", "urbanisatie", "spoorwegen"] },
  { ka: "De opkomst van politiek-maatschappelijke stromingen: liberalisme, nationalisme, socialisme, confessionalisme en feminisme", keywords: ["marx", "thorbecke", "kuyper", "liberalisme", "socialisme", "confessionalisme", "feminisme"] },
  { ka: "Voortschrijdende democratisering, met deelname van steeds meer mannen en vrouwen aan het politieke proces", keywords: ["aletta jacobs", "willem ii", "grondwet 1848", "kiesrecht", "sufragette", "pacificatie van 1917"] },
  { ka: "De opkomst van emancipatiebewegingen", keywords: ["verzuiling", "schoolstrijd", "vakbonden", "emancipatie"] },
  { ka: "Discussies over de \"sociale kwestie\"", keywords: ["van houten", "priester daens", "sociale kwestie", "kinderarbeid", "arbeidersklasse"] },
  { ka: "De moderne vorm van imperialisme die verband hield met de industrialisatie", keywords: ["multatuli", "max havelaar", "modern imperialisme", "koloniën", "grondstoffen", "conferentie van berlijn"] },

  // Tijdvak 9 [cite: 510]
  { ka: "Het voeren van twee wereldoorlogen", keywords: ["churchill", "hitler", "stalin", "eerste wereldoorlog", "tweede wereldoorlog", "loopgraven", "d-day", "stalingrad"] },
  { ka: "De crisis van het wereldkapitalisme", keywords: ["roosevelt", "colijn", "beurskrach", "1929", "new deal", "werkloosheid"] },
  { ka: "Het in praktijk brengen van de totalitaire ideologieën communisme en fascisme/nationaalsocialisme", keywords: ["totalitarisme", "communisme", "fascisme", "nationaalsocialisme", "mussolini", "dictatuur"] },
  { ka: "De rol van moderne propaganda- en communicatiemiddelen en vormen van massaorganisatie", keywords: ["goebbels", "propaganda", "censuur", "hitlerjugend", "massaorganisatie"] },
  { ka: "Vormen van verzet tegen het West-Europese imperialisme", keywords: ["soekarno", "gandhi", "nationalisme azië", "non-coöperatie"] },
  { ka: "Verwoestingen op niet eerder vertoonde schaal door massavernietigingswapens en de betrokkenheid van de burgerbevolking bij oorlogvoering", keywords: ["oppenheimer", "atoombom", "hiroshima", "rotterdam", "bombardement"] },
  { ka: "Racisme en discriminatie die leidden tot genocide, in het bijzonder op de joden", keywords: ["anne frank", "holocaust", "shoa", "antisemitisme", "auschwitz", "endlösung"] },
  { ka: "De Duitse bezetting van Nederland", keywords: ["verzet", "collaboratie", "nsb", "hongerwinter", "bezetting", "wilhelmina"] },

  // Tijdvak 10 [cite: 536]
  { ka: "De dekolonisatie die een eind maakte aan de westerse hegemonie in de wereld", keywords: ["dekolonisatie", "indonesië", "politionele acties", "suriname", "soevereiniteit"] },
  { ka: "De verdeling van de wereld in twee ideologische blokken in de greep van een wapenwedloop en de daaruit voortvloeiende dreiging van een atoomoorlog", keywords: ["koude oorlog", "ijzeren gordijn", "berlijnse muur", "sovjet-unie", "navo", "kennedy", "korea", "vietnam", "cuba-crisis"] },
  { ka: "De toenemende westerse welvaart die vanaf de jaren 1960 aanleiding gaf tot ingrijpende sociaal-culturele veranderingsprocessen", keywords: ["wederopbouw", "drees", "jaren 60", "provo", "dolle mina", "ontzuiling", "verzorgingsstaat"] },
  { ka: "De eenwording van Europa", keywords: ["europese unie", "egks", "euro", "brexit", "verdrag van maastricht"] },
  { ka: "De ontwikkeling van pluriforme en multiculturele samenlevingen", keywords: ["gastarbeiders", "multiculturele samenleving", "integratie", "pim fortuyn", "9/11"] }
];

// --- SCAN & MATCH LOGICA ---
const analyzeTextForTags = (text) => {
    const foundKAs = new Set();
    const foundTVs = new Set();
    const lowerText = text.toLowerCase();

    KA_THESAURUS.forEach(entry => {
        const match = entry.keywords.some(keyword => lowerText.includes(keyword));
        if (match) {
            foundKAs.add(entry.ka);
            if (entry.tijdvak) foundTVs.add(entry.tijdvak);
        }
    });
    
    if (lowerText.match(/\b15\d{2}\b/)) foundTVs.add('Tijdvak 5');
    if (lowerText.match(/\b16\d{2}\b/)) foundTVs.add('Tijdvak 6');
    if (lowerText.match(/\b17\d{2}\b/)) foundTVs.add('Tijdvak 7');
    if (lowerText.match(/\b18\d{2}\b/)) foundTVs.add('Tijdvak 8');
    if (lowerText.match(/\b19[0-4]\d\b/)) foundTVs.add('Tijdvak 9');
    if (lowerText.match(/\b19[5-9]\d\b/) || lowerText.match(/\b20\d{2}\b/)) foundTVs.add('Tijdvak 10');

    return { kas: Array.from(foundKAs), tvs: Array.from(foundTVs) };
};

const TIJDVAK_MAPPING = {
    'Tijdvak 1': 'prehistorie',
    'Tijdvak 2': 'oudheid',
    'Tijdvak 3': 'vroege-middeleeuwen',
    'Tijdvak 4': 'late-middeleeuwen',
    'Tijdvak 5': '16e-eeuw',
    'Tijdvak 6': '17e-eeuw',
    'Tijdvak 7': '18e-eeuw',
    'Tijdvak 8': '19e-eeuw',
    'Tijdvak 9': '20e-eeuw',
    'Tijdvak 10': '20e-eeuw'
};

const fetchDetail = async (url) => {
    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 3000
        });
        const $ = cheerio.load(data);
        let fullText = $('.elementor-widget-theme-post-content').text().trim();
        if (!fullText) fullText = $('.entry-content').text().trim();
        
        let detailImg = $('.elementor-widget-theme-post-content figure.wp-block-image img').attr('src');
        if (!detailImg) detailImg = $('.elementor-widget-theme-post-content img').attr('src');

        return {
            text: fullText.replace(/\s+/g, ' ').trim(),
            image: detailImg || null
        };
    } catch (e) {
        return { text: null, image: null };
    }
};

const searchKleio = async ({ query, filters }) => {
    if (filters.providers?.length > 0 && !filters.providers.includes('Kleio')) return [];

    let searchTerms = [];
    let searchUrl = '';

    let cleanQuery = query;
    let excludedTerms = [];

    if (query && query.includes(' NOT ')) {
        const parts = query.split(' NOT ');
        cleanQuery = parts[0].trim();
        excludedTerms = parts.slice(1).map(t => t.trim().toLowerCase());
    }

    // 1. BEPAAL URL (Met Thesaurus Support)
    if (cleanQuery && cleanQuery.trim() !== '') {
        searchUrl = `https://www.vgnkleio.nl/?s=${encodeURIComponent(cleanQuery)}`;
    } else if (filters.kas && filters.kas.length > 0) {
        const selectedKA = filters.kas[0]; 
        // Zoek de KA in de Thesaurus (op exacte match, want ze komen uit dezelfde bron)
        const thesaurusEntry = KA_THESAURUS.find(t => t.ka === selectedKA);
        
        if (thesaurusEntry) {
            console.log(`[a27.kleio] 🧠 Slim zoeken op KA: "${thesaurusEntry.ka}"`);
            const term = thesaurusEntry.keywords[0]; // Pak eerste keyword (bijv. "koude oorlog")
            searchUrl = `https://www.vgnkleio.nl/?s=${encodeURIComponent(term)}`;
        }
    } else if (filters.tijdvak) {
        const slug = TIJDVAK_MAPPING[filters.tijdvak];
        if (slug) searchUrl = `https://www.vgnkleio.nl/bronnen/?_filter_tijd=${slug}`;
    }

    if (!searchUrl) return []; 

    console.log(`[a27.kleio] 🔍 Fetchen: ${searchUrl}`);

    try {
        const { data } = await axios.get(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(data);
        const basicResults = [];

        $('article, .fw-facet-row').each((i, elem) => {
            if (basicResults.length >= 30) return;
            const title = $(elem).find('h2, h3, .fw-facet-item-title').first().text().trim();
            const link = $(elem).find('a').first().attr('href');
            let thumb = $(elem).find('img').attr('src') || $(elem).find('img').attr('data-src');

            if (title && link) {
                basicResults.push({
                    id: `kleio-${i}`,
                    title,
                    link,
                    thumb,
                    provider: 'Kleio',
                    type: 'TEXT', tv: [], ka: []
                });
            }
        });

        const detailedResults = await Promise.all(basicResults.map(async (item) => {
            const details = await fetchDetail(item.link);
            const finalImage = details.image || item.thumb;
            const scanText = `${item.title} ${details.text || ''}`;

            if (excludedTerms.some(term => scanText.toLowerCase().includes(term))) return null;

            const analysis = analyzeTextForTags(scanText);
            let forcedTV = filters.tijdvak ? [filters.tijdvak] : [];
            let forcedKA = filters.kas && filters.kas.length > 0 ? filters.kas : [];
            
            // Als we via Thesaurus hebben gezocht, voegen we die KA ook toe aan het resultaat
            if (filters.kas && filters.kas.length > 0) {
                 analysis.kas.push(filters.kas[0]);
            }

            const finalTV = Array.from(new Set([...forcedTV, ...analysis.tvs]));
            const finalKA = Array.from(new Set([...forcedKA, ...analysis.kas]));

            return {
                ...item,
                imageUrl: finalImage,
                description: details.text || 'Geen tekst.',
                highlight: details.text ? (details.text.substring(0, 200) + '...') : '',
                fullText: details.text,
                type: finalImage ? 'IMAGE' : 'TEXT',
                tv: finalTV,
                ka: finalKA
            };
        }));

        const finalFiltered = detailedResults.filter(item => {
            if (!item) return false;
            if (filters.types?.length > 0 && !filters.types.includes(item.type)) return false;
            // Geen extra KA check meer nodig, want we hebben gezocht op de KA keywords!
            return true;
        });

        console.log(`[a27.kleio] ✅ ${finalFiltered.length} resultaten.`);
        return finalFiltered;

    } catch (error) {
        console.error('[a27.kleio] ❌ Fout:', error.message);
        return [];
    }
};

module.exports = { searchKleio };

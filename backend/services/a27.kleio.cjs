const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');

// --- 1. DE COMPLETE & RIJKE THESAURUS (KA 1 t/m 49) ---
const KA_MAPPING = {
    'ka1': ['jager-verzamelaar', 'nomaden', 'prehistorie', 'paleolithicum', 'grotschildering', 'vuistbijl', 'ijstijd', 'ötzi'],
    'ka2': ['landbouwrevolutie', 'neolithicum', 'sedentair', 'agrarische samenleving', 'domesticatie', 'akkerbouw', 'veeteelt', 'hunebed'],
    'ka3': ['stadstaat', 'schrift', 'hiërogliefen', 'spijkerschrift', 'polytheïsme', 'irrigatielandbouw', 'farao', 'mesopotamië', 'uruk'],
    'ka4': ['polis', 'democratie', 'aristocratie', 'monarchie', 'tirannie', 'filosofie', 'wetenschap', 'athene', 'sparta', 'socrates'],
    'ka5': ['imperium', 'romanisering', 'republiek', 'keizerrijk', 'pax romana', 'limes', 'julius caesar', 'augustus', 'trajanus'],
    'ka6': ['klassieke vormentaal', 'zuilen', 'dorisch', 'ionisch', 'korintisch', 'fronton', 'aquaduct', 'amfitheater', 'colosseum', 'pantheon'],
    'ka7': ['germanen', 'limes', 'volksverhuizingen', 'barbaren', 'bataven', 'bataafse opstand', 'julius civilis', 'arminius'],
    'ka8': ['monotheïsme', 'jodendom', 'christendom', 'bijbel', 'tenach', 'messias', 'staatsgodsdienst', 'vervolging', 'jezus', 'paulus'],
    'ka9': ['verspreiding christendom', 'kerstening', 'missionaris', 'klooster', 'paus', 'bisschop', 'willibrord', 'bonifatius', 'clovis'],
    'ka10': ['islam', 'moslim', 'koran', 'jihad', 'kalief', 'mekka', 'medina', 'mohammed', 'karel martel', 'poitiers'],
    'ka11': ['hofstelsel', 'horigheid', 'autarkie', 'domein', 'herendiensten', 'vroonhof', 'agrarische samenleving', 'karel de grote'],
    'ka12': ['feodalisme', 'leenstelsel', 'leenheer', 'leenman', 'vazal', 'ridders', 'adel', 'karel de grote', 'verdrag van verdun'],
    'ka13': ['handel', 'ambacht', 'markt', 'gilde', 'hanze', 'wisselbrief', 'jaarmarkt', 'brugge', 'gent', 'kogge', 'zwarte dood'],
    'ka14': ['stadsrechten', 'burgerij', 'patriciërs', 'schepenen', 'stadhuis', 'schutterij', 'guldensporenslag', 'kathedraal'],
    'ka15': ['investituurstrijd', 'tweezwaardenleer', 'paus', 'keizer', 'ban', 'excommunicatie', 'canossa', 'gregorius vii', 'hendrik iv'],
    'ka16': ['kruistochten', 'heilige land', 'jeruzalem', 'reconquista', 'expansie', 'tempeliers', 'paus urbanus', 'godfried van bouillon'],
    'ka17': ['staatsvorming', 'centralisatie', 'uniformering', 'parlement', 'staten-generaal', 'belasting', 'huurleger', 'bourgondiërs'],
    'ka18': ['ontdekkingsreizen', 'kolonialisme', 'conquistadores', 'factorij', 'wereldhandel', 'columbus', 'vasco da gama', 'magellaan'],
    'ka19': ['renaissance', 'humanisme', 'uomo universale', 'individualisme', 'carpe diem', 'perspectief', 'boekdrukkunst', 'da vinci', 'erasmus'],
    'ka20': ['klassieke oudheid', 'classicisme', 'filologie', 'zuilenordes', 'michelangelo', 'rafaël', 'bramante'],
    'ka21': ['reformatie', 'protestantisme', 'luther', 'calvijn', 'aflaat', '95 stellingen', 'beeldenstorm', 'karel v', 'filips ii'],
    'ka22': ['opstand', 'tachtigjarige oorlog', 'willem van oranje', 'filips ii', 'alva', 'watergeuzen', 'plakkaat van verlatinghe', 'unie van utrecht'],
    'ka23': ['absolutisme', 'droit divin', 'hofcultuur', 'mercantilisme', 'centralisatie', 'versailles', 'lodewijk xiv', 'zonnekoning'],
    'ka24': ['gouden eeuw', 'republiek', 'regenten', 'stadhouder', 'raadpensionaris', 'voc', 'wic', 'johan de witt', 'michiel de ruyter', 'rembrandt'],
    'ka25': ['handelskapitalisme', 'wereldeconomie', 'voc', 'wic', 'aandelen', 'beurs', 'driehoekshandel', 'plantagekolonie', 'jan pieterszoon coen'],
    'ka26': ['wetenschappelijke revolutie', 'empirisme', 'rationalisme', 'experiment', 'natuurwet', 'newton', 'galilei', 'kepler', 'descartes'],
    'ka27': ['verlichting', 'rationalisme', 'natuurrechten', 'trias politica', 'encyclopedie', 'voltaire', 'rousseau', 'locke', 'montesquieu'],
    'ka28': ['ancien régime', 'standenmaatschappij', 'verlicht absolutisme', 'alles voor het volk', 'frederik de grote', 'catharina de grote'],
    'ka29': ['slavernij', 'plantagekolonie', 'transatlantische slavenhandel', 'driehoekshandel', 'abolitionisme', 'keti koti', 'toussaint louverture'],
    'ka30': ['democratische revolutie', 'grondwet', 'grondrechten', 'staatsburgerschap', 'franse revolutie', 'bataafse revolutie', 'amerikaanse revolutie'],
    'ka31': ['industriële revolutie', 'stoommachine', 'fabriek', 'mechanisatie', 'urbanisatie', 'massaproductie', 'james watt', 'spoorwegen'],
    'ka32': ['sociale kwestie', 'kinderarbeid', 'arbeidersbeweging', 'vakbond', 'socialisme', 'kinderwetje van houten', 'domela nieuwenhuis'],
    'ka33': ['modern imperialisme', 'kolonialisme', 'conferentie van berlijn', 'scramble for africa', 'white mans burden', 'atjeh-oorlog', 'multatuli'],
    'ka34': ['emancipatiebewegingen', 'verzuiling', 'schoolstrijd', 'feminisme', 'confessionalisme', 'aletta jacobs', 'abraham kuyper'],
    'ka35': ['democratisering', 'kiesrecht', 'grondwet 1848', 'thorbecke', 'parlementair stelsel', 'censuskiesrecht', 'algemeen kiesrecht'],
    'ka36': ['politieke stromingen', 'liberalisme', 'socialisme', 'confessionalisme', 'nationalisme', 'conservatisme', 'marx'],
    'ka37': ['eerste wereldoorlog', 'tweede wereldoorlog', 'loopgraven', 'totale oorlog', 'wapenwedloop', 'somme', 'verdun', 'hitler', 'stalin'],
    'ka38': ['wereldcrisis', 'beurskrach', '1929', 'werkloosheid', 'new deal', 'roosevelt', 'colijn', 'zwarte donderdag', 'keynes'],
    'ka39': ['totalitaire systemen', 'communisme', 'fascisme', 'nationaalsocialisme', 'dictatuur', 'propaganda', 'hitler', 'mussolini', 'stalin'],
    'ka40': ['propaganda', 'censuur', 'massaorganisatie', 'indoctrinatie', 'goebbels', 'hitlerjugend', 'radio oranje'],
    'ka41': ['holocaust', 'genocide', 'antisemitisme', 'jodenvervolging', 'endlösung', 'auschwitz', 'anne frank', 'westerbork'],
    'ka42': ['bezetting', 'collaboratie', 'verzet', 'onderduik', 'hongerwinter', 'razzia', 'februaristaking', 'seyss-inquart', 'mussert'],
    'ka43': ['verwoestingen', 'massavernietigingswapens', 'atoombom', 'bombardement', 'hiroshima', 'rotterdam', 'coventry', 'dresden'],
    'ka44': ['verzet imperialisme', 'dekolonisatie', 'nationalisme azië', 'soekarno', 'gandhi', 'politionele acties', 'onafhankelijkheid'],
    'ka45': ['koude oorlog', 'ijzeren gordijn', 'sovjet-unie', 'navo', 'berlijnse muur', 'wapenwedloop', 'kennedy', 'korea', 'vietnam', 'cubacrisis'],
    'ka46': ['dekolonisatie', 'onafhankelijkheid', 'derde wereld', 'suriname', 'papoea', 'suezcrisis', 'lumumba', 'mandela'],
    'ka47': ['europese eenwording', 'europese unie', 'egks', 'eeg', 'euro', 'schengen', 'verdrag van maastricht', 'monnet', 'kohl'],
    'ka48': ['welvaart', 'wederopbouw', 'jaren 60', 'provo', 'dolle mina', 'ontzuiling', 'verzorgingsstaat', 'jeugdcultuur', 'hippie', 'drees'],
    'ka49': ['pluriforme samenleving', 'multicultureel', 'gastarbeiders', 'migratie', 'integratie', 'globalisering', 'internet', 'fortuyn', '9/11']
};

// --- 2. HULPFUNCTIE: KIES ZOEKWOORDEN ---
function getSearchTermsForKA(kaID, limit = 6) {
    const id = String(kaID).toLowerCase();
    const keywords = KA_MAPPING[id];
    
    if (!keywords || keywords.length === 0) {
        console.warn(`[Kleio] Geen keywords gevonden voor ${id}`);
        return [];
    }
    
    const shuffled = [...keywords].sort(() => 0.5 - Math.random());
    const terms = shuffled.slice(0, limit);
    console.log(`[Kleio] 🎲 Multisearch voor ${id}: ${terms.join(', ')}`);
    return terms;
}

// --- 3. SLIMME SCRAPER (Met Elementor Fix) ---
async function scrapeDetail(url) {
    try {
        // TIMEOUT VERHOOGD NAAR 10 SECONDEN
        const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 });
        const $ = cheerio.load(data);

        $('script, style, nav, header, footer, .sharedaddy, .jp-relatedposts, #cookie-notice').remove();

        // TEKST ZOEKEN
        let fullText = '';
        const elContent = $('.elementor-widget-theme-post-content');
        if (elContent.length > 0) {
            fullText = elContent.text();
        } else {
            fullText = $('.entry-content').text() || '';
            if (fullText.length < 50) {
                $('body p').each((_, p) => {
                    const t = $(p).text().trim();
                    if (t.length > 30) fullText += t + '\n\n';
                });
            }
        }
        fullText = fullText.replace(/\s+/g, ' ').trim();
        if (!fullText) fullText = "Geen leesbare tekst gevonden.";

        // AFBEELDINGEN ZOEKEN
        let imageUrl = null;
        $('img').each((i, el) => {
            if (imageUrl) return;
            const src = $(el).attr('src');
            if (!src) return;

            const isUpload = src.includes('/wp-content/uploads/');
            const isLogo = src.toLowerCase().includes('logo') || 
                           ($(el).attr('class')||'').toLowerCase().includes('logo') ||
                           ($(el).attr('alt')||'').toLowerCase().includes('logo');
            
            const isIcon = src.includes('icon') || src.includes('gravatar') || src.includes('print') || src.includes('share');

            if (isUpload && !isLogo && !isIcon) imageUrl = src;
        });

        return { fullText: fullText.substring(0, 3000), imageUrl };
    } catch (e) {
        return { fullText: null, imageUrl: null };
    }
}

// --- 4. DE MULTI-SEARCH FUNCTIE ---
const searchKleio = async ({ query, filters }) => {
    if (filters && filters.kleio === false) return [];

    let termsToSearch = [];

    if (query && query.trim().length > 1) {
        termsToSearch.push(query);
    } else if (filters.ka && filters.ka.length > 0) {
        const kaID = filters.ka[0]; 
        const tags = getSearchTermsForKA(kaID, 6); 
        termsToSearch = [...termsToSearch, ...tags];
    }

    if (termsToSearch.length === 0) {
        console.log("[Kleio] Geen termen om te zoeken.");
        return [];
    }

    console.log(`[Kleio] 🚀 Start multisearch met ${termsToSearch.length} termen...`);

    const uniqueLinks = new Set();
    let basicResults = [];

    // PARALLEL ZOEKEN (Met verhoogde timeout van 15 seconden)
    await Promise.all(termsToSearch.map(async (term) => {
        try {
            const searchUrl = `https://www.vgnkleio.nl/?s=${encodeURIComponent(term)}`;
            const { data } = await axios.get(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 });
            const $ = cheerio.load(data);

            $('article, .post, .type-post').each((i, elem) => {
                const link = $(elem).find('a').first().attr('href');
                if (link && !uniqueLinks.has(link)) {
                    const title = $(elem).find('h2, h3, .entry-title a').first().text().trim();
                    if (title) {
                        uniqueLinks.add(link); 
                        basicResults.push({ title, link });
                    }
                }
            });
        } catch (e) {
            console.error(`[Kleio] Fout bij term "${term}":`, e.message);
        }
    }));

    console.log(`[Kleio] Totaal ${basicResults.length} unieke links gevonden. Nu verrijken (max 12)...`);

    const topResults = basicResults.slice(0, 12);

    const detailedResults = await Promise.all(topResults.map(async (item, index) => {
        const details = await scrapeDetail(item.link);
        const id = crypto.createHash('md5').update(item.link).digest('hex').substring(0, 12);
        const type = details.imageUrl ? 'IMAGE' : 'TEXT';

        return {
            id: id,
            title: item.title,
            description: details.fullText ? details.fullText.substring(0, 200) + '...' : '',
            fullText: details.fullText,
            imageUrl: details.imageUrl,
            url: item.link,
            provider: 'Kleio',
            type: type,
            tv: [], ka: [] 
        };
    }));

    const finalResults = detailedResults.filter(r => r.fullText && r.fullText.length > 10);
    
    console.log(`[Kleio] ✅ ${finalResults.length} definitieve resultaten.`);
    return finalResults;
};

module.exports = { searchKleio };

"use strict";

const express = require("express");
const router = express.Router();

/**
 * a13.searchPreset.cjs
 *
 * Doel:
 * - Op basis van een KA-nummer (1 t/m 49) een set zoektermen teruggeven
 *   die de grabbelton / Kleio + Cito zoekmachine aanstuurt.
 *
 * Request:  POST /api/search-preset
 * Body:
 *   { "ka": "45" }
 *
 * Response:
 *   {
 *     "ok": true,
 *     "presets": [
 *       {
 *         "id": "ka45",
 *         "label": "KA45",
 *         "terms": ["koude oorlog", "wapenwedloop", ...]
 *       }
 *     ]
 *   }
 *
 * Let op:
 * - Als er geen geldige KA wordt gevonden, krijg je gewoon een lege lijst terug.
 */

// Volledige KA 1 t/m 49 – termen zijn zowel concepten als namen,
// speciaal verrijkt bij KA36, KA38 en KA45.
const PRESET_KA_TERMS = {
  ka1: [
    "jagers-verzamelaars",
    "nomaden",
    "steentijd",
    "vuistbijl",
    "rendierjacht",
    "kampvuur",
    "trekvolk",
    "prehistorie"
  ],
  ka2: [
    "landbouwrevolutie",
    "neolithicum",
    "akkerbouw",
    "veeteelt",
    "sedentair",
    "hunebedden",
    "boerendorp",
    "graanopslag"
  ],
  ka3: [
    "eerste steden",
    "vruchtbare halve maan",
    "irrigatielandbouw",
    "stadsstaat",
    "schriftsystemen",
    "spijkerschrift",
    "hiërogliefen",
    "Mesopotamië"
  ],
  ka4: [
    "Griekse stadstaat",
    "polis",
    "democratie Athene",
    "Sparta",
    "olympische spelen",
    "Griekse filosofie",
    "Socrates",
    "Plato"
  ],
  ka5: [
    "Romeinse rijk",
    "republiek",
    "keizertijd",
    "Pax Romana",
    "Romeinse legioenen",
    "limes",
    "Julius Caesar",
    "keizer Augustus"
  ],
  ka6: [
    "klassieke vormentaal",
    "Romeinse bouwkunst",
    "zuilenorde",
    "amfitheater",
    "triomfboog",
    "colosseum",
    "mozaïek",
    "standbeelden"
  ],
  ka7: [
    "Germanen",
    "volksverhuizingen",
    "barbaren",
    "Bataafse opstand",
    "Julius Civilis",
    "Romeinse limes",
    "val West-Romeinse Rijk",
    "Heerlen Coriovallum"
  ],
  ka8: [
    "jodendom",
    "christendom",
    "monotheïsme",
    "bijbel",
    "Tenach",
    "keizer Constantijn",
    "kerkvervolging",
    "staatsgodsdienst"
  ],
  ka9: [
    "kerstening",
    "missionarissen",
    "Willibrord",
    "Bonifatius",
    "kloosters",
    "monniken",
    "paus",
    "christelijke tradities"
  ],
  ka10: [
    "ontstaan islam",
    "profeet Mohammed",
    "Mekka",
    "Medina",
    "kalifaat",
    "jihad",
    "slag bij Poitiers",
    "Arabische veroveringen"
  ],
  ka11: [
    "hofstelsel",
    "horigheid",
    "domeinheer",
    "autarkie",
    "boeren",
    "herendiensten",
    "middeleeuwse landbouw",
    "Karel de Grote"
  ],
  ka12: [
    "feodalisme",
    "leenstelsel",
    "leenheer",
    "leenman",
    "vazal",
    "ridders",
    "adel",
    "ridderideaal"
  ],
  ka13: [
    "stedelijke herleving",
    "handel en ambacht",
    "gilden",
    "jaarmarkten",
    "Hanze",
    "kooplieden",
    "middeleeuwse stad",
    "zwarte dood"
  ],
  ka14: [
    "stadsrechten",
    "burgerij",
    "schepenen",
    "patriciërs",
    "stadsmuren",
    "stadsbestuur",
    "raadhuis",
    "middeleeuwse stad"
  ],
  ka15: [
    "investituurstrijd",
    "strijd tussen paus en keizer",
    "canossa",
    "Gregorius VII",
    "Hendrik IV",
    "kerkelijke macht",
    "wereldlijke macht",
    "banvloek"
  ],
  ka16: [
    "kruistochten",
    "verovering Jeruzalem",
    "Heilig Land",
    "tempeliers",
    "kruisvaarders",
    "Reconquista",
    "urbanus II",
    "moslims en christenen"
  ],
  ka17: [
    "staatsvorming",
    "centralisatie",
    "Bourgondiërs",
    "Staten-Generaal",
    "belasting",
    "huurlegers",
    "parlement",
    "vorstendom"
  ],
  ka18: [
    "ontdekkingsreizen",
    "Columbus",
    "Vasco da Gama",
    "Magellaan",
    "wereldhandel",
    "koloniën",
    "inheemse volken",
    "conquistadores"
  ],
  ka19: [
    "renaissance",
    "humanisme",
    "Leonardo da Vinci",
    "Michelangelo",
    "drukpers",
    "Erasmus",
    "nieuw mensbeeld",
    "herontdekking oudheid"
  ],
  ka20: [
    "hernieuwde oriëntatie",
    "classicisme",
    "bijbelstudie",
    "filologie",
    "Griekse en Romeinse cultuur",
    "humanisten",
    "antieke teksten",
    "kunst in de oudheid"
  ],
  ka21: [
    "reformatie",
    "Luther",
    "Calvijn",
    "aflaat",
    "95 stellingen",
    "protestantisme",
    "beeldenstorm",
    "godsdienstoorlogen"
  ],
  ka22: [
    "Nederlandse Opstand",
    "Tachtigjarige Oorlog",
    "Willem van Oranje",
    "Filips II",
    "plakkaat van Verlatinghe",
    "Unie van Utrecht",
    "Watergeuzen",
    "Pacificatie van Gent"
  ],
  ka23: [
    "absolutisme",
    "droit divin",
    "Lodewijk XIV",
    "Versailles",
    "hofcultuur",
    "mercantilisme",
    "centralisatie",
    "vorstenmacht"
  ],
  ka24: [
    "Gouden Eeuw",
    "Republiek der Zeven Provinciën",
    "VOC",
    "WIC",
    "regenten",
    "stadhouder",
    "Amsterdam stapelmarkt",
    "Rembrandt"
  ],
  ka25: [
    "wereldeconomie",
    "handelskapitalisme",
    "driehoekshandel",
    "slavernij",
    "plantagekolonie",
    "aandelenbeurs",
    "Jan Pieterszoon Coen",
    "Atlantische handel"
  ],
  ka26: [
    "wetenschappelijke revolutie",
    "Galilei",
    "Newton",
    "Kepler",
    "experiment",
    "natuurwetten",
    "telescoop",
    "rationalisme"
  ],
  ka27: [
    "verlichting",
    "Montesquieu",
    "Voltaire",
    "Rousseau",
    "Locke",
    "scheiding der machten",
    "natuurrechten",
    "encyclopedie"
  ],
  ka28: [
    "ancien régime",
    "standenmaatschappij",
    "adel en geestelijkheid",
    "verlicht absolutisme",
    "Frederik de Grote",
    "tsarina Catharina",
    "paternalisme",
    "hervormingen van bovenaf"
  ],
  ka29: [
    "slavernij",
    "plantages",
    "trans-Atlantische slavenhandel",
    "abolitionisme",
    "Keti Koti",
    "driehoekshandel",
    "zwarte diaspora",
    "Suriname"
  ],
  ka30: [
    "democratische revoluties",
    "Amerikaanse Revolutie",
    "Franse Revolutie",
    "verklaring van de rechten van de mens",
    "Bataafse Revolutie",
    "grondwet",
    "burgerrechten",
    "scheiding der machten"
  ],
  ka31: [
    "industriële revolutie",
    "stoommachine",
    "fabrieken",
    "urbanisatie",
    "arbeidersklasse",
    "Manchester",
    "textielindustrie",
    "spoorwegen"
  ],
  ka32: [
    "sociale kwestie",
    "krottenwijken",
    "kinderarbeid",
    "arbeidsomstandigheden",
    "sociale wetten",
    "Rerum Novarum",
    "vakbonden",
    "sociale wetgeving"
  ],
  ka33: [
    "modern imperialisme",
    "koloniale wedloop",
    "Scramble for Africa",
    "Brits rijk",
    "Frans koloniaal rijk",
    "Cecil Rhodes",
    "economische exploitatie",
    "beschavingsmissie"
  ],
  ka34: [
    "emancipatiebewegingen",
    "feminisme",
    "vrouwenkiesrecht",
    "katholieke emancipatie",
    "sociale emancipatie",
    "arbeidersbeweging",
    "Aletta Jacobs",
    "SDAP"
  ],
  ka35: [
    "voortschrijdende democratisering",
    "uitbreiding kiesrecht",
    "censuskiesrecht",
    "algemeen mannenkiesrecht",
    "algemeen kiesrecht",
    "parlement",
    "politieke partijen",
    "kiesrechtstrijd"
  ],

  // UITGEBREID MET PERSONEN
  ka36: [
    "politieke stromingen",
    "liberalisme",
    "socialisme",
    "nationalisme",
    "confessionalisme",
    "feminisme",
    // personen – stromingen verpersoonlijkt
    "Thorbecke",
    "John Stuart Mill",
    "Karl Marx",
    "Friedrich Engels",
    "Abraham Kuyper",
    "Herman Schaepman",
    "Otto von Bismarck",
    "Giuseppe Garibaldi",
    "Aletta Jacobs",
    "Wilhelmina Drucker"
  ],

  ka37: [
    "moderne propaganda",
    "massamedia",
    "radio",
    "film",
    "massabijeenkomsten",
    "NSDAP propaganda",
    "Joseph Goebbels",
    "massaorganisatie"
  ],

  // UITGEBREID MET PERSONEN
  ka38: [
    "totalitarisme",
    "fascisme",
    "nationaalsocialisme",
    "communisme",
    "dictatuur",
    // personen – totalitaire leiders en ideologen
    "Vladimir Lenin",
    "Josef Stalin",
    "Adolf Hitler",
    "Benito Mussolini",
    "Mao Zedong",
    "Kim Il-sung",
    "Pol Pot",
    "Francisco Franco",
    "Joseph Goebbels",
    "Heinrich Himmler"
  ],

  ka39: [
    "crisis wereldkapitalisme",
    "beurskrach 1929",
    "New Deal",
    "werkloosheid",
    "economische crisis",
    "interbellum",
    "massale armoede",
    "Franklin D. Roosevelt"
  ],
  ka40: [
    "Eerste Wereldoorlog",
    "Tweede Wereldoorlog",
    "loopgravenoorlog",
    "total war",
    "D-Day",
    "Barbarossa",
    "Hitler",
    "Churchill"
  ],
  ka41: [
    "racisme",
    "antisemitisme",
    "Holocaust",
    "genocide",
    "Wanhoopsconferentie",
    "concentratiekampen",
    "Auschwitz",
    "Shoah"
  ],
  ka42: [
    "Duitse bezetting Nederland",
    "NSB",
    "collaboratie",
    "verzet",
    "hongerwinter",
    "Dolle Dinsdag",
    "jodenvervolging",
    "geallieerde bevrijding"
  ],
  ka43: [
    "massavernietigingswapens",
    "bombardementen",
    "atoombom",
    "Dresden",
    "Hiroshima",
    "burgerbevolking oorlog",
    "strategisch bombardement",
    "luchtmacht"
  ],
  ka44: [
    "dekolonisatie",
    "anti-imperialisme",
    "India onafhankelijk",
    "Indonesische onafhankelijkheid",
    "Vietnamoorlog",
    "Afrikaanse onafhankelijkheid",
    "Gandhi",
    "Soekarno"
  ],

  // UITGEBREID MET PERSONEN
  ka45: [
    "koude oorlog",
    "wapenwedloop",
    "atoomdreiging",
    "NAVO",
    "warszawpact",
    "blokvorming",
    // personen – sleutelfiguren Koude Oorlog
    "Harry Truman",
    "Joseph Stalin",
    "Winston Churchill",
    "John F. Kennedy",
    "Nikita Chroesjtsjov",
    "Leonid Brezjnev",
    "Ronald Reagan",
    "Michail Gorbatsjov",
    "Mao Zedong",
    "Ho Chi Minh"
  ],

  ka46: [
    "dekolonisatie na 1945",
    "Indonesië",
    "Algerije",
    "Afrika",
    "Vietnam",
    "Bandung conferentie",
    "Non-aligned movement",
    "Soekarno"
  ],
  ka47: [
    "Europese eenwording",
    "EGKS",
    "EEG",
    "Europese Unie",
    "Schumanplan",
    "Verdrag van Maastricht",
    "Brussel",
    "euro"
  ],
  ka48: [
    "toenemende welvaart",
    "consumptiemaatschappij",
    "jeugdcultuur",
    "hippies",
    "emancipatie 1960",
    "seculiere samenleving",
    "massacultuur",
    "welvaartsstaat"
  ],
  ka49: [
    "pluriforme samenleving",
    "multiculturele samenleving",
    "migratie",
    "gastarbeiders",
    "postkoloniale migranten",
    "religieuze diversiteit",
    "integratie",
    "identiteit"
  ]
};

const DEFAULT_PRESETS = [
  {
    id: "all",
    label: "Vrij zoeken (geen KA-filter)",
    terms: []
  }
];

/**
 * Bouw 1 preset op basis van een KA-nummer (string of nummer).
 */
function buildKaPreset(kaRaw) {
  if (!kaRaw) return null;

  const kaStr = String(kaRaw).trim();
  const key = `ka${kaStr}`;
  const terms = PRESET_KA_TERMS[key];

  if (!terms || !Array.isArray(terms) || terms.length === 0) {
    return null;
  }

  return {
    id: key,
    label: `KA${kaStr}`,
    terms
  };
}

router.post("/search-preset", (req, res) => {
  try {
    const { ka } = req.body || {};

    // Als er een KA is opgegeven, gebruik die
    if (ka) {
      const preset = buildKaPreset(ka);
      if (!preset) {
        return res.json({ ok: true, presets: [] });
      }
      return res.json({ ok: true, presets: [preset] });
    }

    // Geen KA → generic fallback (frontend kan altijd nog eigen logica doen)
    return res.json({
      ok: true,
      presets: DEFAULT_PRESETS
    });
  } catch (err) {
    console.error("[a13.searchPreset] ERROR", err);
    res.status(500).json({
      ok: false,
      error: "Interne fout in search-preset"
    });
  }
});

module.exports = router;


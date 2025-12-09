// src/data/tvKaPresets.ts

export type TvKaOption = {
  tv: number;
  tvLabel: string;
  ka: string;      // alleen nummer, bv "22"
  kaLabel: string; // volledige beschrijving
};

export const tvKaOptions: TvKaOption[] = [
  // Tijdvak 1 – Tijd van jagers en boeren
  {
    tv: 1,
    tvLabel: "Tijdvak 1 – Tijd van jagers en boeren",
    ka: "1",
    kaLabel: "KA1 - De levenswijze van jagers-verzamelaars",
  },
  {
    tv: 1,
    tvLabel: "Tijdvak 1 – Tijd van jagers en boeren",
    ka: "2",
    kaLabel: "KA2 - Het ontstaan van landbouw en landbouwsamenlevingen",
  },
  {
    tv: 1,
    tvLabel: "Tijdvak 1 – Tijd van jagers en boeren",
    ka: "3",
    kaLabel: "KA3 - Het ontstaan van de eerste stedelijke gemeenschappen",
  },

  // Tijdvak 2 – Tijd van Grieken en Romeinen
  {
    tv: 2,
    tvLabel: "Tijdvak 2 – Tijd van Grieken en Romeinen",
    ka: "4",
    kaLabel:
      "KA4 - De ontwikkeling van wetenschappelijk denken en het denken over burgerschap en politiek in de Griekse stadstaat",
  },
  {
    tv: 2,
    tvLabel: "Tijdvak 2 – Tijd van Grieken en Romeinen",
    ka: "5",
    kaLabel: "KA5 - De klassieke vormentaal van de Grieks-Romeinse cultuur",
  },
  {
    tv: 2,
    tvLabel: "Tijdvak 2 – Tijd van Grieken en Romeinen",
    ka: "6",
    kaLabel:
      "KA6 - De groei van het Romeinse imperium waardoor de Grieks-Romeinse cultuur zich in Europa verspreidde",
  },
  {
    tv: 2,
    tvLabel: "Tijdvak 2 – Tijd van Grieken en Romeinen",
    ka: "7",
    kaLabel:
      "KA7 - De confrontatie tussen de Grieks-Romeinse cultuur en de Germaanse cultuur van Noordwest-Europa",
  },
  {
    tv: 2,
    tvLabel: "Tijdvak 2 – Tijd van Grieken en Romeinen",
    ka: "8",
    kaLabel:
      "KA8 - De ontwikkeling van het jodendom en het christendom als de eerste monotheïstische godsdiensten",
  },

  // Tijdvak 3 – Tijd van monniken en ridders
  {
    tv: 3,
    tvLabel: "Tijdvak 3 – Tijd van monniken en ridders",
    ka: "9",
    kaLabel: "KA9 - De verspreiding van het christendom in geheel Europa",
  },
  {
    tv: 3,
    tvLabel: "Tijdvak 3 – Tijd van monniken en ridders",
    ka: "10",
    kaLabel: "KA10 - Het ontstaan en de verspreiding van de islam",
  },
  {
    tv: 3,
    tvLabel: "Tijdvak 3 – Tijd van monniken en ridders",
    ka: "11",
    kaLabel:
      "KA11 - De vrijwel volledige vervanging in West-Europa van de agrarisch-urbane cultuur door een zelfvoorzienende agrarische cultuur, georganiseerd via hofstelsel en horigheid",
  },
  {
    tv: 3,
    tvLabel: "Tijdvak 3 – Tijd van monniken en ridders",
    ka: "12",
    kaLabel: "KA12 - Het ontstaan van feodale verhoudingen in het bestuur",
  },

  // Tijdvak 4 – Tijd van steden en staten
  {
    tv: 4,
    tvLabel: "Tijdvak 4 – Tijd van steden en staten",
    ka: "13",
    kaLabel:
      "KA13 - De opkomst van handel en ambacht die de basis legde voor het herleven van een agrarisch-urbane samenleving",
  },
  {
    tv: 4,
    tvLabel: "Tijdvak 4 – Tijd van steden en staten",
    ka: "14",
    kaLabel:
      "KA14 - De opkomst van de stedelijke burgerij en de toenemende zelfstandigheid van steden",
  },
  {
    tv: 4,
    tvLabel: "Tijdvak 4 – Tijd van steden en staten",
    ka: "15",
    kaLabel:
      "KA15 - Het conflict in de christelijke wereld over de vraag of de wereldlijke dan wel de geestelijke macht het primaat behoorde te hebben",
  },
  {
    tv: 4,
    tvLabel: "Tijdvak 4 – Tijd van steden en staten",
    ka: "16",
    kaLabel:
      "KA16 - De expansie van de christelijke wereld naar buiten toe, onder andere in de vorm van kruistochten",
  },
  {
    tv: 4,
    tvLabel: "Tijdvak 4 – Tijd van steden en staten",
    ka: "17",
    kaLabel: "KA17 - Het begin van staatsvorming en centralisatie",
  },

  // Tijdvak 5 – Tijd van ontdekkers en hervormers
  {
    tv: 5,
    tvLabel: "Tijdvak 5 – Tijd van ontdekkers en hervormers",
    ka: "18",
    kaLabel: "KA18 - Het begin van de Europese overzeese expansie",
  },
  {
    tv: 5,
    tvLabel: "Tijdvak 5 – Tijd van ontdekkers en hervormers",
    ka: "19",
    kaLabel:
      "KA19 - Het veranderende mens- en wereldbeeld van de renaissance en het begin van een nieuwe wetenschappelijke belangstelling",
  },
  {
    tv: 5,
    tvLabel: "Tijdvak 5 – Tijd van ontdekkers en hervormers",
    ka: "20",
    kaLabel:
      "KA20 - De hernieuwde oriëntatie op het erfgoed van de klassieke Oudheid",
  },
  {
    tv: 5,
    tvLabel: "Tijdvak 5 – Tijd van ontdekkers en hervormers",
    ka: "21",
    kaLabel:
      "KA21 - De protestantse reformatie die splitsing van de christelijke kerk in West-Europa tot gevolg had",
  },
  {
    tv: 5,
    tvLabel: "Tijdvak 5 – Tijd van ontdekkers en hervormers",
    ka: "22",
    kaLabel:
      "KA22 - Het conflict in de Nederlanden dat resulteerde in de stichting van een Nederlandse staat",
  },

  // Tijdvak 6 – Tijd van regenten en vorsten
  {
    tv: 6,
    tvLabel: "Tijdvak 6 – Tijd van regenten en vorsten",
    ka: "23",
    kaLabel: "KA23 - Het streven van vorsten naar absolute macht",
  },
  {
    tv: 6,
    tvLabel: "Tijdvak 6 – Tijd van regenten en vorsten",
    ka: "24",
    kaLabel:
      "KA24 - De bijzondere plaats in staatkundig opzicht en de bloei in economisch en cultureel opzicht van de Nederlandse Republiek",
  },
  {
    tv: 6,
    tvLabel: "Tijdvak 6 – Tijd van regenten en vorsten",
    ka: "25",
    kaLabel:
      "KA25 - Wereldwijde handelscontacten, handelskapitalisme en het begin van een wereldeconomie",
  },
  {
    tv: 6,
    tvLabel: "Tijdvak 6 – Tijd van regenten en vorsten",
    ka: "26",
    kaLabel: "KA26 - De wetenschappelijke revolutie",
  },

  // Tijdvak 7 – Tijd van pruiken en revoluties
  {
    tv: 7,
    tvLabel: "Tijdvak 7 – Tijd van pruiken en revoluties",
    ka: "27",
    kaLabel:
      "KA27 - Rationeel optimisme en ‘verlicht denken’ dat werd toegepast op alle terreinen van de samenleving: godsdienst, politiek, economie en sociale verhoudingen",
  },
  {
    tv: 7,
    tvLabel: "Tijdvak 7 – Tijd van pruiken en revoluties",
    ka: "28",
    kaLabel:
      "KA28 - Voortbestaan van het ancien régime met pogingen om het vorstelijk bestuur op eigentijdse verlichte wijze vorm te geven (verlicht absolutisme)",
  },
  {
    tv: 7,
    tvLabel: "Tijdvak 7 – Tijd van pruiken en revoluties",
    ka: "29",
    kaLabel:
      "KA29 - Uitbouw van de Europese overheersing, met name in de vorm van plantagekoloniën en de daarmee verbonden trans-Atlantische slavenhandel en de opkomst van het abolitionisme",
  },
  {
    tv: 7,
    tvLabel: "Tijdvak 7 – Tijd van pruiken en revoluties",
    ka: "30",
    kaLabel:
      "KA30 - De democratische revoluties in westerse landen met als gevolg discussies over grondwetten, grondrechten en staatsburgerschap",
  },

  // Tijdvak 8 – Tijd van burgers en stoommachines
  {
    tv: 8,
    tvLabel: "Tijdvak 8 – Tijd van burgers en stoommachines",
    ka: "31",
    kaLabel:
      "KA31 - De industriële revolutie die in de westerse wereld de basis legde voor een industriële samenleving",
  },
  {
    tv: 8,
    tvLabel: "Tijdvak 8 – Tijd van burgers en stoommachines",
    ka: "32",
    kaLabel:
      "KA32 - Discussies over de ‘sociale kwestie’",
  },
  {
    tv: 8,
    tvLabel: "Tijdvak 8 – Tijd van burgers en stoommachines",
    ka: "33",
    kaLabel:
      "KA33 - De moderne vorm van imperialisme die verband hield met de industrialisatie",
  },
  {
    tv: 8,
    tvLabel: "Tijdvak 8 – Tijd van burgers en stoommachines",
    ka: "34",
    kaLabel:
      "KA34 - De opkomst van emancipatiebewegingen",
  },
  {
    tv: 8,
    tvLabel: "Tijdvak 8 – Tijd van burgers en stoommachines",
    ka: "35",
    kaLabel:
      "KA35 - Voortschrijdende democratisering, met deelname van steeds meer mannen en vrouwen aan het politieke proces",
  },
  {
    tv: 8,
    tvLabel: "Tijdvak 8 – Tijd van burgers en stoommachines",
    ka: "36",
    kaLabel:
      "KA36 - De opkomst van politiek-maatschappelijke stromingen: liberalisme, nationalisme, socialisme, confessionalisme en feminisme",
  },

  // Tijdvak 9 – Tijd van de wereldoorlogen
  {
    tv: 9,
    tvLabel: "Tijdvak 9 – Tijd van de wereldoorlogen",
    ka: "37",
    kaLabel:
      "KA37 - De rol van moderne propaganda- en communicatiemiddelen en vormen van massaorganisatie",
  },
  {
    tv: 9,
    tvLabel: "Tijdvak 9 – Tijd van de wereldoorlogen",
    ka: "38",
    kaLabel:
      "KA38 - Het in praktijk brengen van de totalitaire ideologieën communisme en fascisme/nationaalsocialisme",
  },
  {
    tv: 9,
    tvLabel: "Tijdvak 9 – Tijd van de wereldoorlogen",
    ka: "39",
    kaLabel: "KA39 - De crisis van het wereldkapitalisme",
  },
  {
    tv: 9,
    tvLabel: "Tijdvak 9 – Tijd van de wereldoorlogen",
    ka: "40",
    kaLabel: "KA40 - Het voeren van twee wereldoorlogen",
  },
  {
    tv: 9,
    tvLabel: "Tijdvak 9 – Tijd van de wereldoorlogen",
    ka: "41",
    kaLabel:
      "KA41 - Racisme en discriminatie die leidden tot genocide, in het bijzonder op de joden",
  },
  {
    tv: 9,
    tvLabel: "Tijdvak 9 – Tijd van de wereldoorlogen",
    ka: "42",
    kaLabel: "KA42 - De Duitse bezetting van Nederland",
  },
  {
    tv: 9,
    tvLabel: "Tijdvak 9 – Tijd van de wereldoorlogen",
    ka: "43",
    kaLabel:
      "KA43 - Verwoestingen op niet eerder vertoonde schaal door massavernietigingswapens en de betrokkenheid van de burgerbevolking bij oorlogvoering",
  },
  {
    tv: 9,
    tvLabel: "Tijdvak 9 – Tijd van de wereldoorlogen",
    ka: "44",
    kaLabel:
      "KA44 - Vormen van verzet tegen het West-Europese imperialisme",
  },

  // Tijdvak 10 – Tijd van televisie en computers
  {
    tv: 10,
    tvLabel: "Tijdvak 10 – Tijd van televisie en computers",
    ka: "45",
    kaLabel:
      "KA45 - De verdeling van de wereld in twee ideologische blokken in de greep van een wapenwedloop en de daaruit voortvloeiende dreiging van een atoomoorlog",
  },
  {
    tv: 10,
    tvLabel: "Tijdvak 10 – Tijd van televisie en computers",
    ka: "46",
    kaLabel:
      "KA46 - De dekolonisatie die een eind maakte aan de westerse hegemonie in de wereld",
  },
  {
    tv: 10,
    tvLabel: "Tijdvak 10 – Tijd van televisie en computers",
    ka: "47",
    kaLabel: "KA47 - De eenwording van Europa",
  },
  {
    tv: 10,
    tvLabel: "Tijdvak 10 – Tijd van televisie en computers",
    ka: "48",
    kaLabel:
      "KA48 - De toenemende westerse welvaart die vanaf de jaren zestig van de twintigste eeuw aanleiding gaf tot ingrijpende sociaal-culturele veranderingsprocessen",
  },
  {
    tv: 10,
    tvLabel: "Tijdvak 10 – Tijd van televisie en computers",
    ka: "49",
    kaLabel:
      "KA49 - De ontwikkeling van pluriforme en multiculturele samenlevingen",
  },
];


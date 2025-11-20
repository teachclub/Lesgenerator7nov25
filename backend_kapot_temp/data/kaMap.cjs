// backend/data/kaMap.cjs
// Statische mapping Tijdvakken / KA's → zoekwoorden
module.exports = {
  TV5: {
    code: "TV5",
    label: "Ontdekkers en Hervormers (1500–1600)",
    ka: [
      {
        id: 18,
        label: "Europese expansie",
        kleioKeywords: ["Ontdekkingsreizen", "Europese expansie", "Kolonisatie"]
      },
      {
        id: 19,
        label: "Renaissance / mens- en wereldbeeld",
        kleioKeywords: ["Renaissance", "Humanisme", "Wereldbeeld"]
      },
      {
        id: 20,
        label: "Oriëntatie op klassieke oudheid",
        kleioKeywords: ["Renaissance", "Humanisme"]
      },
      {
        id: 21,
        label: "Reformatie / splitsing kerk",
        kleioKeywords: ["Reformatie / Hervorming", "Reformation", "Protestantism", "Martin Luther", "John Calvin"]
      },
      {
        id: 22,
        label: "Nederlandse Opstand",
        kleioKeywords: ["Opstand / Tachtigjarige Oorlog", "Dutch Revolt", "Eighty Years' War", "Willem van Oranje", "Duke of Alba"]
      }
    ]
  },
  TV9: {
    code: "TV9",
    label: "Wereldoorlogen (1900–1950)",
    ka: [
      {
        id: 37,
        label: "Moderne propaganda / totalitaire ideologieën",
        kleioKeywords: ["Totalitarisme", "Fascisme", "Nationaalsocialisme", "Communisme", "Propaganda"]
      },
      {
        id: 38,
        label: "Crisis van het wereldkapitalisme",
        kleioKeywords: ["Beurskrach", "Grote Depressie", "Economische crisis"]
      },
      {
        id: 39,
        label: "Wereldoorlogen",
        kleioKeywords: ["Eerste Wereldoorlog", "Tweede Wereldoorlog", "World War I", "World War II"]
      },
      {
        id: 40,
        label: "Genocide / Holocaust",
        kleioKeywords: ["Genocide", "Holocaust", "Shoah"]
      },
      {
        id: 41,
        label: "De Duitse bezetting van Nederland",
        kleioKeywords: [
          "Duitse bezetting",
          "Bezet Nederland",
          "Occupation Netherlands",
          "NSB",
          "LO en LKP"
        ]
      },
      {
        id: 42,
        label: "Vormen van verzet en collaboratie",
        kleioKeywords: ["Verzet", "Collaboratie", "Resistance", "Collaboration"]
      }
    ]
  },
  TV10: {
    code: "TV10",
    label: "Televisie en Computer (1950–heden)",
    ka: [
      {
        id: 43,
        label: "Dekolonisatie",
        kleioKeywords: ["Dekolonisatie", "Koloniale oorlog", "Vietnamoorlog"]
      },
      {
        id: 44,
        label: "Koude Oorlog",
        kleioKeywords: ["Koude Oorlog", "Cold War", "DDR", "BRD", "Trumandoctrine", "Breznjevdoctrine"]
      },
      {
        id: 45,
        label: "Europese integratie",
        kleioKeywords: ["Europese Unie", "EU", "Europese integratie"]
      },
      {
        id: 46,
        label: "Welvaart en sociaal-culturele veranderingen",
        kleioKeywords: [
          "Wederopbouw",
          "Gastarbeiders",
          "Jongerenculturen",
          "Secularisatie",
          "Ontkerkelijking",
          "Multiculturele samenleving",
          "Tweede feministische golf",
          "Amerikanisering"
        ]
      },
      {
        id: 47,
        label: "Globalisering",
        kleioKeywords: ["Globalisering", "Wereldeconomie", "Globalization"]
      }
    ]
  }
  // (Je kunt hier zelf TV1-4 en TV7-8 aanvullen)
};

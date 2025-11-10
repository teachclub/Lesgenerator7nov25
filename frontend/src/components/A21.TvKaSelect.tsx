import React from 'react';

const TIJDVAKKEN = [
  { id: 'tv1', naam: 'Tijdvak 1: Jagers en Boeren' },
  { id: 'tv2', naam: 'Tijdvak 2: Grieken en Romeinen' },
  { id: 'tv3', naam: 'Tijdvak 3: Monniken en Ridders' },
  { id: 'tv4', naam: 'Tijdvak 4: Steden en Staten' },
  { id: 'tv5', naam: 'Tijdvak 5: Ontdekkers en Hervormers' },
  { id: 'tv6', naam: 'Tijdvak 6: Regenten en Vorsten' },
  { id: 'tv7', naam: 'Tijdvak 7: Pruiken en Revoluties' },
  { id: 'tv8', naam: 'Tijdvak 8: Burgers en Stoommachines' },
  { id: 'tv9', naam: 'Tijdvak 9: Wereldoorlogen' },
  { id: 'tv10', naam: 'Tijdvak 10: Televisie en Computer' },
];

const KENMERKENDE_ASPECTEN = {
  tv1: [
    { id: 'ka1', naam: '1. De levenswijze van jagers-verzamelaars' },
    { id: 'ka2', naam: '2. Het ontstaan van landbouw en landbouwsamenlevingen' },
    { id: 'ka3', naam: '3. Het ontstaan van de eerste stedelijke gemeenschappen' },
  ],
  tv2: [
    { id: 'ka4', naam: '4. De ontwikkeling van wetenschappelijk denken en het denken over burgerschap en politiek in de Griekse stadstaat' },
    { id: 'ka5', naam: '5. De klassieke vormentaal van de Grieks-Romeinse cultuur' },
    { id: 'ka6', naam: '6. De groei van het Romeinse imperium waardoor de Grieks-Romeinse cultuur zich in Europa verspreidde' },
    { id: 'ka7', naam: '7. De confrontatie tussen de Grieks-Romeinse cultuur en de Germaanse cultuur van Noordwest-Europa' },
    { id: 'ka8', naam: '8. De ontwikkeling van het jodendom en het christendom als de eerste monotheïstische godsdiensten' },
  ],
  tv3: [
    { id: 'ka9', naam: '9. De verspreiding van het christendom in geheel Europa' },
    { id: 'ka10', naam: '10. Het ontstaan en de verspreiding van de islam' },
    { id: 'ka11', naam: '11. De vrijwel volledige vervanging in West-Europa van de agrarisch-urbane cultuur door een zelfvoorzienende agrarische cultuur, georganiseerd via hofstelsel en horigheid' },
    { id: 'ka12', naam: '12. Het ontstaan van feodale verhoudingen in het bestuur' },
  ],
  tv4: [
    { id: 'ka13', naam: '13. De opkomst van handel en ambacht die de basis legde voor het herleven van een agrarisch-urbane samenleving' },
    { id: 'ka14', naam: '14. De opkomst van de stedelijke burgerij en de toenemende zelfstandigheid van steden' },
    { id: 'ka15', naam: '15. Het conflict in de christelijke wereld over de vraag of de wereldlijke dan wel de geestelijke macht het primaat behoorde te hebben' },
    { id: 'ka16', naam: '16. De expansie van de christelijke wereld naar buiten toe, onder andere in de vorm van de kruistochten' },
    { id: 'ka17', naam: '17. Het begin van staatsvorming en centralisatie' },
  ],
  tv5: [
    { id: 'ka18', naam: '18. Het begin van de Europese overzeese expansie' },
    { id: 'ka19', naam: '19. Het veranderende mens- en wereldbeeld van de renaissance en het begin van een nieuwe wetenschappelijke belangstelling' },
    { id: 'ka20', naam: '20. De hernieuwde oriëntatie op het erfgoed van de klassieke oudheid' },
    { id: 'ka21', naam: '21. De protestantse Reformatie die splitsing van de christelijke kerk in West-Europa tot gevolg had' },
  ],
  tv6: [
    { id: 'ka22', naam: '22. Het conflict in de Nederlanden dat resulteerde in de stichting van een Nederlandse staat' },
    { id: 'ka23', naam: '23. Het streven van vorsten naar absolute macht' },
    { id: 'ka24', naam: '24. De bijzondere plaats in staatkundig opzicht en de bloei in economisch en cultureel opzicht van de Nederlandse Republiek' },
    { id: 'ka25', naam: '25. Wereldwijde handelscontacten, handelskapitalisme en het begin van een wereldeconomie' },
    { id: 'ka26', naam: '26. De wetenschappelijke revolutie' },
  ],
  tv7: [
    { id: 'ka27', naam: '27. Rationeel optimisme en ‘verlicht denken’ dat werd toegepast op alle terreinen van de samenleving: godsdienst, politiek, economie en sociale verhoudingen' },
    { id: 'ka28', naam: '28. Voortbestaan van het ancien régime met pogingen om het vorstelijk bestuur op eigentijdse verlichte wijze vorm te geven (verlicht absolutisme)' },
    { id: 'ka29', naam: '29. Uitbouw van de Europese overheersing, met name in de vorm van plantagekoloniën en de daarmee verbonden trans-Atlantische slavenhandel, en de opkomst van het abolitionisme' },
    { id: 'ka30', naam: '30. De democratische revoluties in westerse landen met als gevolg discussies over grondwetten, grondrechten en staatsburgerschap' },
  ],
  tv8: [
    { id: 'ka31', naam: '31. De industriële revolutie die in de westerse wereld de basis legde voor een industriële samenleving' },
    { id: 'ka32', naam: '32. Discussies over de ‘sociale kwestie’' },
    { id: 'ka33', naam: '33. De moderne vorm van imperialisme die verband hield met de industrialisatie' },
    { id: 'ka34', naam: '34. De opkomst van emancipatiebewegingen' },
    { id: 'ka35', naam: '35. Voortschrijdende democratisering, met deelname van steeds meer mannen en vrouwen aan het politieke proces' },
    { id: 'ka36', naam: '36. De opkomst van politiek-maatschappelijke stromingen: liberalisme, nationalisme, socialisme, confessionalisme en feminisme' },
  ],
  tv9: [
    { id: 'ka37', naam: '37. De rol van moderne propaganda- en communicatiemiddelen en vormen van massaorganisatie' },
    { id: 'ka38', naam: '38. Het in praktijk brengen van de totalitaire ideologieën communisme en fascisme/nationaalsocialisme' },
    { id: 'ka39', naam: '39. De crisis van het wereldkapitalisme' },
    { id: 'ka40', naam: '40. Het voeren van twee wereldoorlogen' },
    { id: 'ka41', naam: '41. Racisme en discriminatie die leidden tot genocide, in het bijzonder op de joden' },
    { id: 'ka42', naam: '42. De Duitse bezetting van Nederland' },
    { id: 'ka43', naam: '43. Verwoestingen op niet eerder vertoonde schaal door massavernietigingswapens en de betrokkenheid van de burgerbevolking bij oorlogvoering' },
    { id: 'ka44', naam: '44. Vormen van verzet tegen het West-Europese imperialisme' },
  ],
  tv10: [
    { id: 'ka45', naam: '45. De verdeling van de wereld in twee ideologische blokken in de greep van een wapenwedloop en de daaruit voortvloeide dreiging van een atoomoorlog' },
    { id: 'ka46', naam: '46. De dekolonisatie die een eind maakte aan de westerse heerschappij in de wereld' },
    { id: 'ka47', naam: '47. De eenwording van Europa' },
    { id: 'ka48', naam: '48. De toenemende westerse welvaart die vanaf de jaren 1960 aanleiding gaf tot ingrijpende sociaal-culturele veranderingsprocessen' },
    { id: 'ka49', naam: '49. De ontwikkeling van pluriforme en multiculturele samenlevingen' },
  ],
};

interface TvKaSelectProps {
  selectedTv: string;
  onTvChange: (tvId: string) => void;
  selectedKa: string;
  onKaChange: (kaId: string) => void;
  disabled: boolean;
}

export function A21TvKaSelect({
  selectedTv,
  onTvChange,
  selectedKa,
  onKaChange,
  disabled,
}: TvKaSelectProps) {
  
  const handleTvChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTvId = e.target.value;
    onTvChange(newTvId);
    onKaChange(''); 
  };

  const beschikbareKas = KENMERKENDE_ASPECTEN[selectedTv as keyof typeof KENMERKENDE_ASPECTEN] || [];

  return (
    <div className="tv-ka-select-a21">
      <select
        value={selectedTv}
        onChange={handleTvChange}
        disabled={disabled}
        aria-label="Selecteer Tijdvak"
      >
        <option value="">-- Selecteer een Tijdvak --</option>
        {TIJDVAKKEN.map((tv) => (
          <option key={tv.id} value={tv.id}>
            {tv.naam}
          </option>
        ))}
      </select>

      <select
        value={selectedKa}
        onChange={(e) => onKaChange(e.target.value)}
        disabled={disabled || !selectedTv}
        aria-label="Selecteer Kenmerkend Aspect"
      >
        <option value="">-- Selecteer een Kenmerkend Aspect --</option>
        {beschikbareKas.map((ka) => (
          <option key={ka.id} value={ka.id}>
            {ka.naam}
          </option>
        ))}
      </select>
    </div>
  );
}

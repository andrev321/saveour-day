import type { InvitationLocale } from "./index.ts";

type PersonalExample = { names: string; title: string; body: string };
// Fictional people; no real contact details are included in starter content.
const examples: Record<InvitationLocale, Record<string, PersonalExample>> = {
  "pl-PL": {
    wedding: {
      names: "Anna & Jan",
      title: "Bierzemy ślub!",
      body: "Anna i Jan zapraszają Was na ceremonię ślubu. Chcemy powiedzieć sobie „tak” w gronie najbliższych.",
    },
    reception: {
      names: "Anna & Jan",
      title: "Świętujcie z nami!",
      body: "Tu Anna i Jan! Zapraszamy na nasze wesele — wieczór pełen tańca, rozmów i wspólnych wspomnień.",
    },
    "wedding-reception": {
      names: "Anna & Jan",
      title: "Razem zaczyna się wszystko",
      body: "Anna i Jan zapraszają Was na swój ślub i wesele. Bądźcie z nami podczas ceremonii, a potem świętujmy razem do późna!",
    },
    birthday: {
      names: "Zofia",
      title: "Moje 30. urodziny",
      body: "Cześć, tu Zofia! Kończę 30 lat i chcę uczcić ten dzień z Wami. Zapraszam na tort, muzykę i wieczór w dobrym towarzystwie.",
    },
    anniversary: {
      names: "Maria & Piotr",
      title: "25 lat razem",
      body: "Maria i Piotr zapraszają na srebrne gody. Świętujcie z nami 25 lat małżeństwa, rodzinnych historii i wspólnych marzeń.",
    },
    "family-ceremony": {
      names: "Chrzest Zosi",
      title: "Ważny dzień naszej córki",
      body: "Katarzyna i Michał zapraszają na chrzest swojej córki Zosi. Po ceremonii spotkajmy się przy rodzinnym stole.",
    },
    "baby-shower": {
      names: "Baby shower Julii",
      title: "Czekamy na małego Leona",
      body: "Julia już niedługo zostanie mamą Leona! Spotkajmy się, by otoczyć ją ciepłem, podzielić się dobrymi życzeniami i wspólnie świętować.",
    },
    housewarming: {
      names: "Alicja & Tomasz",
      title: "Nowy dom, wspólne wspomnienia",
      body: "Alicja i Tomasz zapraszają na parapetówkę! Kartony już rozpakowane — brakuje tylko Was. Wpadnijcie na przekąski i pierwszy wspólny wieczór w naszym nowym domu.",
    },
  },
  "en-GB": {
    wedding: {
      names: "Emma & Liam",
      title: "We are getting married!",
      body: "Emma and Liam invite you to their wedding ceremony. Join our closest friends and family as we say ‘I do’.",
    },
    reception: {
      names: "Emma & Liam",
      title: "Celebrate with us!",
      body: "Emma and Liam invite you to their wedding reception — an evening of dancing, conversation and happy memories.",
    },
    "wedding-reception": {
      names: "Emma & Liam",
      title: "Together is where it all begins",
      body: "Emma and Liam invite you to their wedding and reception. Be with us for the ceremony, then celebrate with us into the evening!",
    },
    birthday: {
      names: "Sophie",
      title: "My 30th birthday",
      body: "Hi, it’s Sophie! I’m turning 30 and would love to celebrate with you. Join me for cake, music and an evening with friends.",
    },
    anniversary: {
      names: "Mary & Peter",
      title: "25 years together",
      body: "Mary and Peter invite you to their silver wedding anniversary. Join us to celebrate 25 years of marriage, family stories and shared dreams.",
    },
    "family-ceremony": {
      names: "Grace’s baptism",
      title: "A special day for our daughter",
      body: "Kate and Michael invite you to the baptism of their daughter Grace. Please join us for a family meal after the ceremony.",
    },
    "baby-shower": {
      names: "Julia’s baby shower",
      title: "Waiting for little Leo",
      body: "Julia will soon welcome baby Leo! Let’s gather to celebrate with her, share our good wishes and enjoy an afternoon together.",
    },
    housewarming: {
      names: "Alice & Thomas",
      title: "A new home, new memories",
      body: "Alice and Thomas invite you to their housewarming! The boxes are unpacked — all that’s missing is you. Join us for snacks and our first evening with friends in our new home.",
    },
  },
  "de-DE": {
    wedding: {
      names: "Lena & Jonas",
      title: "Wir heiraten!",
      body: "Lena und Jonas laden euch zu ihrer Trauung ein. Seid dabei, wenn wir im Kreis unserer Liebsten Ja sagen.",
    },
    reception: {
      names: "Lena & Jonas",
      title: "Feiert mit uns!",
      body: "Lena und Jonas laden euch zu ihrer Hochzeitsfeier ein — ein Abend voller Tanz, Gespräche und schöner Erinnerungen.",
    },
    "wedding-reception": {
      names: "Lena & Jonas",
      title: "Gemeinsam beginnt alles",
      body: "Lena und Jonas laden euch zu ihrer Trauung und Hochzeitsfeier ein. Begleitet uns bei der Zeremonie und feiert danach mit uns bis spät in den Abend!",
    },
    birthday: {
      names: "Sophie",
      title: "Mein 30. Geburtstag",
      body: "Hallo, hier ist Sophie! Ich werde 30 und möchte diesen Tag mit euch feiern. Freut euch auf Kuchen, Musik und einen Abend unter Freunden.",
    },
    anniversary: {
      names: "Maria & Peter",
      title: "25 Jahre gemeinsam",
      body: "Maria und Peter laden euch zu ihrer Silberhochzeit ein. Feiert mit uns 25 Ehejahre voller Familiengeschichten und gemeinsamer Träume.",
    },
    "family-ceremony": {
      names: "Emmas Taufe",
      title: "Ein besonderer Tag für unsere Tochter",
      body: "Katharina und Michael laden euch zur Taufe ihrer Tochter Emma ein. Nach der Zeremonie freuen wir uns auf ein gemeinsames Familienessen.",
    },
    "baby-shower": {
      names: "Julias Babyparty",
      title: "Wir warten auf den kleinen Leon",
      body: "Julia wird bald Mama von Leon! Lasst uns gemeinsam feiern, gute Wünsche teilen und einen schönen Nachmittag miteinander verbringen.",
    },
    housewarming: {
      names: "Anna & Thomas",
      title: "Neues Zuhause, neue Erinnerungen",
      body: "Anna und Thomas laden euch zur Einweihungsfeier ein! Die Kartons sind ausgepackt — jetzt fehlt nur noch ihr. Kommt zu Snacks und einem gemütlichen Abend in unserem neuen Zuhause.",
    },
  },
};

export function personalTemplateExample(id: string, locale: InvitationLocale) {
  return examples[locale][id];
}

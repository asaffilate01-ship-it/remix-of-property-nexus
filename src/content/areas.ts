export type Area = {
  slug: string;
  name: string;
  city: string;
  postcode: string;
  price: string;
  rent: string;
  yield: string;
  schools: number;
  transport: number;
  safety: number;
  trend: number;
  intro: string;
  highlights: string[];
  schoolsList: { name: string; rating: string; type: string }[];
  transportList: { name: string; mins: string }[];
  priceTrend: { year: string; value: number }[];
};

export const AREAS: Area[] = [
  {
    slug: "marylebone-w1",
    name: "Marylebone, W1",
    city: "London",
    postcode: "W1U",
    price: "£1.92M",
    rent: "£3,400",
    yield: "2.1%",
    schools: 92,
    transport: 98,
    safety: 84,
    trend: 6.2,
    intro:
      "Marylebone pairs Georgian elegance with one of central London's most curated high streets. Buyers come for the lateral mansion-block apartments, the village feel and rapid access to the City and West End.",
    highlights: [
      "Marylebone High Street — boutiques, delis, Daunt Books",
      "Regent's Park on the doorstep",
      "Walkable to Mayfair, Fitzrovia and the West End",
      "Strong international buyer demand and rental yields for short-let zoned blocks",
    ],
    schoolsList: [
      { name: "St Marylebone CofE", rating: "Outstanding", type: "Secondary" },
      { name: "Hampden Gurney CofE", rating: "Outstanding", type: "Primary" },
      { name: "Wetherby Senior", rating: "Independent", type: "Secondary" },
    ],
    transportList: [
      { name: "Bond Street (Elizabeth Line)", mins: "4 min" },
      { name: "Marylebone Station", mins: "6 min" },
      { name: "Baker Street", mins: "5 min" },
    ],
    priceTrend: [
      { year: "2021", value: 1690000 },
      { year: "2022", value: 1740000 },
      { year: "2023", value: 1810000 },
      { year: "2024", value: 1860000 },
      { year: "2025", value: 1920000 },
    ],
  },
  {
    slug: "chorlton-m21",
    name: "Chorlton, M21",
    city: "Manchester",
    postcode: "M21",
    price: "£452K",
    rent: "£1,650",
    yield: "4.4%",
    schools: 88,
    transport: 76,
    safety: 78,
    trend: 4.1,
    intro:
      "South Manchester's creative village: independent cafés, leafy meres and a young-professional rental pool that keeps demand high year-round.",
    highlights: [
      "Beech Road bars and brunch scene",
      "Easy commute to Oxford Road universities",
      "Chorlton Meadows and Mersey Valley parkland",
      "Strong yields on 2–3 bed terraces",
    ],
    schoolsList: [
      { name: "Chorlton Park Primary", rating: "Good", type: "Primary" },
      { name: "Chorlton High", rating: "Good", type: "Secondary" },
      { name: "Manchester Communication Academy", rating: "Good", type: "Secondary" },
    ],
    transportList: [
      { name: "Chorlton Metrolink", mins: "8 min" },
      { name: "Manchester Piccadilly", mins: "18 min" },
      { name: "MediaCityUK", mins: "22 min" },
    ],
    priceTrend: [
      { year: "2021", value: 365000 },
      { year: "2022", value: 395000 },
      { year: "2023", value: 420000 },
      { year: "2024", value: 438000 },
      { year: "2025", value: 452000 },
    ],
  },
  {
    slug: "clifton-bs8",
    name: "Clifton, BS8",
    city: "Bristol",
    postcode: "BS8",
    price: "£685K",
    rent: "£2,100",
    yield: "3.7%",
    schools: 91,
    transport: 82,
    safety: 86,
    trend: 5.0,
    intro:
      "Bristol's grandest postcode — Georgian crescents above the gorge, top schools and a university-anchored rental market.",
    highlights: [
      "Clifton Suspension Bridge & Downs",
      "Catchment for Clifton College and QEH",
      "10-minute drive to Temple Meads",
      "Strong professional rental pool",
    ],
    schoolsList: [
      { name: "Clifton College", rating: "Independent", type: "Secondary" },
      { name: "QEH", rating: "Independent", type: "Secondary" },
      { name: "Christchurch CofE", rating: "Outstanding", type: "Primary" },
    ],
    transportList: [
      { name: "Bristol Temple Meads", mins: "12 min" },
      { name: "M5 Junction 19", mins: "20 min" },
      { name: "Bristol Airport", mins: "30 min" },
    ],
    priceTrend: [
      { year: "2021", value: 560000 },
      { year: "2022", value: 605000 },
      { year: "2023", value: 640000 },
      { year: "2024", value: 665000 },
      { year: "2025", value: 685000 },
    ],
  },
  {
    slug: "jesmond-ne2",
    name: "Jesmond, NE2",
    city: "Newcastle",
    postcode: "NE2",
    price: "£385K",
    rent: "£1,450",
    yield: "4.5%",
    schools: 86,
    transport: 79,
    safety: 81,
    trend: 3.4,
    intro:
      "Newcastle's prime professional suburb — Edwardian terraces, walkable cafés and a student-heavy rental market with year-round occupancy.",
    highlights: [
      "Jesmond Dene park",
      "Strong student rental demand",
      "Metro into the city in 4 minutes",
      "Independent restaurants on Acorn Road",
    ],
    schoolsList: [
      { name: "Central Newcastle High", rating: "Independent", type: "Secondary" },
      { name: "West Jesmond Primary", rating: "Outstanding", type: "Primary" },
      { name: "Royal Grammar School", rating: "Independent", type: "Secondary" },
    ],
    transportList: [
      { name: "Jesmond Metro", mins: "4 min to city" },
      { name: "Newcastle Central", mins: "8 min" },
      { name: "Newcastle Airport", mins: "20 min" },
    ],
    priceTrend: [
      { year: "2021", value: 320000 },
      { year: "2022", value: 340000 },
      { year: "2023", value: 360000 },
      { year: "2024", value: 372000 },
      { year: "2025", value: 385000 },
    ],
  },
  {
    slug: "kelvinbridge-g12",
    name: "Kelvinbridge, G12",
    city: "Glasgow",
    postcode: "G12",
    price: "£298K",
    rent: "£1,250",
    yield: "5.0%",
    schools: 84,
    transport: 88,
    safety: 75,
    trend: 4.8,
    intro:
      "Glasgow's West End at its most romantic: tenement flats, Botanic Gardens and a transport-rich postcode that posts some of the city's strongest yields.",
    highlights: [
      "Byres Road & Ashton Lane",
      "University of Glasgow",
      "Kelvingrove Park & Museum",
      "Subway and rail in walking distance",
    ],
    schoolsList: [
      { name: "Hillhead High", rating: "Good", type: "Secondary" },
      { name: "Hillhead Primary", rating: "Good", type: "Primary" },
      { name: "Glasgow Academy", rating: "Independent", type: "Secondary" },
    ],
    transportList: [
      { name: "Kelvinbridge Subway", mins: "5 min to city" },
      { name: "Hyndland Rail", mins: "12 min" },
      { name: "Glasgow Central", mins: "15 min" },
    ],
    priceTrend: [
      { year: "2021", value: 240000 },
      { year: "2022", value: 258000 },
      { year: "2023", value: 275000 },
      { year: "2024", value: 285000 },
      { year: "2025", value: 298000 },
    ],
  },
  {
    slug: "didsbury-m20",
    name: "Didsbury, M20",
    city: "Manchester",
    postcode: "M20",
    price: "£525K",
    rent: "£1,750",
    yield: "4.0%",
    schools: 90,
    transport: 80,
    safety: 82,
    trend: 4.5,
    intro:
      "Family-favoured South Manchester village with strong schools, leafy streets and excellent transport into the city.",
    highlights: [
      "Catchment for Beaver Road Primary",
      "Didsbury Village restaurants & bars",
      "Fletcher Moss Botanical Gardens",
      "Metrolink to city centre in 20 minutes",
    ],
    schoolsList: [
      { name: "Beaver Road Primary", rating: "Outstanding", type: "Primary" },
      { name: "Parrs Wood High", rating: "Good", type: "Secondary" },
      { name: "The Manchester Grammar", rating: "Independent", type: "Secondary" },
    ],
    transportList: [
      { name: "Didsbury Village Metrolink", mins: "20 min to city" },
      { name: "Manchester Airport", mins: "12 min" },
      { name: "M60 Junction 5", mins: "10 min" },
    ],
    priceTrend: [
      { year: "2021", value: 425000 },
      { year: "2022", value: 460000 },
      { year: "2023", value: 488000 },
      { year: "2024", value: 506000 },
      { year: "2025", value: 525000 },
    ],
  },
];

export function findArea(slug: string) {
  return AREAS.find((a) => a.slug === slug) ?? null;
}

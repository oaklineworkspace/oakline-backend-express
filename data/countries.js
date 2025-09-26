const COUNTRIES = [
  {
    code: 'US',
    name: 'United States',
    states: [
      { name: 'California', cities: ['Los Angeles', 'San Francisco', 'San Diego', 'Cathedral City'] },
      { name: 'New York', cities: ['New York City', 'Buffalo', 'Rochester'] },
      { name: 'Texas', cities: ['Houston', 'Dallas', 'Austin'] },
      { name: 'Florida', cities: ['Miami', 'Orlando', 'Tampa'] },
      { name: 'Illinois', cities: ['Chicago', 'Springfield', 'Naperville'] },
      { name: 'Pennsylvania', cities: ['Philadelphia', 'Pittsburgh', 'Harrisburg'] },
      { name: 'Ohio', cities: ['Columbus', 'Cleveland', 'Cincinnati'] },
      { name: 'Michigan', cities: ['Detroit', 'Grand Rapids', 'Ann Arbor'] },
    ],
  },
  {
    code: 'CA',
    name: 'Canada',
    states: [
      { name: 'Ontario', cities: ['Toronto', 'Ottawa', 'Hamilton'] },
      { name: 'Quebec', cities: ['Montreal', 'Quebec City', 'Laval'] },
      { name: 'British Columbia', cities: ['Vancouver', 'Victoria', 'Kelowna'] },
      { name: 'Alberta', cities: ['Calgary', 'Edmonton', 'Red Deer'] },
      { name: 'Nova Scotia', cities: ['Halifax', 'Sydney', 'Dartmouth'] },
    ],
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    states: [
      { name: 'England', cities: ['London', 'Manchester', 'Birmingham'] },
      { name: 'Scotland', cities: ['Edinburgh', 'Glasgow', 'Aberdeen'] },
      { name: 'Wales', cities: ['Cardiff', 'Swansea', 'Newport'] },
      { name: 'Northern Ireland', cities: ['Belfast', 'Lisburn', 'Derry'] },
    ],
  },
  {
    code: 'AU',
    name: 'Australia',
    states: [
      { name: 'New South Wales', cities: ['Sydney', 'Newcastle', 'Wollongong'] },
      { name: 'Victoria', cities: ['Melbourne', 'Geelong', 'Ballarat'] },
      { name: 'Queensland', cities: ['Brisbane', 'Gold Coast', 'Cairns'] },
      { name: 'Western Australia', cities: ['Perth', 'Fremantle', 'Bunbury'] },
    ],
  },
  {
    code: 'DE',
    name: 'Germany',
    states: [
      { name: 'Bavaria', cities: ['Munich', 'Nuremberg', 'Augsburg'] },
      { name: 'Berlin', cities: ['Berlin'] },
      { name: 'North Rhine-Westphalia', cities: ['Cologne', 'Düsseldorf', 'Dortmund'] },
      { name: 'Hesse', cities: ['Frankfurt', 'Wiesbaden', 'Darmstadt'] },
    ],
  },
  {
    code: 'FR',
    name: 'France',
    states: [
      { name: 'Île-de-France', cities: ['Paris', 'Boulogne-Billancourt', 'Versailles'] },
      { name: 'Provence-Alpes-Côte d\'Azur', cities: ['Marseille', 'Nice', 'Toulon'] },
      { name: 'Auvergne-Rhône-Alpes', cities: ['Lyon', 'Grenoble', 'Clermont-Ferrand'] },
      { name: 'Nouvelle-Aquitaine', cities: ['Bordeaux', 'Limoges', 'Poitiers'] },
    ],
  },
  {
    code: 'IN',
    name: 'India',
    states: [
      { name: 'Maharashtra', cities: ['Mumbai', 'Pune', 'Nagpur'] },
      { name: 'Karnataka', cities: ['Bengaluru', 'Mysore', 'Mangalore'] },
      { name: 'Delhi', cities: ['New Delhi', 'Delhi'] },
      { name: 'Tamil Nadu', cities: ['Chennai', 'Coimbatore', 'Madurai'] },
      { name: 'West Bengal', cities: ['Kolkata', 'Darjeeling', 'Howrah'] },
    ],
  },
  {
    code: 'JP',
    name: 'Japan',
    states: [
      { name: 'Tokyo', cities: ['Tokyo'] },
      { name: 'Osaka', cities: ['Osaka', 'Sakai'] },
      { name: 'Kyoto', cities: ['Kyoto'] },
      { name: 'Hokkaido', cities: ['Sapporo', 'Hakodate'] },
    ],
  },
  {
    code: 'BR',
    name: 'Brazil',
    states: [
      { name: 'São Paulo', cities: ['São Paulo', 'Campinas', 'Santos'] },
      { name: 'Rio de Janeiro', cities: ['Rio de Janeiro', 'Niterói'] },
      { name: 'Minas Gerais', cities: ['Belo Horizonte', 'Uberlândia'] },
      { name: 'Bahia', cities: ['Salvador', 'Feira de Santana'] },
    ],
  },
  {
    code: 'ZA',
    name: 'South Africa',
    states: [
      { name: 'Gauteng', cities: ['Johannesburg', 'Pretoria'] },
      { name: 'Western Cape', cities: ['Cape Town', 'Stellenbosch'] },
      { name: 'KwaZulu-Natal', cities: ['Durban', 'Pietermaritzburg'] },
    ],
  },
  {
    code: 'CN',
    name: 'China',
    states: [
      { name: 'Beijing', cities: ['Beijing'] },
      { name: 'Shanghai', cities: ['Shanghai'] },
      { name: 'Guangdong', cities: ['Guangzhou', 'Shenzhen', 'Dongguan'] },
    ],
  },
  {
    code: 'RU',
    name: 'Russia',
    states: [
      { name: 'Moscow', cities: ['Moscow'] },
      { name: 'Saint Petersburg', cities: ['Saint Petersburg'] },
      { name: 'Sverdlovsk Oblast', cities: ['Yekaterinburg'] },
    ],
  },
  {
    code: 'MX',
    name: 'Mexico',
    states: [
      { name: 'Ciudad de México', cities: ['Mexico City'] },
      { name: 'Jalisco', cities: ['Guadalajara', 'Puerto Vallarta'] },
      { name: 'Nuevo León', cities: ['Monterrey'] },
    ],
  },
  {
    code: 'IT',
    name: 'Italy',
    states: [
      { name: 'Lazio', cities: ['Rome', 'Frosinone'] },
      { name: 'Lombardy', cities: ['Milan', 'Bergamo'] },
      { name: 'Veneto', cities: ['Venice', 'Verona'] },
    ],
  },
  {
    code: 'ES',
    name: 'Spain',
    states: [
      { name: 'Madrid', cities: ['Madrid', 'Alcalá de Henares'] },
      { name: 'Catalonia', cities: ['Barcelona', 'Girona'] },
      { name: 'Andalusia', cities: ['Seville', 'Malaga'] },
    ],
  },
  {
    code: 'NL',
    name: 'Netherlands',
    states: [
      { name: 'North Holland', cities: ['Amsterdam', 'Haarlem'] },
      { name: 'South Holland', cities: ['Rotterdam', 'The Hague'] },
    ],
  },
];

export default COUNTRIES;

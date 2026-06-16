export interface LocationOption {
  value: string;
  label: string;
}

interface CountryLocationIndex {
  states: string[];
  cities: string[];
}

const COUNTRY_LOCATION_INDEX: Record<string, CountryLocationIndex> = {
  "Anguilla": {
    states: ["Blowing Point", "East End", "George Hill", "Island Harbour", "North Hill", "North Side", "Sandy Ground", "Sandy Hill", "South Hill", "Stoney Ground", "The Farrington", "The Quarter", "The Valley", "West End"],
    cities: ["The Valley", "Sandy Ground", "West End", "Island Harbour"],
  },
  "Antigua & Barbuda": {
    states: ["Saint George", "Saint John", "Saint Mary", "Saint Paul", "Saint Peter", "Saint Philip", "Barbuda", "Redonda"],
    cities: ["St. John's", "All Saints", "Liberta", "Codrington", "Parham"],
  },
  "Aruba": {
    states: ["Oranjestad", "Noord", "Paradera", "San Nicolas", "Santa Cruz", "Savaneta"],
    cities: ["Oranjestad", "San Nicolas", "Noord", "Santa Cruz"],
  },
  "Bahamas": {
    states: ["Acklins", "Berry Islands", "Bimini", "Black Point", "Cat Island", "Central Abaco", "Central Andros", "Central Eleuthera", "City of Freeport", "Crooked Island and Long Cay", "East Grand Bahama", "Exuma", "Grand Cay", "Harbour Island", "Hope Town", "Inagua", "Long Island", "Mangrove Cay", "Mayaguana", "Moore's Island", "New Providence", "North Abaco", "North Andros", "North Eleuthera", "Ragged Island", "Rum Cay", "San Salvador", "South Abaco", "South Andros", "South Eleuthera", "Spanish Wells", "West Grand Bahama"],
    cities: ["Nassau", "Freeport", "West End", "Coopers Town", "Marsh Harbour"],
  },
  "Barbados": {
    states: ["Christ Church", "Saint Andrew", "Saint George", "Saint James", "Saint John", "Saint Joseph", "Saint Lucy", "Saint Michael", "Saint Peter", "Saint Philip", "Saint Thomas"],
    cities: ["Bridgetown", "Holetown", "Oistins", "Speightstown", "Bathsheba"],
  },
  "Belize": {
    states: ["Belize", "Cayo", "Corozal", "Orange Walk", "Stann Creek", "Toledo"],
    cities: ["Belize City", "Belmopan", "San Ignacio", "Orange Walk Town", "Dangriga", "Punta Gorda"],
  },
  "Bermuda": {
    states: ["Devonshire", "Hamilton (parish)", "Hamilton (city)", "Paget", "Pembroke", "Saint George's (parish)", "Saint George's (town)", "Sandys", "Smith's", "Southampton", "Warwick"],
    cities: ["Hamilton", "Saint George's", "Somerset Village", "Flatts Village"],
  },
  "British Virgin Islands": {
    states: ["Anegada", "Jost Van Dyke", "Tortola", "Virgin Gorda"],
    cities: ["Road Town", "Spanish Town", "The Settlement", "Great Harbour"],
  },
  "Cayman Islands": {
    states: ["Bodden Town", "Cayman Brac", "East End", "George Town", "Little Cayman", "North Side", "Sister Islands", "West Bay"],
    cities: ["George Town", "West Bay", "Bodden Town", "East End", "Stake Bay"],
  },
  "Cuba": {
    states: ["Artemisa", "Camagüey", "Ciego de Ávila", "Cienfuegos", "Granma", "Guantánamo", "Havana", "Holguín", "Isla de la Juventud", "Las Tunas", "Matanzas", "Mayabeque", "Pinar del Río", "Sancti Spíritus", "Santiago de Cuba", "Villa Clara"],
    cities: ["Havana", "Santiago de Cuba", "Camagüey", "Holguín", "Santa Clara"],
  },
  "Curaçao": {
    states: ["Willemstad", "Bandabou", "Bandariba"],
    cities: ["Willemstad", "Sint Michiel", "Westpunt", "Barber"],
  },
  "Dominica": {
    states: ["Saint Andrew", "Saint David", "Saint George", "Saint John", "Saint Joseph", "Saint Luke", "Saint Mark", "Saint Patrick", "Saint Paul", "Saint Peter"],
    cities: ["Roseau", "Portsmouth", "Marigot", "Berekua", "Mahaut"],
  },
  "Dominican Republic": {
    states: ["Azua", "Baoruco", "Barahona", "Dajabón", "Distrito Nacional", "Duarte", "El Seibo", "Elías Piña", "Espaillat", "Hato Mayor", "Hermanas Mirabal", "Independencia", "La Altagracia", "La Romana", "La Vega", "María Trinidad Sánchez", "Monseñor Nouel", "Monte Cristi", "Monte Plata", "Pedernales", "Peravia", "Puerto Plata", "Samaná", "San Cristóbal", "San José de Ocoa", "San Juan", "San Pedro de Macorís", "Sánchez Ramírez", "Santiago", "Santiago Rodríguez", "Santo Domingo", "Valverde"],
    cities: ["Santo Domingo", "Santiago de los Caballeros", "La Romana", "San Pedro de Macorís", "Puerto Plata"],
  },
  "Grenada": {
    states: ["Carriacou and Petite Martinique", "Saint Andrew", "Saint David", "Saint George", "Saint John", "Saint Mark", "Saint Patrick"],
    cities: ["St. George's", "Gouyave", "Grenville", "Victoria", "Hillsborough"],
  },
  "Guadeloupe": {
    states: ["Basse-Terre", "Grande-Terre", "Marie-Galante", "La Désirade", "Les Saintes"],
    cities: ["Basse-Terre", "Pointe-à-Pitre", "Le Gosier", "Sainte-Anne", "Le Moule"],
  },
  "Guyana": {
    states: ["Barima-Waini", "Cuyuni-Mazaruni", "Demerara-Mahaica", "East Berbice-Corentyne", "Essequibo Islands-West Demerara", "Mahaica-Berbice", "Pomeroon-Supenaam", "Potaro-Siparuni", "Upper Demerara-Berbice", "Upper Takutu-Upper Essequibo"],
    cities: ["Georgetown", "Linden", "New Amsterdam", "Anna Regina", "Bartica"],
  },
  "Haiti": {
    states: ["Artibonite", "Centre", "Grand'Anse", "Nippes", "Nord", "Nord-Est", "Nord-Ouest", "Ouest", "Sud", "Sud-Est"],
    cities: ["Port-au-Prince", "Cap-Haïtien", "Gonaïves", "Les Cayes", "Jacmel"],
  },
  "Jamaica": {
    states: ["Clarendon", "Hanover", "Kingston", "Manchester", "Portland", "Saint Andrew", "Saint Ann", "Saint Catherine", "Saint Elizabeth", "Saint James", "Saint Mary", "Saint Thomas", "Trelawny", "Westmoreland"],
    cities: ["Kingston", "Montego Bay", "Spanish Town", "Mandeville", "Portmore"],
  },
  "Martinique": {
    states: ["Fort-de-France", "La Trinité", "Le Marin", "Saint-Pierre"],
    cities: ["Fort-de-France", "Le Lamentin", "Le Robert", "Schœlcher", "Sainte-Marie"],
  },
  "Montserrat": {
    states: ["Saint Anthony", "Saint Georges", "Saint Peter"],
    cities: ["Brades", "Plymouth", "Salem", "Saint Peters"],
  },
  "Puerto Rico": {
    states: ["Adjuntas", "Aguada", "Aguadilla", "Aguas Buenas", "Aibonito", "Añasco", "Arecibo", "Arroyo", "Bayamón", "Caguas", "Carolina", "Fajardo", "Guayama", "Guaynabo", "Humacao", "Mayagüez", "Ponce", "San Juan", "Toa Baja", "Trujillo Alto"],
    cities: ["San Juan", "Bayamón", "Carolina", "Ponce", "Caguas", "Mayagüez"],
  },
  "Saba": {
    states: ["The Bottom", "Windwardside", "Hell's Gate", "St. John's", "Zion's Hill"],
    cities: ["The Bottom", "Windwardside", "St. John's"],
  },
  "Saint Barthélemy": {
    states: ["Gustavia", "Lorient", "Saint-Jean", "Anse des Cayes", "Colombier"],
    cities: ["Gustavia", "Saint-Jean", "Lorient"],
  },
  "Saint Kitts & Nevis": {
    states: ["Christ Church Nichola Town", "Saint Anne Sandy Point", "Saint George Basseterre", "Saint George Gingerland", "Saint James Windward", "Saint John Capisterre", "Saint John Figtree", "Saint Mary Cayon", "Saint Paul Capisterre", "Saint Paul Charlestown", "Saint Peter Basseterre", "Saint Thomas Lowland", "Saint Thomas Middle Island", "Trinity Palmetto Point"],
    cities: ["Basseterre", "Charlestown", "Cayon", "Dieppe Bay Town", "Sandy Point Town"],
  },
  "Saint Lucia": {
    states: ["Anse la Raye", "Canaries", "Castries", "Choiseul", "Dennery", "Gros Islet", "Laborie", "Micoud", "Soufrière", "Vieux Fort"],
    cities: ["Castries", "Gros Islet", "Vieux Fort", "Soufrière", "Dennery"],
  },
  "Saint Martin": {
    states: ["Marigot", "Grand-Case", "Quartier d'Orléans", "Sandy Ground", "La Savane"],
    cities: ["Marigot", "Grand-Case", "Quartier d'Orléans"],
  },
  "Saint Vincent & the Grenadines": {
    states: ["Charlotte", "Grenadines", "Saint Andrew", "Saint David", "Saint George", "Saint Patrick"],
    cities: ["Kingstown", "Georgetown", "Byera Village", "Port Elizabeth", "Barrouallie"],
  },
  "Sint Eustatius": {
    states: ["Oranjestad", "Concordia", "Golden Rock"],
    cities: ["Oranjestad"],
  },
  "Sint Maarten": {
    states: ["Philipsburg", "Lower Prince's Quarter", "Cul de Sac", "Simpson Bay", "Cole Bay"],
    cities: ["Philipsburg", "Simpson Bay", "Cole Bay"],
  },
  "Suriname": {
    states: ["Brokopondo", "Commewijne", "Coronie", "Marowijne", "Nickerie", "Para", "Paramaribo", "Saramacca", "Sipaliwini", "Wanica"],
    cities: ["Paramaribo", "Lelydorp", "Nieuw Nickerie", "Moengo", "Albina"],
  },
  "Trinidad & Tobago": {
    states: ["Arima", "Chaguanas", "Couva-Tabaquite-Talparo", "Diego Martin", "Mayaro-Rio Claro", "Penal-Debe", "Point Fortin", "Port of Spain", "Princes Town", "San Fernando", "San Juan-Laventille", "Sangre Grande", "Siparia", "Tunapuna-Piarco", "Tobago"],
    cities: ["Port of Spain", "San Fernando", "Chaguanas", "Arima", "Scarborough"],
  },
  "Turks & Caicos Islands": {
    states: ["Grand Turk", "Salt Cay", "South Caicos", "Middle Caicos", "North Caicos", "Providenciales", "Parrot Cay"],
    cities: ["Cockburn Town", "Providenciales", "Kew", "Bottle Creek", "Balfour Town"],
  },
  "U.S. Virgin Islands": {
    states: ["Saint Croix", "Saint John", "Saint Thomas", "Water Island"],
    cities: ["Charlotte Amalie", "Christiansted", "Frederiksted", "Cruz Bay"],
  },
  "United States": {
    states: ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"],
    cities: ["New York", "Los Angeles", "Chicago", "Houston", "Miami"],
  },
  "Canada": {
    states: ["Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia", "Nunavut", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan", "Yukon"],
    cities: ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa"],
  },
  "United Kingdom": {
    states: ["England", "Scotland", "Wales", "Northern Ireland"],
    cities: ["London", "Birmingham", "Manchester", "Leeds", "Glasgow"],
  },
  "Australia": {
    states: ["New South Wales", "Queensland", "South Australia", "Tasmania", "Victoria", "Western Australia", "Australian Capital Territory", "Northern Territory"],
    cities: ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide"],
  },
  "India": {
    states: ["Andhra Pradesh", "Assam", "Bihar", "Delhi", "Gujarat", "Karnataka", "Kerala", "Maharashtra", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "West Bengal"],
    cities: ["Mumbai", "Delhi", "Bengaluru", "Chennai", "Hyderabad"],
  },
};

const CORE_COUNTRIES = [
  // Caribbean (alphabetical)
  "Anguilla",
  "Antigua & Barbuda",
  "Aruba",
  "Bahamas",
  "Barbados",
  "Belize",
  "Bermuda",
  "British Virgin Islands",
  "Cayman Islands",
  "Cuba",
  "Curaçao",
  "Dominica",
  "Dominican Republic",
  "Grenada",
  "Guadeloupe",
  "Guyana",
  "Haiti",
  "Jamaica",
  "Martinique",
  "Montserrat",
  "Puerto Rico",
  "Saba",
  "Saint Barthélemy",
  "Saint Kitts & Nevis",
  "Saint Lucia",
  "Saint Martin",
  "Saint Vincent & the Grenadines",
  "Sint Eustatius",
  "Sint Maarten",
  "Suriname",
  "Trinidad & Tobago",
  "Turks & Caicos Islands",
  "U.S. Virgin Islands",
  // Other supported markets
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "India",
] as const;

export const COUNTRY_OPTIONS: LocationOption[] = CORE_COUNTRIES.map((country) => ({ value: country, label: country }));

const toOptions = (values: string[]) => values.map((value) => ({ value, label: value }));

export const getStateOptionsByCountry = (country?: string | null): LocationOption[] => {
  const normalized = (country ?? "").trim();
  if (!normalized) return [];
  return toOptions(COUNTRY_LOCATION_INDEX[normalized]?.states ?? []);
};

export const getCityOptionsByCountry = (country?: string | null): LocationOption[] => {
  const normalized = (country ?? "").trim();
  if (!normalized) return [];
  return toOptions(COUNTRY_LOCATION_INDEX[normalized]?.cities ?? []);
};

export const ensureOption = (options: LocationOption[], value?: string | null): LocationOption[] => {
  const normalized = (value ?? "").trim();
  if (!normalized || options.some((option) => option.value === normalized)) return options;
  return [...options, { value: normalized, label: normalized }];
};

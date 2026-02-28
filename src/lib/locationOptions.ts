export interface LocationOption {
  value: string;
  label: string;
}

interface CountryLocationIndex {
  states: string[];
  cities: string[];
}

const COUNTRY_LOCATION_INDEX: Record<string, CountryLocationIndex> = {
  Barbados: {
    states: ["Christ Church", "Saint Andrew", "Saint George", "Saint James", "Saint John", "Saint Joseph", "Saint Lucy", "Saint Michael", "Saint Peter", "Saint Philip", "Saint Thomas"],
    cities: ["Bridgetown", "Holetown", "Oistins", "Speightstown", "Bathsheba"],
  },
  "Trinidad & Tobago": {
    states: ["Arima", "Chaguanas", "Couva-Tabaquite-Talparo", "Diego Martin", "Mayaro-Rio Claro", "Penal-Debe", "Point Fortin", "Port of Spain", "Princes Town", "San Fernando", "San Juan-Laventille", "Sangre Grande", "Siparia", "Tunapuna-Piarco", "Tobago"],
    cities: ["Port of Spain", "San Fernando", "Chaguanas", "Arima", "Scarborough"],
  },
  Jamaica: {
    states: ["Clarendon", "Hanover", "Kingston", "Manchester", "Portland", "Saint Andrew", "Saint Ann", "Saint Catherine", "Saint Elizabeth", "Saint James", "Saint Mary", "Saint Thomas", "Trelawny", "Westmoreland"],
    cities: ["Kingston", "Montego Bay", "Spanish Town", "Mandeville", "Portmore"],
  },
  Guyana: {
    states: ["Barima-Waini", "Cuyuni-Mazaruni", "Demerara-Mahaica", "East Berbice-Corentyne", "Essequibo Islands-West Demerara", "Mahaica-Berbice", "Pomeroon-Supenaam", "Potaro-Siparuni", "Upper Demerara-Berbice", "Upper Takutu-Upper Essequibo"],
    cities: ["Georgetown", "Linden", "New Amsterdam", "Anna Regina", "Bartica"],
  },
  "Saint Lucia": {
    states: ["Anse la Raye", "Canaries", "Castries", "Choiseul", "Dennery", "Gros Islet", "Laborie", "Micoud", "Soufrière", "Vieux Fort"],
    cities: ["Castries", "Gros Islet", "Vieux Fort", "Soufrière", "Dennery"],
  },
  "United States": {
    states: ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"],
    cities: ["New York", "Los Angeles", "Chicago", "Houston", "Miami"],
  },
  Canada: {
    states: ["Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia", "Nunavut", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan", "Yukon"],
    cities: ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa"],
  },
  "United Kingdom": {
    states: ["England", "Scotland", "Wales", "Northern Ireland"],
    cities: ["London", "Birmingham", "Manchester", "Leeds", "Glasgow"],
  },
  Australia: {
    states: ["New South Wales", "Queensland", "South Australia", "Tasmania", "Victoria", "Western Australia", "Australian Capital Territory", "Northern Territory"],
    cities: ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide"],
  },
  India: {
    states: ["Andhra Pradesh", "Assam", "Bihar", "Delhi", "Gujarat", "Karnataka", "Kerala", "Maharashtra", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "West Bengal"],
    cities: ["Mumbai", "Delhi", "Bengaluru", "Chennai", "Hyderabad"],
  },
};

const CORE_COUNTRIES = [
  "Barbados",
  "Trinidad & Tobago",
  "Jamaica",
  "Guyana",
  "Saint Lucia",
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

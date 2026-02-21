
import { Appliance, ApplianceType, Fitting } from './types';

export const APPLIANCES: Appliance[] = [
  { id: ApplianceType.WC, name: 'WC (kotlić)', jo: 2.0, du: 2.5, qNominal: 0.13 },
  { id: ApplianceType.WASHBASIN, name: 'Umivaonik', jo: 0.5, du: 0.5, qNominal: 0.10 },
  { id: ApplianceType.SHOWER, name: 'Tuš', jo: 1.5, du: 0.6, qNominal: 0.20 },
  { id: ApplianceType.BATH, name: 'Kada', jo: 1.5, du: 0.8, qNominal: 0.30 },
  { id: ApplianceType.KITCHEN_SINK, name: 'Sudoper', jo: 1.5, du: 0.8, qNominal: 0.20 },
  { id: ApplianceType.DISHWASHER, name: 'Perilica posuđa', jo: 1.0, du: 0.8, qNominal: 0.15 },
  { id: ApplianceType.WASHING_MACHINE, name: 'Perilica rublja', jo: 1.0, du: 0.8, qNominal: 0.25 },
  { id: ApplianceType.FLOOR_DRAIN, name: 'Podni sifon', jo: 0.5, du: 1.0, qNominal: 0.10 },
  { id: ApplianceType.WATER_METER, name: 'Glavni Vodomjer', jo: 0, du: 0, qNominal: 0 },
  { id: 'urinal' as any, name: 'Pisoar', jo: 0.5, du: 0.5, qNominal: 0.30 },
  { id: 'garden_tap' as any, name: 'Vrtni priključak (DN15)', jo: 1.5, du: 0, qNominal: 0.30 }
];

export const HYDRANT_TYPES = [
  { id: 'h1', name: 'Zidni hidrant DN 25 (Bubanj) (0.63 l/s)', q: 0.63, label: 'DN25' },
  { id: 'h2', name: 'Zidni hidrant DN 52 (1 mlaz) (2.5 l/s)', q: 2.50, label: 'DN52' },
  { id: 'h2b', name: 'Zidni hidrant DN 52 (2 mlaza) (5.0 l/s)', q: 5.00, label: 'DN52x2' },
  { id: 'h3', name: 'Vanjski podzemni hidrant DN 80 (5.0 l/s)', q: 5.00, label: 'DN80P' },
  { id: 'h3n', name: 'Vanjski nadzemni hidrant DN 80 (5.0 l/s)', q: 5.00, label: 'DN80N' },
  { id: 'h4', name: 'Vanjski nadzemni hidrant DN 100 (10.0 l/s)', q: 10.0, label: 'DN100N' },
  { id: 'h5', name: 'Vanjski nadzemni hidrant DN 150 (20.0 l/s)', q: 20.0, label: 'DN150N' }
];

export const FITTINGS: Fitting[] = [
  { id: 'knee90', name: 'Koljeno 90°', zeta: 1.5 },
  { id: 'knee45', name: 'Koljeno 45°', zeta: 0.5 },
  { id: 'bend90', name: 'Luk 90° (dugi)', zeta: 0.4 },
  { id: 't_div', name: 'T-komad razdvajanje', zeta: 1.3 },
  { id: 't_con', name: 'T-komad spajanje', zeta: 2.5 },
  { id: 't_run', name: 'T-komad prolaz', zeta: 0.6 },
  { id: 'gate_valve', name: 'Zasun', zeta: 0.3 },
  { id: 'ball_valve', name: 'Kuglasti ventil', zeta: 0.2 },
  { id: 'stop_valve', name: 'Propusni ventil', zeta: 4.0 },
  { id: 'angle_valve', name: 'Kutni ventil (kutna slavina)', zeta: 3.5 },
  { id: 'check_valve', name: 'Nepovratni ventil', zeta: 2.5 },
  { id: 'reduction', name: 'Redukcija (koncentrična)', zeta: 0.5 }
];

export const PIPES = [
  { dn: 16, di: 12, name: '16x2.0' },
  { dn: 20, di: 16, name: '20x2.0' },
  { dn: 26, di: 20, name: '26x3.0' },
  { dn: 32, di: 26, name: '32x3.0' },
  { dn: 40, di: 32, name: '40x4.0' },
  { dn: 50, di: 40, name: '50x5.0' },
  { dn: 63, di: 50, name: '63x6.5' },
  { dn: 75, di: 60, name: '75x7.5' },
  { dn: 90, di: 72, name: '90x9.0' },
  { dn: 110, di: 88, name: '110x11.0' }
];

export const BUILDING_TYPES = [
  { id: 'residential', name: 'Stambena zgrada', k: 0.5 },
  { id: 'office', name: 'Uredska zgrada', k: 0.5 },
  { id: 'commercial', name: 'Trgovina / Hotel', k: 0.7 },
  { id: 'school', name: 'Škola / Bolnica', k: 0.7 },
  { id: 'special', name: 'Laboratorij / Restoran', k: 1.0 },
  { id: 'heavy', name: 'Industrija', k: 1.2 }
];

export const CROATIAN_CITIES_RAINFALL = [
  { name: 'Zagreb', r: 300 },
  { name: 'Split', r: 345 },
  { name: 'Rijeka', r: 435 },
  { name: 'Osijek', r: 275 },
  { name: 'Dubrovnik', r: 395 },
  { name: 'Pula', r: 310 },
  { name: 'Zadar', r: 325 },
  { name: 'Varaždin', r: 285 },
  { name: 'Šibenik', r: 335 },
  { name: 'Karlovac', r: 315 },
  { name: 'Slavonski Brod', r: 265 },
  { name: 'Sisak', r: 295 }
].sort((a, b) => a.name.localeCompare(b.name));

export const WATER_MATERIALS = [
  { id: 'ppr', name: 'PPR (zelene cijevi)', roughness: 0.007 },
  { id: 'pex', name: 'PEX/Al/PEX', roughness: 0.007 },
  { id: 'inox', name: 'Inox (nehrđajući čelik)', roughness: 0.015 },
  { id: 'steel', name: 'Pocinčani čelik', roughness: 0.15 }
];

export const DRAINAGE_MATERIALS = [
  { id: 'pp', name: 'PP (HT cijevi - sive)' },
  { id: 'pvc', name: 'PVC (KG cijevi - narančaste)' },
  { id: 'pehd', name: 'PE-HD (Geberit - crne)' },
  { id: 'sml', name: 'Lijevano željezo (SML)' }
];

export const ROOF_MATERIALS = {
  sloped: [
    { id: 'lim_crijep', name: 'Lim / Crijep', coef: 1.0 },
    { id: 'sindra', name: 'Bitumenska šindra', coef: 0.9 },
    { id: 'manual', name: 'Manualni unos', coef: 1.0 }
  ],
  flat: [
    { id: 'beton_folija', name: 'Beton / Folija', coef: 0.9 },
    { id: 'sljunak', name: 'Nasip šljunka', coef: 0.7 },
    { id: 'zeleni_ekstenzivni', name: 'Zeleni krov (ekstenzivni)', coef: 0.5 },
    { id: 'zeleni_intenzivni', name: 'Zeleni krov (intenzivni)', coef: 0.3 },
    { id: 'manual', name: 'Manualni unos', coef: 0.9 }
  ]
};

export const SURFACE_MATERIALS = [
  { id: 'asfalt_beton', name: 'Asfalt / Beton', coef: 0.9 },
  { id: 'poplocenje_fuge', name: 'Popločenje s fugama', coef: 0.7 },
  { id: 'tucanik', name: 'Tucanik / Šljunak', coef: 0.3 },
  { id: 'zelenilo', name: 'Zelenilo / Travnjak', coef: 0.1 },
  { id: 'manual', name: 'Manualni unos', coef: 0.9 }
];

export const ROUGHNESS = 0.007; // Default roughness in mm

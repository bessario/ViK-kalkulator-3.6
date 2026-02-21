
export enum ApplianceType {
  WC = 'WC',
  WASHBASIN = 'UMIVAONIK',
  SHOWER = 'TUS',
  BATH = 'KADA',
  KITCHEN_SINK = 'KUHINJSKI SUDOPER',
  DISHWASHER = 'PERILICA POSUĐA',
  WASHING_MACHINE = 'PERILICA RUBLJA',
  FLOOR_DRAIN = 'PODNI SIFON',
  WATER_METER = 'VODOMJER'
}

export interface Appliance {
  id: ApplianceType;
  name: string;
  jo: number; // Load Units (Jedinice Opterećenja)
  du: number; // Drainage Units (Odvodne Jedinice)
  qNominal: number; // Nominal flow in l/s for peak check
}

export interface Fitting {
  id: string;
  name: string;
  zeta: number; // Loss coefficient
}

export interface CalculationResult {
  water: {
    sumJO: number;
    qPeak: number;
    velocity: number;
    lineLoss: number;
    localLoss: number;
    geoLoss: number;
    totalLoss: number;
    selectedPipe: string;
    isStable: boolean;
  };
  drainage: {
    sumDU: number;
    qDrain: number;
    minDN: string;
  };
}

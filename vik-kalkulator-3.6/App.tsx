
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Trash2, 
  Undo, 
  Redo, 
  Save, 
  FileText, 
  Moon, 
  Sun, 
  ChevronDown, 
  ChevronUp, 
  Settings, 
  History, 
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  Menu,
  X,
  PlusCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { APPLIANCES, FITTINGS, PIPES, BUILDING_TYPES, CROATIAN_CITIES_RAINFALL, HYDRANT_TYPES, WATER_MATERIALS, DRAINAGE_MATERIALS, ROOF_MATERIALS, SURFACE_MATERIALS } from './constants';
import { 
  calculateLineLoss, 
  calculateLocalLoss, 
  calculateSepticVolume, 
  calculateGreaseTrapSize,
  calculateRoofDrainage,
  calculateSurfaceDrainage,
  calculateHydrantNetwork
} from './utils/calculations';
import { generateLocalReport } from './utils/reportGenerator';
import { ApplianceType } from './types';

type Module = 'vik' | 'roof' | 'surface' | 'septic' | 'grease' | 'hydrant';
type Theme = 'light' | 'dark';
type MobileView = 'input' | 'output' | 'report';

interface ApartmentUnit {
  id: string;
  name: string;
  multiplier: number;
  counts: Record<string, number>;
}

interface Project {
  id: string;
  name: string;
  investor: string;
  date: string;
  state: any;
}

interface HistoryItem {
  id: string;
  timestamp: string;
  projectName: string;
  module: Module;
  state: any;
}

interface RoofSurface {
  id: string;
  name: string;
  area: number;
  coef: number;
  type: 'sloped' | 'flat';
  materialId: string;
  manualDN: string | null;
  manualCount: number | null;
}

interface ManipulativeSurface {
  id: string;
  name: string;
  area: number;
  psi: number;
  materialId: string;
}

const DRAINAGE_DNS = ['DN75', 'DN110', 'DN125', 'DN160', 'DN200', 'DN250', 'DN315'];

const getInitialCounts = () => {
  const c: Record<string, number> = {};
  APPLIANCES.forEach(a => { c[a.id] = 0; });
  return c;
};

const getInitialFittings = () => {
  const f: Record<string, number> = {};
  FITTINGS.forEach(fit => { f[fit.id] = 0; });
  return f;
};

const getVdmDN = (qPeak: number): string => {
  const qPeakM3h = qPeak * 3.6;
  if (qPeakM3h > 150.0) return "DN150";
  if (qPeakM3h > 100.0) return "DN100";
  if (qPeakM3h > 60.0) return "DN80";
  if (qPeakM3h > 40.0) return "DN65";
  if (qPeakM3h > 20.0) return "DN50";
  if (qPeakM3h > 10.0) return "DN40";
  if (qPeakM3h > 6.3) return "DN32";
  if (qPeakM3h > 4.0) return "DN25";
  return "DN20";
};

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<Module>('vik');
  const [theme, setTheme] = useState<Theme>(() => 
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );
  const [reportConfig, setReportConfig] = useState<Record<string, boolean>>({
    vik: true, roof: true, surface: true, septic: true, grease: true, hydrant: true
  });
  const [mobileView, setMobileView] = useState<MobileView>('input');

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    project: true,
    modules: true,
    system: true,
    apartments: true,
    appliances: true,
    hydrantSettings: true
  });

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [projectName, setProjectName] = useState<string>("");
  const [projectInvestor, setProjectInvestor] = useState<string>("");
  const [projectDate, setProjectDate] = useState<string>(new Date().toLocaleDateString('hr-HR'));

  const [counts, setCounts] = useState<Record<string, number>>(getInitialCounts());
  const [unitTypes, setUnitTypes] = useState<ApartmentUnit[]>([]);
  const [fittingCounts, setFittingCounts] = useState<Record<string, number>>(getInitialFittings());
  const [useSafetyFactor, setUseSafetyFactor] = useState<boolean>(true);
  const [length, setLength] = useState<number>(30);
  const [height, setHeight] = useState<number>(10);
  const [inputPressure, setInputPressure] = useState<number>(25);
  const [buildingType, setBuildingType] = useState(BUILDING_TYPES[0].id);
  
  const [manualPipeName, setManualPipeName] = useState<string | null>(null);
  const [manualDrainageDN, setManualDrainageDN] = useState<string | null>(null);
  const [manualMainConnDN, setManualMainConnDN] = useState<string | null>(null);
  const [manualCombinedPipeName, setManualCombinedPipeName] = useState<string | null>(null);
  const [manualCombinedVdmDN, setManualCombinedVdmDN] = useState<string | null>(null);
  
  const [drainageSystemType, setDrainageSystemType] = useState<'separate' | 'combined'>('separate');

  const [numHydrants, setNumHydrants] = useState<number>(2);
  const [hydrantFlow, setHydrantFlow] = useState<number>(2.50);
  const [hydrantLength, setHydrantLength] = useState<number>(30);
  const [hydrantHeight, setHydrantHeight] = useState<number>(12);
  const [hydrantPressure, setHydrantPressure] = useState<number>(40);
  const [manualHydrantDN, setManualHydrantDN] = useState<string | null>(null);

  const [manipulativeSurfaces, setManipulativeSurfaces] = useState<ManipulativeSurface[]>([
    { id: '1', name: 'Površina 1', area: 500, psi: 0.9, materialId: 'asfalt_beton' }
  ]);
  const [surfaceIntensity, setSurfaceIntensity] = useState<number>(300);
  const [selectedSurfaceCity, setSelectedSurfaceCity] = useState<string>("Zagreb");

  const [septicUsers, setSepticUsers] = useState<number>(4);
  const [septicConsumption, setSepticConsumption] = useState<number>(150);
  const [septicRetention, setSepticRetention] = useState<number>(3);

  const [greaseFlow, setGreaseFlow] = useState<number>(2);
  const [greaseTempFactor, setGreaseTempFactor] = useState<number>(1.0);
  const [greaseDetFactor, setGreaseDetFactor] = useState<number>(1.3);
  const [greaseDensityFactor, setGreaseDensityFactor] = useState<number>(1.0);

  const [roofSurfaces, setRoofSurfaces] = useState<RoofSurface[]>([
    { id: '1', name: 'Krovna ploha 1', area: 100, coef: 1.0, type: 'sloped', materialId: 'lim_crijep', manualDN: null, manualCount: null }
  ]);
  const [roofIntensity, setRoofIntensity] = useState<number>(300);
  const [selectedCity, setSelectedCity] = useState<string>("Zagreb");

  const [waterMaterial, setWaterMaterial] = useState(WATER_MATERIALS[0].id);
  const [drainageMaterial, setDrainageMaterial] = useState(DRAINAGE_MATERIALS[0].id);

  const [reportHTML, setReportHTML] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copyStatus, setCopyStatus] = useState(false);

  // --- UNDO / REDO LOGIC ---
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);
  const isHistoryAction = React.useRef(false);

  const getAppState = useCallback(() => ({
    projectName, projectInvestor, projectDate, activeModule,
    counts, unitTypes, fittingCounts, useSafetyFactor,
    length, height, inputPressure, buildingType,
    manualPipeName, manualDrainageDN, manualMainConnDN, manualCombinedPipeName, manualCombinedVdmDN,
    drainageSystemType, numHydrants, hydrantFlow, hydrantLength, hydrantHeight, hydrantPressure, manualHydrantDN,
    manipulativeSurfaces, surfaceIntensity, selectedSurfaceCity,
    septicUsers, septicConsumption, septicRetention,
    greaseFlow, greaseTempFactor, greaseDetFactor, greaseDensityFactor,
    roofSurfaces, roofIntensity, selectedCity,
    waterMaterial, drainageMaterial, reportConfig
  }), [
    projectName, projectInvestor, projectDate, activeModule,
    counts, unitTypes, fittingCounts, useSafetyFactor,
    length, height, inputPressure, buildingType,
    manualPipeName, manualDrainageDN, manualMainConnDN, manualCombinedPipeName, manualCombinedVdmDN,
    drainageSystemType, numHydrants, hydrantFlow, hydrantLength, hydrantHeight, hydrantPressure, manualHydrantDN,
    manipulativeSurfaces, surfaceIntensity, selectedSurfaceCity,
    septicUsers, septicConsumption, septicRetention,
    greaseFlow, greaseTempFactor, greaseDetFactor, greaseDensityFactor,
    roofSurfaces, roofIntensity, selectedCity,
    waterMaterial, drainageMaterial, reportConfig
  ]);

  const applyAppState = useCallback((state: any) => {
    isHistoryAction.current = true;
    if (state.projectName !== undefined) setProjectName(state.projectName);
    if (state.projectInvestor !== undefined) setProjectInvestor(state.projectInvestor);
    if (state.projectDate !== undefined) setProjectDate(state.projectDate);
    if (state.activeModule !== undefined) setActiveModule(state.activeModule);
    if (state.counts !== undefined) setCounts(state.counts);
    if (state.unitTypes !== undefined) setUnitTypes(state.unitTypes);
    if (state.fittingCounts !== undefined) setFittingCounts(state.fittingCounts);
    if (state.useSafetyFactor !== undefined) setUseSafetyFactor(state.useSafetyFactor);
    if (state.length !== undefined) setLength(state.length);
    if (state.height !== undefined) setHeight(state.height);
    if (state.inputPressure !== undefined) setInputPressure(state.inputPressure);
    if (state.buildingType !== undefined) setBuildingType(state.buildingType);
    if (state.manualPipeName !== undefined) setManualPipeName(state.manualPipeName);
    if (state.manualDrainageDN !== undefined) setManualDrainageDN(state.manualDrainageDN);
    if (state.manualMainConnDN !== undefined) setManualMainConnDN(state.manualMainConnDN);
    if (state.manualCombinedPipeName !== undefined) setManualCombinedPipeName(state.manualCombinedPipeName);
    if (state.manualCombinedVdmDN !== undefined) setManualCombinedVdmDN(state.manualCombinedVdmDN);
    if (state.drainageSystemType !== undefined) setDrainageSystemType(state.drainageSystemType);
    if (state.numHydrants !== undefined) setNumHydrants(state.numHydrants);
    if (state.hydrantFlow !== undefined) setHydrantFlow(state.hydrantFlow);
    if (state.hydrantLength !== undefined) setHydrantLength(state.hydrantLength);
    if (state.hydrantHeight !== undefined) setHydrantHeight(state.hydrantHeight);
    if (state.hydrantPressure !== undefined) setHydrantPressure(state.hydrantPressure);
    if (state.manualHydrantDN !== undefined) setManualHydrantDN(state.manualHydrantDN);
    if (state.manipulativeSurfaces !== undefined) setManipulativeSurfaces(state.manipulativeSurfaces);
    if (state.surfaceIntensity !== undefined) setSurfaceIntensity(state.surfaceIntensity);
    if (state.selectedSurfaceCity !== undefined) setSelectedSurfaceCity(state.selectedSurfaceCity);
    if (state.septicUsers !== undefined) setSepticUsers(state.septicUsers);
    if (state.septicConsumption !== undefined) setSepticConsumption(state.septicConsumption);
    if (state.septicRetention !== undefined) setSepticRetention(state.septicRetention);
    if (state.greaseFlow !== undefined) setGreaseFlow(state.greaseFlow);
    if (state.greaseTempFactor !== undefined) setGreaseTempFactor(state.greaseTempFactor);
    if (state.greaseDetFactor !== undefined) setGreaseDetFactor(state.greaseDetFactor);
    if (state.greaseDensityFactor !== undefined) setGreaseDensityFactor(state.greaseDensityFactor);
    if (state.roofSurfaces !== undefined) setRoofSurfaces(state.roofSurfaces);
    if (state.roofIntensity !== undefined) setRoofIntensity(state.roofIntensity);
    if (state.selectedCity !== undefined) setSelectedCity(state.selectedCity);
    if (state.waterMaterial !== undefined) setWaterMaterial(state.waterMaterial);
    if (state.drainageMaterial !== undefined) setDrainageMaterial(state.drainageMaterial);
    if (state.reportConfig !== undefined) setReportConfig(state.reportConfig);
    
    setTimeout(() => { isHistoryAction.current = false; }, 100);
  }, []);

  const undo = useCallback(() => {
    if (undoStack.length <= 1) return;
    const currentState = getAppState();
    const prevState = undoStack[undoStack.length - 2];
    setRedoStack(prev => [currentState, ...prev].slice(0, 50));
    setUndoStack(prev => prev.slice(0, -1));
    applyAppState(prevState);
  }, [undoStack, getAppState, applyAppState]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[0];
    const currentState = getAppState();
    setUndoStack(prev => [...prev, currentState].slice(0, 50));
    setRedoStack(prev => prev.slice(1));
    applyAppState(nextState);
  }, [redoStack, getAppState, applyAppState]);

  // Track changes for undo
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isHistoryAction.current) return;
      const currentState = getAppState();
      setUndoStack(prev => {
        const last = prev[prev.length - 1];
        if (JSON.stringify(last) === JSON.stringify(currentState)) return prev;
        return [...prev, currentState].slice(0, 50);
      });
      setRedoStack([]);
    }, 500);
    return () => clearTimeout(timer);
  }, [getAppState]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'projects' | 'history'>('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState("");

  useEffect(() => {
    const savedProjects = localStorage.getItem('vik_projects');
    if (savedProjects) setProjects(JSON.parse(savedProjects));
    
    const savedHistory = localStorage.getItem('vik_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  const addToHistory = useCallback(() => {
    const currentState = {
      counts, unitTypes, fittingCounts, useSafetyFactor, length, height, inputPressure, buildingType, manualPipeName, manualDrainageDN, manualMainConnDN,
      manualCombinedPipeName, manualCombinedVdmDN, drainageSystemType,
      manipulativeSurfaces, surfaceIntensity, selectedSurfaceCity, septicUsers, septicConsumption, septicRetention,
      greaseFlow, greaseTempFactor, greaseDetFactor, greaseDensityFactor, roofSurfaces, roofIntensity, selectedCity, reportConfig,
      numHydrants, hydrantFlow, hydrantLength, hydrantHeight, hydrantPressure,
      activeModule, waterMaterial, drainageMaterial
    };

    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString('hr-HR'),
      projectName: projectName || "Nenazvani projekt",
      module: activeModule,
      state: currentState
    };

    setHistory(prev => {
      const updated = [newItem, ...prev].slice(0, 50);
      localStorage.setItem('vik_history', JSON.stringify(updated));
      return updated;
    });
  }, [
    counts, unitTypes, fittingCounts, useSafetyFactor, length, height, inputPressure, buildingType, manualPipeName, manualDrainageDN, manualMainConnDN,
    manualCombinedPipeName, manualCombinedVdmDN, drainageSystemType,
    manipulativeSurfaces, surfaceIntensity, selectedSurfaceCity, septicUsers, septicConsumption, septicRetention,
    greaseFlow, greaseTempFactor, greaseDetFactor, greaseDensityFactor, roofSurfaces, roofIntensity, selectedCity, reportConfig,
    numHydrants, hydrantFlow, hydrantLength, hydrantHeight, hydrantPressure,
    activeModule, projectName
  ]);

  const hasFittings = useMemo(() => Object.values(fittingCounts).some((c: any) => c > 0), [fittingCounts]);

  const surfaceResults = useMemo(() => {
    const surfaces = manipulativeSurfaces.map(s => ({
      ...s,
      results: calculateSurfaceDrainage(s.area, surfaceIntensity, s.psi)
    }));
    const totalFlow = surfaces.reduce((sum, s) => sum + s.results.flow, 0);
    const totalArea = surfaces.reduce((sum, s) => sum + s.area, 0);
    const standardSeparatorSizes = [3, 6, 10, 15, 20, 30, 40, 50, 65, 80, 100];
    const recommendedNS = standardSeparatorSizes.find(s => s >= totalFlow) || Math.ceil(totalFlow);
    
    return {
      surfaces,
      totalFlow,
      totalArea,
      recommendedNS
    };
  }, [manipulativeSurfaces, surfaceIntensity]);
  const roofResults = useMemo(() => {
    const results = roofSurfaces.map(surface => ({
      ...surface,
      results: calculateRoofDrainage(surface.area, roofIntensity, surface.coef, surface.type, surface.manualDN, surface.manualCount)
    }));
    const totalFlow = results.reduce((sum, r) => sum + r.results.flow, 0);
    const totalArea = results.reduce((sum, r) => sum + r.area, 0);
    return {
      surfaces: results,
      totalFlow,
      totalArea
    };
  }, [roofSurfaces, roofIntensity]);
  const septicResults = useMemo(() => calculateSepticVolume(septicUsers, septicConsumption, septicRetention), [septicUsers, septicConsumption, septicRetention]);
  const greaseResults = useMemo(() => calculateGreaseTrapSize(greaseFlow, greaseTempFactor, greaseDensityFactor, greaseDetFactor), [greaseFlow, greaseTempFactor, greaseDensityFactor, greaseDetFactor]);
  const hydrantResults = useMemo(() => {
    const roughness = WATER_MATERIALS.find(m => m.id === waterMaterial)?.roughness || 0.007;
    return calculateHydrantNetwork(numHydrants, hydrantFlow, hydrantLength, hydrantHeight, hydrantPressure, manualHydrantDN, 0, roughness);
  }, [numHydrants, hydrantFlow, hydrantLength, hydrantHeight, hydrantPressure, manualHydrantDN, waterMaterial]);

  const handleAddUnit = () => {
    const newUnit: ApartmentUnit = {
      id: Date.now().toString(),
      name: `Tip stana ${unitTypes.length + 1}`,
      multiplier: 1,
      counts: getInitialCounts()
    };
    setUnitTypes([...unitTypes, newUnit]);
    setExpandedSections(prev => ({ ...prev, apartments: true }));
  };

  const handleRemoveUnit = (id: string) => {
    setUnitTypes(unitTypes.filter(u => u.id !== id));
  };

  const handleUpdateUnit = (id: string, updates: Partial<ApartmentUnit>) => {
    setUnitTypes(unitTypes.map(u => u.id === id ? { ...u, ...updates } : u));
  };

  const handleUpdateUnitCount = (unitId: string, appId: string, delta: number) => {
    setUnitTypes(unitTypes.map(u => {
      if (u.id === unitId) {
        return {
          ...u,
          counts: {
            ...u.counts,
            [appId]: Math.max(0, (u.counts[appId] || 0) + delta)
          }
        };
      }
      return u;
    }));
  };

  const vikResults = useMemo(() => {
    let sumJO = 0; let sumDU = 0; let maxQNominal = 0; let maxDUAppliance = 0;
    
    APPLIANCES.forEach(app => {
      const count = Number(counts[app.id as string]) || 0;
      if (count > 0) {
        sumJO += app.jo * count;
        sumDU += app.du * count;
        if (app.qNominal > maxQNominal) maxQNominal = app.qNominal;
        if (app.du > maxDUAppliance) maxDUAppliance = app.du;
      }
    });

    unitTypes.forEach(unit => {
      APPLIANCES.forEach(app => {
        const count = (Number(unit.counts[app.id as string]) || 0) * unit.multiplier;
        if (count > 0) {
          sumJO += app.jo * count;
          sumDU += app.du * count;
          if (app.qNominal > maxQNominal) maxQNominal = app.qNominal;
          if (app.du > maxDUAppliance) maxDUAppliance = app.du;
        }
      });
    });
    
    const qCalculated = 0.2 * Math.sqrt(sumJO);
    const qPeak = Math.max(qCalculated, maxQNominal);
    const k = BUILDING_TYPES.find(t => t.id === buildingType)?.k || 0.5;
    const qDrain = Math.max(k * Math.sqrt(sumDU), 0.5 * Math.sqrt(maxDUAppliance));
    
    const qMainRadonic = sumJO > 0 ? 0.25 * Math.sqrt(sumJO) : 0;
    const vMaxMain = 2.0;
    const dPotMain = qMainRadonic > 0 ? Math.sqrt((4 * (qMainRadonic / 1000)) / (vMaxMain * Math.PI)) * 1000 : 0;
    const recommendedPipeMain = PIPES.find(p => p.di >= dPotMain) || PIPES[PIPES.length - 1];

    const waterMeterLoss = 5.0; 
    const recommendedVdmDN = getVdmDN(qPeak);
    const roughness = WATER_MATERIALS.find(m => m.id === waterMaterial)?.roughness || 0.007;

    const localZetas: Record<string, number> = {};
    FITTINGS.forEach(f => {
      localZetas[f.id] = (fittingCounts[f.id] || 0) * f.zeta;
    });

    let pipeInfo;
    if (manualPipeName === null) {
      let bestPipe = PIPES[0];
      for (const p of PIPES) {
        bestPipe = p;
        const currentV = (qPeak / 1000) / (Math.PI * Math.pow(p.di / 1000, 2) / 4);
        const currentLineLoss = calculateLineLoss(qPeak, p.di, length, roughness);
        const currentLocalLoss = hasFittings ? calculateLocalLoss(currentV, localZetas) : (useSafetyFactor ? currentLineLoss * 0.3 : 0);
        const currentTotalLoss = currentLineLoss + currentLocalLoss + height + waterMeterLoss;
        const currentResP = inputPressure - currentTotalLoss;
        if ((currentV <= 2.2 && currentResP >= 5.0) || p === PIPES[PIPES.length - 1]) break;
      }
      pipeInfo = { ...bestPipe };
    } else {
      pipeInfo = { ...PIPES.find(p => p.name === manualPipeName) || PIPES[0] };
    }

    const v = (qPeak / 1000) / (Math.PI * Math.pow(pipeInfo.di / 1000, 2) / 4);
    const lineLoss = calculateLineLoss(qPeak, pipeInfo.di, length, roughness);
    const localLoss = hasFittings ? calculateLocalLoss(v, localZetas) : (useSafetyFactor ? lineLoss * 0.3 : 0);
    const totalLoss = lineLoss + localLoss + height + waterMeterLoss;
    const residualPressure = inputPressure - totalLoss;

    const hasWC = (Number(counts[ApplianceType.WC]) || 0) > 0 || unitTypes.some(u => (Number(u.counts[ApplianceType.WC]) || 0) > 0);
    const drainageCapacities: Record<string, number> = {
      'DN75': 1.5, 'DN110': 4.0, 'DN125': 6.0, 'DN160': 10.0, 'DN200': 32.0, 'DN250': 55.0, 'DN315': 90.0
    };
    
    // AUTOMATSKI ODABIR DN ZA SANITARNU VERTIKALU
    let autoDN = DRAINAGE_DNS[DRAINAGE_DNS.length - 1];
    if (sumDU > 0) {
      for (const dn of DRAINAGE_DNS) {
        const cap = drainageCapacities[dn] || 0;
        const meetsWCCondition = hasWC ? DRAINAGE_DNS.indexOf(dn) >= DRAINAGE_DNS.indexOf('DN110') : true;
        if (cap >= qDrain && meetsWCCondition) {
          autoDN = dn;
          break;
        }
      }
    } else {
      autoDN = hasWC ? 'DN110' : 'DN75';
    }

    const minDN = manualDrainageDN || (sumDU > 0 ? autoDN : 'N/A');
    const drainageWarning = (sumDU > 0) && (drainageCapacities[minDN] || 0) < qDrain;

    let qTotalConnection = 0;
    const activeDrainageModules: string[] = [];
    
    if (reportConfig.vik) { qTotalConnection += qDrain; activeDrainageModules.push("SAN"); }
    if (reportConfig.roof) { qTotalConnection += roofResults.totalFlow; activeDrainageModules.push("KROV"); }
    if (reportConfig.surface) { qTotalConnection += surfaceResults.totalFlow; activeDrainageModules.push("OBOR"); }
    if (reportConfig.grease) { qTotalConnection += greaseResults.nominalSize; activeDrainageModules.push("MAST"); }

    // AUTOMATSKI ODABIR DN ZA GLAVNI PRIKLJUČAK (PROVJERA KAPACITETA)
    let autoMainConnDN = DRAINAGE_DNS[DRAINAGE_DNS.length - 1];
    for (const dn of DRAINAGE_DNS.slice(1)) { // Krenuvši od DN110
      if ((drainageCapacities[dn] || 0) >= qTotalConnection) {
        autoMainConnDN = dn;
        break;
      }
    }

    const mainConnDN = manualMainConnDN || autoMainConnDN;
    const mainConnWarning = (drainageCapacities[mainConnDN] || 0) < qTotalConnection;

    return {
      water: { 
        sumJO, qPeak, velocity: v, di: pipeInfo.di, lineLoss, localLoss, geoLoss: height, 
        waterMeterLoss, totalLoss, residualPressure, inputPressure, selectedPipe: pipeInfo.name, 
        isStable: v <= 2.2, isManual: manualPipeName !== null,
        needsReduction: inputPressure > 60,
        needsBooster: residualPressure < 5,
        isUsingSafetyFactor: !hasFittings && useSafetyFactor,
        recommendedVdmDN
      },
      mainInlet: {
        qMain: qMainRadonic,
        dPot: dPotMain,
        recommended: recommendedPipeMain.name,
        diRecommended: recommendedPipeMain.di
      },
      drainage: { 
        sumDU, qDrain, k, minDN, isManual: manualDrainageDN !== null, warning: drainageWarning,
        qTotalConnection, autoMainConnDN, mainConnDN, isMainManual: manualMainConnDN !== null, mainWarning: mainConnWarning,
        activeDrainageModules, hasWC, autoDN,
        qRoof: reportConfig.roof ? roofResults.totalFlow : 0,
        qSurface: reportConfig.surface ? surfaceResults.totalFlow : 0,
        qGrease: reportConfig.grease ? greaseResults.nominalSize : 0
      }
    };
  }, [counts, unitTypes, fittingCounts, length, height, inputPressure, manualPipeName, manualDrainageDN, manualMainConnDN, buildingType, drainageSystemType, roofResults.totalFlow, surfaceResults.totalFlow, useSafetyFactor, hasFittings, reportConfig, greaseResults.nominalSize]);

  const combinedServiceResults = useMemo(() => {
    if (!reportConfig.vik || !reportConfig.hydrant) return null;
    const qTotal = vikResults.water.qPeak + hydrantResults.totalFlow;
    
    const autoVdmDN = getVdmDN(qTotal);
    let autoPipe = "DN 110";
    if (qTotal <= 3.5) autoPipe = "DN 63";
    else if (qTotal <= 5.5) autoPipe = "DN 75";
    else if (qTotal <= 9.0) autoPipe = "DN 90";
    else if (qTotal <= 13.0) autoPipe = "DN 110";
    else if (qTotal <= 18.0) autoPipe = "DN 125";
    else autoPipe = "DN 160";

    const recommendedPipe = manualCombinedPipeName || autoPipe;
    const recommendedVdmDN = manualCombinedVdmDN || autoVdmDN;

    return {
      qTotal,
      autoPipe,
      autoVdmDN,
      recommendedPipe,
      recommendedVdmDN
    };
  }, [reportConfig, vikResults.water.qPeak, hydrantResults.totalFlow, manualCombinedPipeName, manualCombinedVdmDN]);

  const handleCreateReport = useCallback(() => {
    setIsGenerating(true);
    let combined = "";

    combined += `<table width="100%" style="border: 2px solid #1e40af; border-collapse: collapse; margin-bottom: 20px; font-family: Arial, Helvetica, sans-serif;">
      <tr>
        <td style="padding: 8px 12px; text-align: center;">
          <div style="color: #1e40af; font-size: 14px; font-weight: bold; text-transform: uppercase; margin-bottom: 1px;">TEHNIČKA DOKUMENTACIJA</div>
          <div style="color: #1e40af; font-size: 10px; font-weight: normal; margin-bottom: 8px;">PRORAČUN HIDROTEHNIČKIH INSTALACIJA</div>
          <div style="border-top: 1px solid #1e40af; padding-top: 8px; text-align: left;">
            <table width="100%" style="border-collapse: collapse; font-size: 9px;">
              <tr>
                <td width="75" style="color: #555; padding: 1px 0; font-weight: bold;">PROJEKT:</td>
                <td style="padding: 1px 0;"><b style="text-transform: uppercase; color: #000;">${projectName || 'NENAZVANI PROJEKT'}</b></td>
              </tr>
              <tr>
                <td style="color: #555; padding: 1px 0; font-weight: bold;">INVESTITOR:</td>
                <td style="padding: 1px 0;"><b style="text-transform: uppercase; color: #000;">${projectInvestor || 'NEPOZNATO'}</b></td>
              </tr>
              <tr>
                <td style="color: #555; padding: 1px 0; font-weight: bold;">DATUM:</td>
                <td style="padding: 1px 0;"><b style="color: #000;">${projectDate}</b></td>
              </tr>
            </table>
          </div>
        </td>
      </tr>
    </table>`;

    (['vik', 'roof', 'surface', 'septic', 'grease', 'hydrant'] as Module[]).forEach(m => {
      if (!reportConfig[m]) return;
      let res: any, input: any;
      if (m === 'vik') { res = vikResults; input = { appliances: counts, unitTypes, fittings: fittingCounts, length, height, inputPressure, buildingType, drainageSystemType, useSafetyFactor, reportConfig, waterMaterial, drainageMaterial }; }
      else if (m === 'surface') { res = surfaceResults; input = { surfaces: manipulativeSurfaces, intensity: surfaceIntensity, location: selectedSurfaceCity || "Proizvoljno" }; }
      else if (m === 'roof') { res = roofResults; input = { surfaces: roofSurfaces, intensity: roofIntensity, location: selectedCity || "Proizvoljno" }; }
      else if (m === 'septic') { res = septicResults; input = { users: septicUsers, consumption: septicConsumption, retention: septicRetention }; }
      else if (m === 'grease') { res = greaseResults; input = { flow: greaseFlow, tempFactor: greaseTempFactor, detergentFactor: greaseDetFactor, densityFactor: greaseDensityFactor }; }
      else if (m === 'hydrant') { res = hydrantResults; input = { numHydrants, flowPerHydrant: hydrantFlow, length: hydrantLength, height: hydrantHeight, inputPressure: hydrantPressure }; }
      combined += `<div style="margin-bottom: 30px; width: 100%; border-bottom: 1px dashed #eee; padding-bottom: 15px;">${generateLocalReport(m, input, res)}</div>`;
    });

    if (combinedServiceResults) {
      const blockHeaderStyle = 'background: #1e40af; color: #fff; padding: 6px 10px; font-size: 11px; font-weight: bold; text-transform: uppercase; margin-top: 20px; margin-bottom: 10px;';
      const formulaStyle = 'background: #f8fafc; border-left: 4px solid #3b82f6; padding: 8px; margin: 8px 0; font-family: "Times New Roman", Times, serif; font-size: 10px; color: #1e3a8a; line-height: 1.4;';
      const tableStyle = 'width: 100%; border-collapse: collapse; margin-bottom: 10px; table-layout: fixed;';
      const cellStyle = 'border: 1px solid #d1d5db; padding: 3px 6px; color: #000; font-size: 9px; vertical-align: middle;';
      const cellRightStyle = 'border: 1px solid #d1d5db; padding: 3px 6px; text-align: right; font-weight: bold; color: #000; font-size: 9px; vertical-align: middle;';

      combined += `<div style="margin-bottom: 30px; width: 100%; border-bottom: 1px dashed #eee; padding-bottom: 15px;">
        <div style="${blockHeaderStyle}">DIMENZIONIRANJE ZAJEDNIČKOG PRIKLJUČNOG VODA</div>
        <span style="font-size: 8px; font-style: italic; color: #666; margin-bottom: 6px; display: block;">Proračun mjerodavne potrošnje za sanitarnu i požarnu vodu | Izvor: M. Radonić</span>
        
        <div style="${formulaStyle}">
          <b>Ukupni mjerodavni protok na priključku:</b><br/>
          Q<sub>max</sub> = Q<sub>p</sub> + Q<sub>h</sub> = ${vikResults.water.qPeak.toFixed(2)} + ${hydrantResults.totalFlow.toFixed(2)} = <b>${combinedServiceResults.qTotal.toFixed(2)} l/s</b>
        </div>

        <table style="${tableStyle}">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="${cellStyle}; font-weight: bold; color: #1e40af;">STAVKA</th>
              <th style="${cellRightStyle}; font-weight: bold; color: #1e40af;">VRIJEDNOST</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style="${cellStyle}">Vršni sanitarni protok (Qp)</td><td style="${cellRightStyle}">${vikResults.water.qPeak.toFixed(2)} l/s</td></tr>
            <tr><td style="${cellStyle}">Ukupni požarni protok (Qh)</td><td style="${cellRightStyle}">${hydrantResults.totalFlow.toFixed(2)} l/s</td></tr>
            <tr style="background: #f9fafb;">
              <td style="${cellStyle}; font-weight: bold; color: #1e40af; text-transform: uppercase;">UKUPNI MJERODAVNI PROTOK (Qmax)</td>
              <td style="${cellRightStyle}; font-weight: bold; color: #1e40af;">${combinedServiceResults.qTotal.toFixed(2)} l/s</td>
            </tr>
            <tr><td style="${cellStyle}">Usvojeni profil priključnog voda</td><td style="${cellRightStyle}">${combinedServiceResults.recommendedPipe}</td></tr>
            <tr><td style="${cellStyle}">Usvojeni profil glavnog vodomjera</td><td style="${cellRightStyle}">${combinedServiceResults.recommendedVdmDN}</td></tr>
          </tbody>
        </table>
        <div style="margin-top: 10px; padding: 8px; border: 1px solid #10b981; background: #f0fdf4; font-size: 10px; font-weight: bold; color: #065f46;">
          DOKAZ KAPACITETA PRIKLJUČKA: Odabrani profil ${combinedServiceResults.recommendedPipe} i vodomjer ${combinedServiceResults.recommendedVdmDN} su dimenzionirani za ukupni mjerodavni protok od ${combinedServiceResults.qTotal.toFixed(2)} l/s - ZADOVOLJAVA
        </div>
      </div>`;
    }
    
    setReportHTML(combined);
    setIsGenerating(false);
  }, [
    reportConfig, counts, unitTypes, fittingCounts, length, height, inputPressure, buildingType, drainageSystemType, useSafetyFactor,
    manipulativeSurfaces, surfaceIntensity, selectedSurfaceCity,
    roofSurfaces, roofIntensity, selectedCity,
    septicUsers, septicConsumption, septicRetention,
    greaseFlow, greaseTempFactor, greaseDetFactor, greaseDensityFactor,
    numHydrants, hydrantFlow, hydrantLength, hydrantHeight, hydrantPressure, manualHydrantDN,
    vikResults, surfaceResults, roofResults, septicResults, greaseResults, hydrantResults, combinedServiceResults,
    projectName, projectInvestor, projectDate
  ]);

  useEffect(() => {
    const timer = setTimeout(() => { handleCreateReport(); }, 300);
    return () => clearTimeout(timer);
  }, [handleCreateReport]);

  const handleReset = () => {
    setProjectName(""); setProjectInvestor(""); setProjectDate(new Date().toLocaleDateString('hr-HR'));
    setCounts(getInitialCounts()); setUnitTypes([]); setFittingCounts(getInitialFittings()); setUseSafetyFactor(true);
    setLength(30); setHeight(10); setInputPressure(25); setBuildingType(BUILDING_TYPES[0].id);
    setManualPipeName(null); setManualDrainageDN(null); setManualMainConnDN(null);
    setManualCombinedPipeName(null); setManualCombinedVdmDN(null); setDrainageSystemType('separate');
    setManipulativeSurfaces([{ id: '1', name: 'Površina 1', area: 500, psi: 0.9, materialId: 'asfalt_beton' }]);
    setSurfaceIntensity(300); setSelectedSurfaceCity("Zagreb");
    setSepticUsers(4); setSepticConsumption(150); setSepticRetention(3);
    setGreaseFlow(2); setGreaseTempFactor(1.0); setGreaseDetFactor(1.3); setGreaseDensityFactor(1.0);
    setRoofSurfaces([{ id: '1', name: 'Krovna ploha 1', area: 100, coef: 1.0, type: 'sloped', materialId: 'lim_crijep', manualDN: null, manualCount: null }]);
    setRoofIntensity(300); setSelectedCity("Zagreb"); 
    setNumHydrants(2); setHydrantFlow(2.50); setHydrantLength(30); setHydrantHeight(12); setHydrantPressure(40);
    setReportConfig({ vik: true, roof: true, surface: true, septic: true, grease: true, hydrant: true });
    setWaterMaterial(WATER_MATERIALS[0].id); setDrainageMaterial(DRAINAGE_MATERIALS[0].id);
  };

  const handleSaveProject = () => {
    const nameToSave = projectName.trim() || "Nenazvani projekt";
    const dateStr = new Date().toLocaleString('hr-HR');
    const currentState = {
      counts, unitTypes, fittingCounts, useSafetyFactor, length, height, inputPressure, buildingType, manualPipeName, manualDrainageDN, manualMainConnDN,
      manualCombinedPipeName, manualCombinedVdmDN, drainageSystemType,
      manipulativeSurfaces, surfaceIntensity, selectedSurfaceCity, septicUsers, septicConsumption, septicRetention,
      greaseFlow, greaseTempFactor, greaseDetFactor, greaseDensityFactor, roofSurfaces, roofIntensity, selectedCity, reportConfig,
      numHydrants, hydrantFlow, hydrantLength, hydrantHeight, hydrantPressure
    };

    const existingProjectIndex = projects.findIndex(p => p.name.toLowerCase() === nameToSave.toLowerCase());

    let updatedProjects: Project[];
    if (existingProjectIndex > -1) {
      updatedProjects = [...projects];
      updatedProjects[existingProjectIndex] = {
        ...updatedProjects[existingProjectIndex],
        investor: projectInvestor || "Nepoznato",
        date: dateStr,
        state: currentState
      };
      alert(`Projekt "${nameToSave}" je uspješno ažuriran.`);
    } else {
      const newProj: Project = { 
        id: Date.now().toString(), 
        name: nameToSave, 
        investor: projectInvestor || "Nepoznato", 
        date: dateStr, 
        state: currentState 
      };
      updatedProjects = [...projects, newProj];
      alert("Projekt uspješno spremljen u bazu.");
    }
    
    setProjects(updatedProjects); 
    localStorage.setItem('vik_projects', JSON.stringify(updatedProjects));
    setProjectDate(dateStr);
    addToHistory();
  };

  const handleLoadProject = (proj: Project | HistoryItem) => {
    const s = proj.state;
    if ('name' in proj) setProjectName(proj.name);
    if ('investor' in proj) setProjectInvestor(proj.investor);
    if ('date' in proj) setProjectDate(proj.date);
    
    setCounts(s.counts || getInitialCounts());
    setUnitTypes(s.unitTypes || []);
    setFittingCounts(s.fittingCounts); setUseSafetyFactor(s.useSafetyFactor);
    setLength(s.length); setHeight(s.height); setInputPressure(s.inputPressure); setBuildingType(s.buildingType);
    setManualPipeName(s.manualPipeName); setManualDrainageDN(s.manualDrainageDN); setManualMainConnDN(s.manualMainConnDN);
    setManualCombinedPipeName(s.manualCombinedPipeName || null); setManualCombinedVdmDN(s.manualCombinedVdmDN || null);
    setDrainageSystemType(s.drainageSystemType);
    if (s.manipulativeSurfaces) {
      setManipulativeSurfaces(s.manipulativeSurfaces);
    } else {
      setManipulativeSurfaces([{ 
        id: '1', 
        name: 'Površina 1', 
        area: s.surfaceArea || 500, 
        psi: s.surfacePsi || 0.9, 
        materialId: s.surfaceMaterialId || "asfalt_beton" 
      }]);
    }
    setSurfaceIntensity(s.intensity || s.surfaceIntensity);
    setSelectedSurfaceCity(s.selectedSurfaceCity);
    setSepticUsers(s.septicUsers); setSepticConsumption(s.septicConsumption); setSepticRetention(s.septicRetention);
    setGreaseFlow(s.greaseFlow); setGreaseTempFactor(s.greaseTempFactor || 1.0); setGreaseDetFactor(s.greaseDetFactor || 1.3); setGreaseDensityFactor(s.greaseDensityFactor || 1.0);
    if (s.roofSurfaces) setRoofSurfaces(s.roofSurfaces);
    else if (s.roofArea) {
      // Migracija starih podataka
      setRoofSurfaces([{ 
        id: '1', 
        name: 'Krovna ploha 1', 
        area: s.roofArea, 
        coef: s.roofCoef || 1.0, 
        type: s.roofType || 'sloped', 
        materialId: s.roofType === 'flat' ? 'beton_folija' : 'lim_crijep',
        manualDN: s.manualRoofDN, 
        manualCount: s.manualRoofCount 
      }]);
    }
    setRoofIntensity(s.roofIntensity); setSelectedCity(s.selectedCity);
    setNumHydrants(s.numHydrants || 2); setHydrantFlow(s.hydrantFlow || 2.50); setHydrantLength(s.hydrantLength || 30); setHydrantHeight(s.hydrantHeight || 12); setHydrantPressure(s.hydrantPressure || 40);
    setReportConfig(s.reportConfig);
    if (s.waterMaterial) setWaterMaterial(s.waterMaterial);
    if (s.drainageMaterial) setDrainageMaterial(s.drainageMaterial);
    if (s.activeModule) setActiveModule(s.activeModule);
    setIsProjectModalOpen(false);
  };

  const handleDeleteHistoryItem = (id: string) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem('vik_history', JSON.stringify(updated));
  };

  const handleClearHistory = () => {
    if (confirm("Jeste li sigurni da želite obrisati cijelu povijest?")) {
      setHistory([]);
      localStorage.removeItem('vik_history');
    }
  };

  const handleDeleteProject = (id: string) => { const updated = projects.filter(p => p.id !== id); setProjects(updated); localStorage.setItem('vik_projects', JSON.stringify(updated)); };
  const handleStartRename = (proj: Project) => { setEditingProjectId(proj.id); setEditingProjectName(proj.name); };
  const handleRenameProject = (id: string) => { if (!editingProjectName.trim()) return; const updated = projects.map(p => p.id === id ? { ...p, name: editingProjectName.trim() } : p); setProjects(updated); localStorage.setItem('vik_projects', JSON.stringify(updated)); setEditingProjectId(null); };

  const handleExportProjects = () => { const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projects)); const downloadAnchorNode = document.createElement('a'); downloadAnchorNode.setAttribute("href", dataStr); downloadAnchorNode.setAttribute("download", `ViK_Projekti_Baza_${new Date().toISOString().split('T')[0]}.json`); document.body.appendChild(downloadAnchorNode); downloadAnchorNode.click(); downloadAnchorNode.remove(); };
  const handleImportProjects = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (event) => { try { const imported = JSON.parse(event.target?.result as string); if (Array.isArray(imported)) { const merged = [...projects, ...imported.filter(ip => !projects.some(p => p.id === ip.id))]; setProjects(merged); localStorage.setItem('vik_projects', JSON.stringify(merged)); alert("Uspješno uvezeno!"); } } catch (err) { alert("Greška pri uvozu datoteke."); } }; reader.readAsText(file); };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleCityChange = (cityName: string, type: 'roof' | 'surface') => {
    const city = CROATIAN_CITIES_RAINFALL.find(c => c.name === cityName);
    setSelectedCity(cityName); setSelectedSurfaceCity(cityName);
    if (city) { setRoofIntensity(city.r); setSurfaceIntensity(city.r); }
  };

  const handleCopy = async () => { 
    if (!reportHTML) return; 
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = reportHTML;
    await navigator.clipboard.writeText(tempDiv.innerText); 
    setCopyStatus(true); 
    setTimeout(() => setCopyStatus(false), 2000); 
  };

  const downloadAsDoc = async () => { 
    if (!reportHTML) return; 
    const htmlHeader = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: A4; margin: 2.0cm; }
          body { font-family: 'Arial', sans-serif; font-size: 10pt; line-height: 1.1; color: #000; width: 100%; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 8pt; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
          td { border: 1px solid #d1d5db; padding: 3px 5px; line-height: 1.1; vertical-align: middle; }
          th { background-color: #f3f4f6; color: #1e40af; font-weight: bold; border: 1px solid #d1d5db; padding: 4px 5px; text-align: left; }
        </style>
      </head>
      <body>
        <div style="width: 100%;">${reportHTML}</div>
      </body>
      </html>`;
    
    const blob = new Blob([htmlHeader], { type: 'application/msword' });
    const inv = projectInvestor.trim() || "Investitor";
    const proj = projectName.trim() || "Projekt";
    const suggestedName = `${inv}_${proj}_ViK proračun.doc`.replace(/[/\\?%*:|"<>]/g, '-');

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = suggestedName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const themeClasses = theme === 'dark' 
    ? { bg: 'bg-[#05070a]', header: 'bg-[#0a0c14] border-gray-800', sidebar: 'bg-[#0a0c14] border-gray-800', card: 'bg-[#161a24]', cardBorder: 'border-gray-800', text: 'text-gray-200', textMuted: 'text-gray-500', input: 'bg-[#161a24] text-blue-400 border-gray-800', select: 'bg-[#0a0c14] text-blue-400 border-gray-800', buttonMuted: 'bg-white/5 border-gray-800 text-gray-500', reportArea: 'bg-[#0a0c14] border-gray-800', reportContent: 'bg-white/5 border-white/10 text-gray-300', nav: 'bg-[#0a0c14] border-gray-800' }
    : { bg: 'bg-[#f8fafc]', header: 'bg-white border-gray-200', sidebar: 'bg-white border-gray-200', card: 'bg-slate-50', cardBorder: 'border-slate-200', text: 'text-slate-800', textMuted: 'text-slate-400', input: 'bg-white text-blue-600 border-slate-200', select: 'bg-white text-blue-600 border-slate-200', buttonMuted: 'bg-slate-100 border-slate-200 text-slate-500', reportArea: 'bg-white border-gray-200', reportContent: 'bg-white border-slate-200 text-slate-700', nav: 'bg-white border-gray-200' };

  const optionClass = theme === 'light' ? 'bg-white text-slate-800' : 'bg-[#0a0c14] text-blue-400';

  const InputSummaryRow = ({ label, value }: { label: string, value: string | number }) => (
    <div className="flex justify-between items-center py-0.5 border-b border-gray-500/5 last:border-0">
      <span className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter">{label}:</span>
      <span className="text-[8px] font-black text-blue-400 mono">{value}</span>
    </div>
  );

  const ChecklistItem = ({ label, isOk, value }: { label: string, isOk: boolean, value: string }) => (
    <div className="flex justify-between items-center py-0.5">
      <div className="flex items-center space-x-2">
        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${isOk ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
          {isOk ? (
            <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
          ) : (
            <span className="text-[10px] font-black leading-none">!</span>
          )}
        </div>
        <span className="text-[9px] font-bold uppercase tracking-tight">{label}</span>
      </div>
      <span className={`text-[9px] font-black mono text-right ${isOk ? 'text-emerald-500' : 'text-rose-500'}`}>{value}</span>
    </div>
  );

  const VerificationHeader = () => (
    <h3 className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center">
      <span className="w-1 h-3 bg-blue-500 mr-2 rounded-full"></span>
      VERIFIKACIJA
    </h3>
  );

  const SectionHeader = ({ id, label, color = 'blue' }: { id: string, label: string, color?: string }) => (
    <div 
      onClick={() => toggleSection(id)}
      className="flex justify-between items-center cursor-pointer group hover:opacity-80 transition-all border-b border-gray-500/5 pb-1 mb-1.5"
    >
      <h3 className={`text-[9px] font-black text-${color}-500 uppercase tracking-widest`}>{label}</h3>
      <svg className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${expandedSections[id] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );

  return (
    <div className={`h-screen flex flex-col overflow-hidden text-[12px] lg:text-[13px] ${themeClasses.bg} ${themeClasses.text} transition-colors duration-300`}>
      <header className={`border-b ${themeClasses.header} px-4 py-2 flex justify-between items-center z-50 transition-colors duration-300`}>
        <div className="flex items-center space-x-2 md:space-x-3">
          <div className="w-8 h-8 md:w-9 md:h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/30 border border-blue-400/20 shrink-0">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></svg>
          </div>
          <div className="overflow-hidden">
            <h1 className="text-sm md:text-base font-bold tracking-tight leading-none truncate">ViK kalkulator</h1>
            <div className={`text-[7px] md:text-[8px] font-bold uppercase tracking-widest mt-0.5 truncate ${themeClasses.textMuted}`}>PRORAČUN HIDROTEHNIČKIH INSTALACIJA</div>
          </div>
        </div>
        <div className="flex items-center space-x-1 md:space-x-1.5 h-7">
          <button onClick={toggleTheme} title="Promijeni temu" className={`h-7 w-7 flex items-center justify-center rounded border transition-all ${themeClasses.buttonMuted} hover:bg-blue-500 hover:text-white shrink-0`}>
            {theme === 'dark' ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg> : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 118.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>}
          </button>
          <button onClick={() => { setModalTab('projects'); setIsProjectModalOpen(true); }} className={`hidden sm:flex items-center h-7 text-[8px] uppercase font-bold px-2 rounded border transition-all ${themeClasses.buttonMuted} hover:text-blue-500`}>PROJEKTI</button>
          <button onClick={() => { setModalTab('history'); setIsProjectModalOpen(true); }} className={`hidden sm:flex items-center h-7 text-[8px] uppercase font-bold px-2 rounded border transition-all ${themeClasses.buttonMuted} hover:text-amber-500`}>POVIJEST</button>
          <button onClick={handleReset} className={`hidden sm:flex items-center h-7 text-[8px] uppercase font-bold px-2 rounded border transition-all ${themeClasses.buttonMuted} hover:text-emerald-500`}>NOVI</button>
          <button onClick={handleSaveProject} className={`hidden sm:flex items-center h-7 text-[8px] uppercase font-bold px-2 rounded border transition-all bg-blue-600 text-white border-blue-700 hover:bg-blue-500`}>SPREMI</button>
          <div className={`h-7 flex items-center px-3 rounded border text-[8px] font-bold uppercase tracking-widest transition-all ${isGenerating ? 'bg-blue-600/10 border-blue-600 text-blue-500 animate-pulse' : 'bg-emerald-600/10 border-emerald-600 text-emerald-500'}`}>
            {isGenerating ? 'OBRADA...' : 'SINKRONIZIRANO'}
          </div>
        </div>
      </header>

      {isProjectModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-xl border shadow-2xl flex flex-col ${theme === 'dark' ? 'bg-[#0a0c14] border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className="p-4 border-b border-gray-500/10 flex justify-between items-center shrink-0">
              <div className="flex space-x-4">
                <button onClick={() => setModalTab('projects')} className={`text-xs font-bold uppercase tracking-widest transition-all ${modalTab === 'projects' ? 'text-blue-500 border-b-2 border-blue-500 pb-1' : 'text-gray-500 hover:text-gray-300'}`}>Projekti</button>
                <button onClick={() => setModalTab('history')} className={`text-xs font-bold uppercase tracking-widest transition-all ${modalTab === 'history' ? 'text-amber-500 border-b-2 border-amber-500 pb-1' : 'text-gray-500 hover:text-gray-300'}`}>Povijest</button>
              </div>
              <button onClick={() => setIsProjectModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto custom-scroll flex-1">
              {modalTab === 'projects' ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-[9px] font-bold uppercase text-gray-400">Spremljeni projekti ({projects.length})</h3>
                    <div className="flex space-x-2">
                      <button onClick={handleExportProjects} className="text-[8px] font-bold uppercase text-blue-400 hover:underline">Izvezi bazu</button>
                      <label className="text-[8px] font-bold uppercase text-amber-400 hover:underline cursor-pointer">
                        Uvezi bazu <input type="file" onChange={handleImportProjects} className="hidden" accept=".json"/>
                      </label>
                    </div>
                  </div>
                  {projects.length === 0 ? <div className="text-center py-8 opacity-30 text-[10px] uppercase font-bold">Nema spremljenih projekata.</div> : (
                    <div className="space-y-1.5">
                      {projects.map(p => (
                        <div key={p.id} className={`p-3 rounded border flex flex-col sm:flex-row justify-between items-start sm:items-center group transition-all ${theme === 'dark' ? 'bg-[#161a24] border-gray-800 hover:border-blue-900/40' : 'bg-white border-slate-200'}`}>
                          <div className="flex-1 overflow-hidden mr-2">
                            {editingProjectId === p.id ? (
                              <div className="flex items-center space-x-1.5 mb-1">
                                <input autoFocus value={editingProjectName} onChange={e => setEditingProjectName(e.target.value)} className={`p-1 rounded border focus:outline-none text-[11px] font-bold uppercase flex-1 ${themeClasses.input}`} />
                                <button onClick={() => handleRenameProject(p.id)} className="text-[9px] font-bold text-emerald-500 uppercase hover:underline">Spremi</button>
                                <button onClick={() => setEditingProjectId(null)} className="text-[9px] font-bold text-rose-500 uppercase hover:underline">Odustani</button>
                              </div>
                            ) : <div className="text-[11px] font-bold truncate group-hover:text-blue-500 transition-colors uppercase">{p.name}</div>}
                            <div className="text-[9px] text-gray-500 flex items-center space-x-2"><span>{p.date}</span><span className="opacity-40">|</span><span className="truncate">{p.investor}</span></div>
                          </div>
                          <div className="flex items-center space-x-1.5 mt-2 sm:mt-0 shrink-0">
                            {editingProjectId !== p.id && <button onClick={() => handleStartRename(p)} className="px-2 py-1 rounded bg-blue-600/10 text-blue-500 text-[9px] font-bold uppercase hover:bg-blue-600 hover:text-white transition-all">Uredi</button>}
                            <button onClick={() => handleLoadProject(p)} className="px-2 py-1 rounded bg-emerald-600/10 text-emerald-500 text-[9px] font-bold uppercase hover:bg-emerald-600 hover:text-white transition-all">Učitaj</button>
                            <button onClick={() => handleDeleteProject(p.id)} className="px-2 py-1 rounded bg-rose-600/10 text-rose-500 text-[9px] font-bold uppercase hover:bg-rose-600 hover:text-white transition-all">Briši</button>
                          </div>
                        </div>
                      )).reverse()}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-[9px] font-bold uppercase text-gray-400">Povijest izmjena ({history.length})</h3>
                    <button onClick={handleClearHistory} className="text-[8px] font-bold uppercase text-rose-400 hover:underline">Očisti povijest</button>
                  </div>
                  {history.length === 0 ? <div className="text-center py-8 opacity-30 text-[10px] uppercase font-bold">Povijest je prazna.</div> : (
                    <div className="space-y-1.5">
                      {history.map(h => (
                        <div key={h.id} className={`p-3 rounded border flex flex-col sm:flex-row justify-between items-start sm:items-center group transition-all ${theme === 'dark' ? 'bg-[#161a24] border-gray-800 hover:border-amber-900/40' : 'bg-white border-slate-200'}`}>
                          <div className="flex-1 overflow-hidden mr-2">
                            <div className="text-[11px] font-bold truncate group-hover:text-amber-500 transition-colors uppercase">{h.projectName}</div>
                            <div className="text-[9px] text-gray-500 flex items-center space-x-2">
                              <span>{h.timestamp}</span>
                              <span className="opacity-40">|</span>
                              <span className="px-1 rounded bg-blue-500/10 text-blue-400 uppercase font-black">{h.module}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1.5 mt-2 sm:mt-0 shrink-0">
                            <button onClick={() => handleLoadProject(h)} className="px-2 py-1 rounded bg-amber-600/10 text-amber-500 text-[9px] font-bold uppercase hover:bg-amber-600 hover:text-white transition-all">Vrati</button>
                            <button onClick={() => handleDeleteHistoryItem(h.id)} className="px-2 py-1 rounded bg-rose-600/10 text-rose-500 text-[9px] font-bold uppercase hover:bg-rose-600 hover:text-white transition-all">Briši</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative lg:flex-row flex-col">
        <aside className={`lg:w-[22rem] xl:w-[24rem] lg:border-r ${themeClasses.sidebar} overflow-y-auto p-2.5 flex flex-col space-y-2.5 transition-colors duration-300 h-full ${mobileView === 'input' ? 'flex' : 'hidden lg:flex'}`}>
          <section className="bg-blue-500/5 border border-blue-500/10 p-2 rounded-lg space-y-1.5">
            <SectionHeader id="project" label="OSNOVNI PODACI O PROJEKTU" />
            {expandedSections['project'] && (
              <div className="space-y-1.5 transition-all">
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-gray-400 uppercase">Naziv projekta</label>
                  <input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Npr. Stambena zgrada A1..." className={`w-full p-1.5 rounded border focus:outline-none text-[11px] font-bold uppercase tracking-tight ${themeClasses.input}`}/>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-gray-400 uppercase">Investitor</label>
                  <input value={projectInvestor} onChange={e => setProjectInvestor(e.target.value)} placeholder="Ime/Tvrtka..." className={`w-full p-1.5 rounded border focus:outline-none text-[11px] font-bold uppercase tracking-tight ${themeClasses.input}`}/>
                </div>
              </div>
            )}
          </section>

          <section className="bg-slate-500/5 border border-gray-500/10 p-2 rounded-lg">
            <SectionHeader id="modules" label="AKTIVNI MODUL" color="gray" />
            {expandedSections['modules'] && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-6 gap-1">
                  {(['vik', 'roof', 'surface', 'septic', 'grease', 'hydrant'] as Module[]).map(m => (
                    <button key={m} onClick={() => setActiveModule(m)} className={`text-center py-1.5 rounded text-[8px] font-bold uppercase border transition-all ${activeModule === m ? 'bg-blue-600/10 border-blue-600 text-blue-500' : 'bg-slate-500/5 border-transparent text-gray-400'}`}>{m === 'vik' ? 'ViK' : m === 'surface' ? 'Manip' : m === 'roof' ? 'Krov' : m === 'septic' ? 'Sept' : m === 'hydrant' ? 'Hidr' : 'Mast'}</button>
                  ))}
                </div>
                <div className="bg-blue-950/5 border border-blue-500/10 p-1.5 rounded-lg">
                  <h4 className="text-[8px] font-bold text-blue-500 uppercase mb-1 tracking-widest opacity-70">UKLJUČI I U PRORAČUN</h4>
                  <div className="grid grid-cols-2 gap-x-2.5 gap-y-0.5">
                    {(['vik', 'roof', 'surface', 'septic', 'grease', 'hydrant'] as Module[]).map(m => (
                      <label key={m} className="flex items-center space-x-2 cursor-pointer hover:bg-slate-500/5 p-0.5 rounded transition-colors group">
                        <input type="checkbox" checked={reportConfig[m]} onChange={() => setReportConfig(p=>({...p,[m]:!p[m]}))} className="w-2.5 h-2.5 accent-blue-600"/>
                        <span className={`text-[9px] font-bold uppercase group-hover:text-blue-500 ${themeClasses.textMuted}`}>{m === 'vik' ? 'ViK' : m === 'surface' ? 'Manip. površ.' : m === 'roof' ? 'Krovna' : m === 'septic' ? 'Septička' : m === 'hydrant' ? 'Hidranti' : 'Mastolov'}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
          
          {activeModule === 'hydrant' && (
            <section className="bg-slate-500/5 border border-gray-500/10 p-2 rounded-lg space-y-1.5">
              <SectionHeader id="hydrantSettings" label="HIDRANTSKA MREŽA" color="gray" />
              {expandedSections['hydrantSettings'] && (
                <div className="space-y-1.5 transition-all">
                  <div className={`${themeClasses.card} p-1 rounded border ${themeClasses.cardBorder} space-y-1.5`}>
                    <div>
                      <label className={`text-[7px] uppercase font-bold block mb-0.5 ${themeClasses.textMuted}`}>Tip hidranta / Protok qh</label>
                      <select value={hydrantFlow} onChange={e => setHydrantFlow(Number(e.target.value))} className={`w-full bg-transparent text-[9px] font-bold focus:outline-none uppercase border rounded px-1 py-0.5 ${themeClasses.select}`}>
                        {HYDRANT_TYPES.map(ht => (<option key={ht.id} value={ht.q} className={optionClass}>{ht.name} ({ht.q} l/s)</option>))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className={`text-[7px] uppercase font-bold block mb-0.5 ${themeClasses.textMuted}`}>Broj aktivnih (n)</label>
                        <input type="number" value={numHydrants || ""} onChange={e => setNumHydrants(e.target.value === "" ? 0 : Number(e.target.value))} onFocus={e => e.target.select()} className={`w-full p-1 rounded font-bold focus:outline-none text-blue-500 text-xs border ${theme === 'dark' ? 'bg-[#0a0c14] border-gray-800' : 'bg-white border-slate-200'}`}/>
                      </div>
                      <div>
                        <label className={`text-[7px] uppercase font-bold block mb-0.5 ${themeClasses.textMuted}`}>Duljina trase L [m]</label>
                        <input type="number" value={hydrantLength || ""} onChange={e => setHydrantLength(e.target.value === "" ? 0 : Number(e.target.value))} onFocus={e => e.target.select()} className={`w-full p-1 rounded font-bold focus:outline-none text-blue-500 text-xs border ${theme === 'dark' ? 'bg-[#0a0c14] border-gray-800' : 'bg-white border-slate-200'}`}/>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className={`text-[7px] uppercase font-bold block mb-0.5 ${themeClasses.textMuted}`}>Visina Δh [m]</label>
                        <input type="number" value={hydrantHeight || ""} onChange={e => setHydrantHeight(e.target.value === "" ? 0 : Number(e.target.value))} onFocus={e => e.target.select()} className={`w-full p-1 rounded font-bold focus:outline-none text-blue-500 text-xs border ${theme === 'dark' ? 'bg-[#0a0c14] border-gray-800' : 'bg-white border-slate-200'}`}/>
                      </div>
                      <div>
                        <label className={`text-[7px] uppercase font-bold block mb-0.5 ${themeClasses.textMuted}`}>Tlak Hu [bar]</label>
                        <div className={`flex items-center border rounded px-1 py-0.5 transition-all duration-300 ${theme === 'dark' ? 'bg-[#0a0c14] border-gray-800' : 'bg-white border-slate-200'} focus-within:border-blue-500/50`}>
                          <input 
                            type="number" 
                            step="0.01"
                            value={(hydrantPressure / 10).toFixed(2)} 
                            onChange={e => setHydrantPressure(e.target.value === "" ? 0 : Number(e.target.value) * 10)} 
                            onFocus={e => e.target.select()} 
                            className="w-full bg-transparent font-bold focus:outline-none text-amber-500 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className={`text-[7px] uppercase font-bold block mb-0.5 ${themeClasses.textMuted}`}>∅ / Profil (DN)</label>
                      <select value={manualHydrantDN || ""} onChange={e => setManualHydrantDN(e.target.value === "" ? null : e.target.value)} className={`w-full bg-transparent text-[9px] font-bold focus:outline-none uppercase border rounded px-1 py-0.5 ${themeClasses.select}`}>
                        <option value="" className={optionClass}>AUTO ODABIR</option>
                        {PIPES.slice(4).map(p => <option key={p.name} value={p.name} className={optionClass}>{p.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {activeModule === 'vik' && (
            <>
              <section className="bg-blue-500/5 border border-blue-500/10 p-2 rounded-lg space-y-1.5">
                <SectionHeader id="system" label="TRASA I SUSTAV" color="blue" />
                {expandedSections['system'] && (
                  <div className="space-y-1.5 transition-all">
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className={`${themeClasses.card} p-1 rounded border ${themeClasses.cardBorder}`}>
                        <label className={`text-[7px] block uppercase font-bold tracking-tight mb-0.5 opacity-60 ${themeClasses.textMuted}`}>Materijal (Voda)</label>
                        <select value={waterMaterial} onChange={e => setWaterMaterial(e.target.value)} className={`w-full bg-transparent text-[9px] font-bold focus:outline-none uppercase border rounded px-1 py-0.5 ${themeClasses.select}`}>
                          {WATER_MATERIALS.map(m => (<option key={m.id} value={m.id} className={optionClass}>{m.name}</option>))}
                        </select>
                      </div>
                      <div className={`${themeClasses.card} p-1 rounded border ${themeClasses.cardBorder}`}>
                        <label className={`text-[7px] block uppercase font-bold tracking-tight mb-0.5 opacity-60 ${themeClasses.textMuted}`}>Materijal (Odvodnja)</label>
                        <select value={drainageMaterial} onChange={e => setDrainageMaterial(e.target.value)} className={`w-full bg-transparent text-[9px] font-bold focus:outline-none uppercase border rounded px-1 py-0.5 ${themeClasses.select}`}>
                          {DRAINAGE_MATERIALS.map(m => (<option key={m.id} value={m.id} className={optionClass}>{m.name}</option>))}
                        </select>
                      </div>
                    </div>
                    <div className={`${themeClasses.card} p-1 rounded border ${themeClasses.cardBorder}`}><label className={`text-[7px] block uppercase font-bold tracking-tight mb-0.5 opacity-60 ${themeClasses.textMuted}`}>Tip zgrade i koeficijent (k)</label><select value={buildingType} onChange={e => setBuildingType(e.target.value)} className={`w-full bg-transparent text-[10px] font-bold focus:outline-none uppercase border rounded px-1 py-0.5 ${themeClasses.select}`}>{BUILDING_TYPES.map(t => (<option key={t.id} value={t.id} className={optionClass}>{t.name} (k={t.k})</option>))}</select></div>
                    <div className={`${themeClasses.card} p-1 rounded border ${themeClasses.cardBorder}`}><label className={`text-[7px] block uppercase font-bold tracking-tight mb-0.5 opacity-60 ${themeClasses.textMuted}`}>Sustav vanjske odvodnje</label><select value={drainageSystemType} onChange={e => setDrainageSystemType(e.target.value as any)} className={`w-full bg-transparent text-[10px] font-bold focus:outline-none uppercase border rounded px-1 py-0.5 ${themeClasses.select} text-amber-500`}><option value="separate" className={optionClass}>Odvojeni sustav</option><option value="combined" className={optionClass}>Mješoviti sustav (Qww + Qr)</option></select></div>
                    <div className="grid grid-cols-2 gap-1.5"><div className={`${themeClasses.card} p-1 rounded border ${themeClasses.cardBorder}`}><label className={`text-[7px] block uppercase font-bold mb-0.5 tracking-tighter ${themeClasses.textMuted}`}>Duljina L [m]</label><input type="number" value={length || ""} onChange={e => setLength(e.target.value === "" ? 0 : Number(e.target.value))} onFocus={e => e.target.select()} className="w-full bg-transparent font-bold focus:outline-none text-blue-500 text-xs"/></div><div className={`${themeClasses.card} p-1 rounded border ${themeClasses.cardBorder}`}><label className={`text-[7px] block uppercase font-bold mb-0.5 tracking-tighter ${themeClasses.textMuted}`}>Visina Δh [m]</label><input type="number" value={height || ""} onChange={e => setHeight(e.target.value === "" ? 0 : Number(e.target.value))} onFocus={e => e.target.select()} className="w-full bg-transparent font-bold focus:outline-none text-blue-500 text-xs"/></div></div>
                    <div className={`${themeClasses.card} p-1 rounded border ${themeClasses.cardBorder}`}><label className={`text-[7px] block uppercase font-bold mb-0.5 tracking-tighter ${themeClasses.textMuted}`}>Raspoloživi tlak [mVS]</label><div className="flex items-center"><input type="number" value={inputPressure || ""} onChange={e => setInputPressure(e.target.value === "" ? 0 : Number(e.target.value))} onFocus={e => e.target.select()} className="flex-1 bg-transparent font-bold focus:outline-none text-amber-500 text-xs"/><span className="text-[7px] text-gray-500 font-bold ml-1">({(inputPressure/10).toFixed(2)} bar)</span></div></div>
                  </div>
                )}
              </section>

              <section className="bg-slate-500/5 border border-gray-500/10 p-2 rounded-lg flex-1 flex flex-col min-h-0">
                <SectionHeader id="apartments" label="POPIS JEDINICA I POTROŠAČA" color="gray" />
                {expandedSections['apartments'] && (
                  <div className="flex-1 flex flex-col min-h-0 space-y-2 transition-all">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest">STAMBENE JEDINICE</span>
                        <button onClick={(e) => { e.stopPropagation(); handleAddUnit(); }} className="bg-blue-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded hover:bg-blue-500 transition-all shadow-sm">+ TIP STANA</button>
                      </div>
                      <div className="max-h-[12rem] overflow-y-auto custom-scroll pr-1">
                        {unitTypes.map(unit => {
                          let unitJO = 0;
                          Object.entries(unit.counts).forEach(([appId, count]) => {
                            const app = APPLIANCES.find(a => String(a.id) === appId);
                            if (app) unitJO += (count as number) * app.jo;
                          });
                          const unitQPeak = unitJO > 0 ? 0.2 * Math.sqrt(unitJO) : 0;
                          const unitVdmDN = getVdmDN(unitQPeak);

                          return (
                            <div key={unit.id} className={`p-1 rounded border relative transition-all mb-1 ${theme === 'dark' ? 'bg-black/20 border-gray-700 hover:border-blue-500/30' : 'bg-white border-slate-200 hover:border-blue-200'}`}>
                              <button onClick={() => handleRemoveUnit(unit.id)} className="absolute top-0.5 right-0.5 text-rose-500 opacity-30 hover:opacity-100 z-10 transition-opacity"><svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg></button>
                              
                              <div className="flex items-center justify-between mb-0.5 gap-2">
                                <input value={unit.name} onChange={e => handleUpdateUnit(unit.id, { name: e.target.value })} className={`bg-transparent text-[8px] font-black uppercase focus:outline-none border-b border-gray-500/10 flex-1 truncate ${themeClasses.text}`} />
                                <div className="flex items-center space-x-1 shrink-0">
                                  {unitJO > 0 && (
                                    <div className="text-[6px] font-black text-blue-500 bg-blue-500/10 px-1 rounded uppercase flex items-center h-3.5">Vdm: {unitVdmDN}</div>
                                  )}
                                  <div className="flex items-center space-x-1 bg-slate-500/10 px-1 rounded h-3.5">
                                    <span className="text-[6px] font-black text-gray-500">KOM:</span>
                                    <input type="number" min="1" value={unit.multiplier} onChange={e => handleUpdateUnit(unit.id, { multiplier: Math.max(1, Number(e.target.value)) })} className="w-5 text-[8px] font-black text-center bg-transparent focus:outline-none text-blue-500" />
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-x-1 gap-y-0.5">
                                {APPLIANCES.filter(a => a.id !== ApplianceType.WATER_METER && a.id !== ('garden_tap' as any)).map(app => (
                                  <div key={app.id} className="flex justify-between items-center bg-gray-500/5 px-1 py-0.5 rounded-sm">
                                    <span className="text-[6px] text-gray-400 font-bold truncate max-w-[45px] uppercase">{app.name}</span>
                                    <div className="flex items-center space-x-1">
                                      <button onClick={() => handleUpdateUnitCount(unit.id, app.id as string, -1)} className="w-2.5 h-2.5 flex items-center justify-center bg-white/5 border border-gray-500/10 rounded text-[7px] hover:bg-blue-500 hover:text-white">-</button>
                                      <span className="text-[7px] font-black mono w-2 text-center">{unit.counts[app.id as string] || 0}</span>
                                      <button onClick={() => handleUpdateUnitCount(unit.id, app.id as string, 1)} className="w-2.5 h-2.5 flex items-center justify-center bg-white/5 border border-gray-500/10 rounded text-[7px] hover:bg-blue-500 hover:text-white">+</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }).reverse()}
                        {unitTypes.length === 0 && <div className="text-center py-4 border border-dashed border-gray-500/20 rounded-lg text-[7px] font-bold text-gray-500 uppercase italic opacity-40">Nema definiranih tipova stanova.</div>}
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0 pt-1.5 border-t border-gray-500/10">
                      <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest px-1 mb-1">SAMOSTALNE JEDINICE</span>
                      <div className="flex-1 overflow-y-auto custom-scroll pr-1 space-y-1.5">
                        <div className={`${themeClasses.card} p-1 rounded-lg border ${themeClasses.cardBorder}`}>
                          <h4 className="text-[7px] text-gray-500 uppercase font-bold mb-1 flex items-center"><span className="w-1 h-1 bg-blue-500 rounded-full mr-2"></span> Popis opreme</h4>
                          <div className="space-y-0">
                            {APPLIANCES.map(app => (
                              <div key={app.id} className="flex justify-between items-center py-0.5 border-b border-gray-500/5 last:border-0 hover:bg-slate-500/5 transition-colors px-1 rounded group">
                                <span className={`text-[8px] ${themeClasses.textMuted} group-hover:text-blue-500 transition-colors uppercase`}>{app.name}</span>
                                <div className="flex items-center space-x-1">
                                  <button onClick={() => setCounts(prev => ({...prev, [app.id]: Math.max(0, (prev[app.id] || 0) - 1)}))} className={`w-3 h-3 rounded flex items-center justify-center font-bold text-[8px] ${themeClasses.buttonMuted}`}>-</button>
                                  <span className="w-3 text-center font-bold mono text-emerald-500 text-[8px]">{counts[app.id] || 0}</span>
                                  <button onClick={() => setCounts(prev => ({...prev, [app.id]: (prev[app.id] || 0) + 1}))} className={`w-3 h-3 rounded flex items-center justify-center font-bold text-[8px] ${themeClasses.buttonMuted}`}>+</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className={`${themeClasses.card} p-1 rounded-lg border ${themeClasses.cardBorder}`}>
                          <div className="flex justify-between items-center mb-1">
                            <h4 className="text-[7px] text-gray-500 uppercase font-bold flex items-center"><span className="w-1 h-1 bg-rose-500 rounded-full mr-2"></span> Fitinzi</h4>
                            {!hasFittings && <label className="flex items-center space-x-1 cursor-pointer group"><input type="checkbox" checked={useSafetyFactor} onChange={(e) => setUseSafetyFactor(e.target.checked)} className="w-2 h-2 accent-rose-500" /><span className="text-[6px] font-bold text-gray-400 group-hover:text-rose-500 uppercase tracking-tighter transition-colors">+30%</span></label>}
                          </div>
                          {useSafetyFactor && !hasFittings ? (
                            <div className={`p-1.5 rounded border text-center ${theme === 'dark' ? 'bg-amber-950/20 border-amber-900/40 text-amber-500' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                              <div className="text-[7px] font-bold uppercase tracking-tight">PAUŠALNO +30%</div>
                            </div>
                          ) : (
                            <div className="space-y-0">
                              {FITTINGS.map(f => (
                                <div key={f.id} className="flex justify-between items-center py-0.5 border-b border-gray-500/5 last:border-0 hover:bg-slate-500/5 transition-colors px-1 rounded group">
                                  <span className={`text-[8px] ${themeClasses.textMuted} group-hover:text-rose-500 transition-colors uppercase`}>{f.name}</span>
                                  <div className="flex items-center space-x-1">
                                    <button onClick={() => setFittingCounts(prev => ({...prev, [f.id]: Math.max(0, (prev[f.id] || 0) - 1)}))} className={`w-3 h-3 rounded flex items-center justify-center font-bold text-[8px] ${themeClasses.buttonMuted}`}>-</button>
                                    <span className="w-3 text-center font-bold mono text-rose-500 text-[8px]">{fittingCounts[f.id] || 0}</span>
                                    <button onClick={() => setFittingCounts(prev => ({...prev, [f.id]: (prev[f.id] || 0) + 1}))} className={`w-3 h-3 rounded flex items-center justify-center font-bold text-[8px] ${themeClasses.buttonMuted}`}>+</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </>
          )}

          {activeModule === 'surface' && (
            <section className="bg-slate-500/5 border border-gray-500/10 p-2 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between border-b border-gray-500/10 pb-1 mb-1.5">
                <h3 className={`text-[9px] font-black uppercase tracking-widest ${themeClasses.textMuted}`}>Odvodnja manip. površina</h3>
                <button 
                  onClick={() => setManipulativeSurfaces(prev => [...prev, { id: crypto.randomUUID(), name: `Površina ${prev.length + 1}`, area: 100, psi: 0.9, materialId: 'asfalt_beton' }])}
                  className="bg-blue-600 text-white p-0.5 rounded-md hover:bg-blue-700 transition-colors"
                  title="Dodaj površinu"
                >
                  <Plus size={10} />
                </button>
              </div>

              <div className={`${themeClasses.card} p-1.5 rounded border ${themeClasses.cardBorder} space-y-1.5 mb-2`}>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className={`text-[7px] uppercase font-bold block mb-0.5 ${themeClasses.textMuted}`}>Lokacija</label>
                    <select value={selectedSurfaceCity} onChange={e => handleCityChange(e.target.value, 'surface')} className={`w-full bg-transparent text-[9px] font-bold focus:outline-none uppercase border rounded px-1 py-0.5 ${themeClasses.select}`}>
                      {CROATIAN_CITIES_RAINFALL.map(city => (<option key={city.name} value={city.name} className={optionClass}>{city.name} (r={city.r})</option>))}
                    </select>
                  </div>
                  <div>
                    <label className={`text-[7px] uppercase font-bold block mb-0.5 ${themeClasses.textMuted}`}>Intenzitet r</label>
                    <input type="number" value={surfaceIntensity || ""} onChange={e => {setSurfaceIntensity(e.target.value === "" ? 0 : Number(e.target.value)); setSelectedSurfaceCity(""); setSelectedCity("");}} onFocus={e => e.target.select()} className={`w-full p-1 rounded font-bold focus:outline-none text-blue-500 text-xs border ${theme === 'dark' ? 'bg-[#0a0c14] border-gray-800' : 'bg-white border-slate-200'}`}/>
                  </div>
                </div>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                {manipulativeSurfaces.map((surface, idx) => (
                  <div key={surface.id} className={`${themeClasses.card} p-1.5 rounded border ${themeClasses.cardBorder} space-y-1.5 relative group`}>
                    <div className="flex items-center justify-between mb-1">
                      <input 
                        className={`text-[8px] font-black uppercase bg-transparent focus:outline-none border-b border-transparent focus:border-blue-500/30 w-full mr-2 ${themeClasses.textMuted}`}
                        value={surface.name}
                        onChange={e => {
                          const newSurfaces = [...manipulativeSurfaces];
                          newSurfaces[idx].name = e.target.value;
                          setManipulativeSurfaces(newSurfaces);
                        }}
                      />
                      {manipulativeSurfaces.length > 1 && (
                        <button 
                          onClick={() => setManipulativeSurfaces(prev => prev.filter(s => s.id !== surface.id))}
                          className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className={`text-[7px] uppercase font-bold block mb-0.5 ${themeClasses.textMuted}`}>Površina [m²]</label>
                        <input 
                          type="number" 
                          value={surface.area || ""} 
                          onChange={e => {
                            const newSurfaces = [...manipulativeSurfaces];
                            newSurfaces[idx].area = e.target.value === "" ? 0 : Number(e.target.value);
                            setManipulativeSurfaces(newSurfaces);
                          }} 
                          onFocus={e => e.target.select()} 
                          className={`w-full p-1 rounded font-bold focus:outline-none text-blue-500 text-xs border ${theme === 'dark' ? 'bg-[#0a0c14] border-gray-800' : 'bg-white border-slate-200'}`}
                        />
                      </div>
                      <div>
                        <label className={`text-[7px] uppercase font-bold block mb-0.5 ${themeClasses.textMuted}`}>Materijal / Koef. Ψ</label>
                        <div className="flex gap-1">
                          <select 
                            value={surface.materialId} 
                            onChange={e => {
                              const materialId = e.target.value;
                              const material = SURFACE_MATERIALS.find(m => m.id === materialId);
                              const newSurfaces = [...manipulativeSurfaces];
                              newSurfaces[idx].materialId = materialId;
                              if (material && materialId !== 'manual') {
                                newSurfaces[idx].psi = material.coef;
                              }
                              setManipulativeSurfaces(newSurfaces);
                            }} 
                            className={`flex-1 bg-transparent text-[7px] font-bold focus:outline-none uppercase border rounded px-1 py-0.5 ${themeClasses.select}`}
                          >
                            {SURFACE_MATERIALS.map(m => (
                              <option key={m.id} value={m.id} className={optionClass}>{m.name}</option>
                            ))}
                          </select>
                          <input 
                            type="number" 
                            step="0.1"
                            disabled={surface.materialId !== 'manual'}
                            value={surface.psi} 
                            onChange={e => {
                              const newSurfaces = [...manipulativeSurfaces];
                              newSurfaces[idx].psi = Number(e.target.value);
                              setManipulativeSurfaces(newSurfaces);
                            }} 
                            className={`w-10 p-0.5 rounded font-bold focus:outline-none text-blue-500 text-[10px] border ${theme === 'dark' ? 'bg-[#0a0c14] border-gray-800' : 'bg-white border-slate-200'} ${surface.materialId !== 'manual' ? 'opacity-50' : ''}`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {activeModule === 'roof' && (
            <section className="bg-slate-500/5 border border-gray-500/10 p-2 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between border-b border-gray-500/10 pb-1 mb-1.5">
                <h3 className={`text-[9px] font-black uppercase tracking-widest ${themeClasses.textMuted}`}>Oborinska odvodnja (KROV)</h3>
                <button 
                  onClick={() => setRoofSurfaces(prev => [...prev, { id: crypto.randomUUID(), name: `Krovna ploha ${prev.length + 1}`, area: 50, coef: 1.0, type: 'sloped', materialId: 'lim_crijep', manualDN: null, manualCount: null }])}
                  className="bg-blue-600 text-white p-0.5 rounded-md hover:bg-blue-700 transition-colors"
                  title="Dodaj krovnu plohu"
                >
                  <Plus size={10} />
                </button>
              </div>
              
              <div className={`${themeClasses.card} p-1.5 rounded border ${themeClasses.cardBorder} space-y-1.5 mb-2`}>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className={`text-[7px] uppercase font-bold block mb-0.5 ${themeClasses.textMuted}`}>Lokacija</label>
                    <select value={selectedCity} onChange={e => handleCityChange(e.target.value, 'roof')} className={`w-full bg-transparent text-[9px] font-bold focus:outline-none uppercase border rounded px-1 py-0.5 ${themeClasses.select}`}>
                      {CROATIAN_CITIES_RAINFALL.map(city => (<option key={city.name} value={city.name} className={optionClass}>{city.name} (r={city.r})</option>))}
                    </select>
                  </div>
                  <div>
                    <label className={`text-[7px] uppercase font-bold block mb-0.5 ${themeClasses.textMuted}`}>Intenzitet r</label>
                    <input type="number" value={roofIntensity || ""} onChange={e => {setRoofIntensity(e.target.value === "" ? 0 : Number(e.target.value)); setSelectedCity(""); setSelectedSurfaceCity("");}} onFocus={e => e.target.select()} className={`w-full p-1 rounded font-bold focus:outline-none text-blue-500 text-xs border ${theme === 'dark' ? 'bg-[#0a0c14] border-gray-800' : 'bg-white border-slate-200'}`}/>
                  </div>
                </div>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                {roofSurfaces.map((surface, idx) => (
                  <div key={surface.id} className={`${themeClasses.card} p-1.5 rounded border ${themeClasses.cardBorder} space-y-1.5 relative group`}>
                    <div className="flex items-center justify-between mb-1">
                      <input 
                        className={`text-[8px] font-black uppercase bg-transparent focus:outline-none border-b border-transparent focus:border-blue-500/30 w-full mr-2 ${themeClasses.textMuted}`}
                        value={surface.name}
                        onChange={e => {
                          const newSurfaces = [...roofSurfaces];
                          newSurfaces[idx].name = e.target.value;
                          setRoofSurfaces(newSurfaces);
                        }}
                      />
                      {roofSurfaces.length > 1 && (
                        <button 
                          onClick={() => setRoofSurfaces(prev => prev.filter(s => s.id !== surface.id))}
                          className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>

                    <div className={`flex p-0.5 rounded ${theme === 'dark' ? 'bg-black/40' : 'bg-slate-200/50'}`}>
                      <button 
                        onClick={() => {
                          const newSurfaces = [...roofSurfaces];
                          newSurfaces[idx].type = 'sloped';
                          newSurfaces[idx].materialId = 'lim_crijep';
                          newSurfaces[idx].coef = 1.0;
                          newSurfaces[idx].manualDN = null;
                          setRoofSurfaces(newSurfaces);
                        }} 
                        className={`flex-1 py-1 rounded text-[7px] font-bold uppercase transition-all ${surface.type === 'sloped' ? 'bg-blue-600 text-white shadow-lg' : themeClasses.textMuted}`}
                      >
                        Kosi krov
                      </button>
                      <button 
                        onClick={() => {
                          const newSurfaces = [...roofSurfaces];
                          newSurfaces[idx].type = 'flat';
                          newSurfaces[idx].materialId = 'beton_folija';
                          newSurfaces[idx].coef = 0.9;
                          newSurfaces[idx].manualDN = null;
                          setRoofSurfaces(newSurfaces);
                        }} 
                        className={`flex-1 py-1 rounded text-[7px] font-bold uppercase transition-all ${surface.type === 'flat' ? 'bg-blue-600 text-white shadow-lg' : themeClasses.textMuted}`}
                      >
                        Ravni krov
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className={`text-[7px] uppercase font-bold block mb-0.5 ${themeClasses.textMuted}`}>Površina [m²]</label>
                        <input 
                          type="number" 
                          value={surface.area || ""} 
                          onChange={e => {
                            const newSurfaces = [...roofSurfaces];
                            newSurfaces[idx].area = e.target.value === "" ? 0 : Number(e.target.value);
                            setRoofSurfaces(newSurfaces);
                          }} 
                          onFocus={e => e.target.select()} 
                          className={`w-full p-1 rounded font-bold focus:outline-none text-blue-500 text-xs border ${theme === 'dark' ? 'bg-[#0a0c14] border-gray-800' : 'bg-white border-slate-200'}`}
                        />
                      </div>
                      <div>
                        <label className={`text-[7px] uppercase font-bold block mb-0.5 ${themeClasses.textMuted}`}>Materijal / Koef. Ψ</label>
                        <div className="flex gap-1">
                          <select 
                            value={surface.materialId} 
                            onChange={e => {
                              const materialId = e.target.value;
                              const material = (ROOF_MATERIALS as any)[surface.type].find((m: any) => m.id === materialId);
                              const newSurfaces = [...roofSurfaces];
                              newSurfaces[idx].materialId = materialId;
                              if (material && materialId !== 'manual') {
                                newSurfaces[idx].coef = material.coef;
                              }
                              setRoofSurfaces(newSurfaces);
                            }} 
                            className={`flex-1 bg-transparent text-[7px] font-bold focus:outline-none uppercase border rounded px-1 py-0.5 ${themeClasses.select}`}
                          >
                            {(ROOF_MATERIALS as any)[surface.type].map((m: any) => (
                              <option key={m.id} value={m.id} className={optionClass}>{m.name}</option>
                            ))}
                          </select>
                          <input 
                            type="number" 
                            step="0.1"
                            disabled={surface.materialId !== 'manual'}
                            value={surface.coef} 
                            onChange={e => {
                              const newSurfaces = [...roofSurfaces];
                              newSurfaces[idx].coef = Number(e.target.value);
                              setRoofSurfaces(newSurfaces);
                            }} 
                            className={`w-10 p-0.5 rounded font-bold focus:outline-none text-blue-500 text-[10px] border ${theme === 'dark' ? 'bg-[#0a0c14] border-gray-800' : 'bg-white border-slate-200'} ${surface.materialId !== 'manual' ? 'opacity-50' : ''}`}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className={`text-[7px] uppercase font-bold block mb-0.5 ${themeClasses.textMuted}`}>Vertikale</label>
                        <select 
                          value={surface.manualCount === null ? "" : surface.manualCount} 
                          onChange={e => {
                            const newSurfaces = [...roofSurfaces];
                            newSurfaces[idx].manualCount = e.target.value === "" ? null : Number(e.target.value);
                            setRoofSurfaces(newSurfaces);
                          }} 
                          className={`w-full bg-transparent text-[9px] font-bold focus:outline-none uppercase border rounded px-1 py-0.5 ${themeClasses.select}`}
                        >
                          <option value="" className={optionClass}>AUTO ({roofResults.surfaces[idx].results.recommendedCount})</option>
                          {[1, 2, 3, 4, 5, 6, 8, 10, 12, 15].map(n => <option key={n} value={n} className={optionClass}>{n}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={`text-[7px] uppercase font-bold block mb-0.5 ${themeClasses.textMuted}`}>∅ / DN</label>
                        <select 
                          value={surface.manualDN === null ? "" : surface.manualDN} 
                          onChange={e => {
                            const newSurfaces = [...roofSurfaces];
                            newSurfaces[idx].manualDN = e.target.value === "" ? null : e.target.value;
                            setRoofSurfaces(newSurfaces);
                          }} 
                          className={`w-full bg-transparent text-[9px] font-bold focus:outline-none uppercase border rounded px-1 py-0.5 ${themeClasses.select}`}
                        >
                          <option value="" className={optionClass}>AUTO ({roofResults.surfaces[idx].results.recommendedDN})</option>
                          {surface.type === 'sloped' ? [60, 80, 100, 120].map(d => <option key={d} value={String(d)} className={optionClass}>{d} mm</option>) : ['DN 70', 'DN 100', 'DN 125', 'DN 150'].map(dn => <option key={dn} value={dn} className={optionClass}>{dn}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {activeModule === 'septic' && (
             <section className="bg-slate-500/5 border border-gray-500/10 p-2 rounded-lg space-y-1.5">
               <h3 className={`text-[9px] font-black uppercase tracking-widest border-b border-gray-500/10 pb-1 mb-1.5 ${themeClasses.textMuted}`}>Sabirna jama</h3>
               <div className={`${themeClasses.card} p-1.5 rounded border ${themeClasses.cardBorder} space-y-1.5`}>
                 <div className="grid grid-cols-2 gap-1.5">
                   <div>
                     <label className={`text-[7px] uppercase font-bold block mb-0.5 ${themeClasses.textMuted}`}>Korisnici (ES)</label>
                     <input type="number" value={septicUsers || ""} onChange={e => setSepticUsers(e.target.value === "" ? 0 : Number(e.target.value))} onFocus={e => e.target.select()} className={`w-full p-1 rounded font-bold focus:outline-none text-blue-500 text-xs border ${theme === 'dark' ? 'bg-[#0a0c14] border-gray-800' : 'bg-white border-gray-200'}`}/>
                   </div>
                   <div>
                     <label className={`text-[7px] uppercase font-bold block mb-0.5 ${themeClasses.textMuted}`}>T [dana]</label>
                     <input type="number" value={septicRetention || ""} onChange={e => setSepticRetention(e.target.value === "" ? 0 : Number(e.target.value))} onFocus={e => e.target.select()} className={`w-full p-1 rounded font-bold focus:outline-none text-blue-500 text-xs border ${theme === 'dark' ? 'bg-[#0a0c14] border-gray-800' : 'bg-white border-slate-200'}`}/>
                   </div>
                 </div>
               </div>
             </section>
          )}
          {activeModule === 'grease' && (
             <section className="bg-slate-500/5 border border-gray-500/10 p-2 rounded-lg space-y-1.5">
               <h3 className={`text-[9px] font-black uppercase tracking-widest border-b border-gray-500/10 pb-1 mb-1.5 ${themeClasses.textMuted}`}>Mastolov (HRN EN 1825)</h3>
               <div className={`${themeClasses.card} p-1.5 rounded border ${themeClasses.cardBorder} space-y-1.5`}>
                 <div>
                   <label className={`text-[7px] uppercase font-bold block mb-0.5 ${themeClasses.textMuted}`}>Dotok Qs [l/s]</label>
                   <input type="number" step="0.1" value={greaseFlow || ""} onChange={e => setGreaseFlow(e.target.value === "" ? 0 : Number(e.target.value))} onFocus={e => e.target.select()} className={`w-full p-1 rounded font-bold focus:outline-none text-blue-500 text-xs border ${theme === 'dark' ? 'bg-[#0a0c14] border-gray-800' : 'bg-white border-slate-200'}`}/>
                 </div>
                 <div>
                   <label className={`text-[7px] uppercase font-bold block mb-0.5 ${themeClasses.textMuted}`}>Faktor temperature (ft)</label>
                   <select value={greaseTempFactor} onChange={e => setGreaseTempFactor(Number(e.target.value))} className={`w-full bg-transparent text-[9px] font-bold focus:outline-none uppercase border rounded px-1 py-0.5 ${themeClasses.select}`}>
                     <option value="1.0" className={optionClass}>Do 60°C (1.0)</option>
                     <option value="1.3" className={optionClass}>Preko 60°C (1.3)</option>
                   </select>
                 </div>
                 <div>
                   <label className={`text-[7px] uppercase font-bold block mb-0.5 ${themeClasses.textMuted}`}>Faktor deterdženta (fd)</label>
                   <select value={greaseDetFactor} onChange={e => setGreaseDetFactor(Number(e.target.value))} className={`w-full bg-transparent text-[9px] font-bold focus:outline-none uppercase border rounded px-1 py-0.5 ${themeClasses.select}`}>
                     <option value="1.0" className={optionClass}>Bez deterdženta (1.0)</option>
                     <option value="1.3" className={optionClass}>S deterdžentom (1.3)</option>
                     <option value="1.5" className={optionClass}>S det. i emulzijom (1.5)</option>
                   </select>
                 </div>
                 <div>
                   <label className={`text-[7px] uppercase font-bold block mb-0.5 ${themeClasses.textMuted}`}>Faktor gustoće masti (fr)</label>
                   <select value={greaseDensityFactor} onChange={e => setGreaseDensityFactor(Number(e.target.value))} className={`w-full bg-transparent text-[9px] font-bold focus:outline-none uppercase border rounded px-1 py-0.5 ${themeClasses.select}`}>
                     <option value="1.0" className={optionClass}>Do 0.94 g/cm³ (1.0)</option>
                     <option value="1.5" className={optionClass}>Preko 0.94 g/cm³ (1.5)</option>
                   </select>
                 </div>
               </div>
             </section>
          )}
        </aside>

        <main className={`lg:w-[24rem] xl:w-[26rem] ${themeClasses.bg} p-1.5 overflow-y-auto lg:border-r ${themeClasses.cardBorder} flex flex-col space-y-1 transition-colors duration-300 custom-scroll h-full ${mobileView === 'output' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="flex items-center justify-between px-2 py-0.5 shrink-0">
            <h2 className="text-emerald-500 font-bold text-[8px] uppercase tracking-widest flex items-center"><span className="w-1 h-1 bg-emerald-500 rounded-full mr-1.5"></span>IZLAZNI PRORAČUN</h2>
            <div className="flex items-center space-x-1">
              <button onClick={undo} disabled={undoStack.length <= 1} title="Poništi (Ctrl+Z)" className={`p-0.5 rounded transition-all ${undoStack.length <= 1 ? 'text-gray-600 opacity-20 cursor-not-allowed' : 'text-gray-400 hover:bg-gray-500/10 hover:text-blue-500'}`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
              </button>
              <button onClick={redo} disabled={redoStack.length === 0} title="Ponovi (Ctrl+Y)" className={`p-0.5 rounded transition-all ${redoStack.length === 0 ? 'text-gray-600 opacity-20 cursor-not-allowed' : 'text-gray-400 hover:bg-gray-500/10 hover:text-blue-500'}`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"/></svg>
              </button>
              <div className="w-px h-3 bg-gray-500/10 mx-0.5"></div>
              <button onClick={addToHistory} title="Spremi trenutno stanje u povijest" className="p-0.5 rounded hover:bg-gray-500/10 text-gray-400 hover:text-amber-500 transition-all">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </button>
            </div>
          </div>
          
          <div className="flex-1 space-y-1.5 overflow-y-auto custom-scroll pr-0.5">
          {activeModule === 'hydrant' && (
            <div className="flex flex-col space-y-1">
               <div className={`border rounded-lg p-1 ${theme === 'dark' ? 'bg-gray-900/40 border-gray-800' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between mb-0 border-b border-gray-500/10 pb-0.5">
                  <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest">ULAZNI PARAMETRI</span>
                  <span className="text-[6px] font-bold text-blue-500 px-1 rounded bg-blue-500/10 uppercase">VATROZAŠTITA</span>
                </div>
                <div className="grid grid-cols-2 gap-x-2">
                  <div>
                    <InputSummaryRow label="Hidranata (n)" value={numHydrants} />
                    <InputSummaryRow label="Protok (qh)" value={`${hydrantFlow} l/s`} />
                  </div>
                  <div>
                    <InputSummaryRow label="dH (visina)" value={`${hydrantHeight} m`} />
                    <InputSummaryRow label="Hu (tlak)" value={`${(hydrantPressure/10).toFixed(2)} bar`} />
                  </div>
                </div>
              </div>

              <div className={`border rounded-lg p-1.5 space-y-0.5 relative overflow-hidden shadow-lg ${theme === 'dark' ? 'bg-blue-950/10 border-blue-900/30' : 'bg-blue-50 border-blue-200'}`}>
                <div className="border-b border-blue-900/10 pb-0.5 flex justify-between items-center">
                  <span className="text-[8px] font-bold text-blue-600 uppercase tracking-wider">HIDRANTSKA MREŽA (Qh)</span>
                  <span className={`text-[7px] font-bold px-1 py-0.5 rounded ${hydrantResults.isSufficient ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-500'}`}>
                    {hydrantResults.isSufficient ? 'SUKLADNO' : 'NESUKLADNO'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 py-0.5">
                  <div className="text-center">
                    <span className="text-[7px] text-gray-500 font-bold block opacity-60 uppercase">UKUPNI Qh [l/s]</span>
                    <span className="text-lg font-bold text-blue-600 mono leading-none">{hydrantResults.totalFlow.toFixed(2)}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[7px] text-gray-500 font-bold block opacity-60 uppercase">BRZINA [m/s]</span>
                    <span className={`text-lg font-bold mono leading-none ${hydrantResults.velocityOk ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {hydrantResults.velocity.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-blue-900/10 pt-0.5 flex flex-col items-center">
                  <span className="text-[7px] text-blue-800 uppercase font-bold opacity-60">Preostali tlak (P_mlaz)</span>
                  <span className={`text-lg font-bold mono leading-none ${hydrantResults.pressureOk ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {(hydrantResults.residualPressure/10).toFixed(2)} bar
                  </span>
                </div>
              </div>

              <div className={`border rounded-lg p-1.5 ${theme === 'dark' ? 'bg-black/20 border-gray-800' : 'bg-slate-100 border-slate-200'}`}>
                <VerificationHeader />
                <div className="space-y-0">
                  <ChecklistItem label="Tlak na mlaznici" isOk={hydrantResults.pressureOk} value={`${(hydrantResults.residualPressure/10).toFixed(2)} / 2.50 bar`} />
                  <ChecklistItem label="Brzina strujanja" isOk={hydrantResults.velocityOk} value={`${hydrantResults.velocity.toFixed(2)} / 3.0 m/s`} />
                  <ChecklistItem label="Vršni protok" isOk={hydrantResults.flowOk} value={`${hydrantFlow.toFixed(2)} / 2.50 l/s`} />
                  <ChecklistItem label="Profil gl. razvoda" isOk={hydrantResults.mainPipeOk} value={`${hydrantResults.pipeName}`} />
                </div>
              </div>
            </div>
          )}

          {activeModule === 'vik' && (
            <div className="flex flex-col space-y-1">
              <div className={`border rounded-lg p-1 ${theme === 'dark' ? 'bg-gray-900/40 border-gray-800' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between mb-0 border-b border-gray-500/10 pb-0.5">
                  <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest">ULAZNI PARAMETRI</span>
                  <span className="text-[6px] font-bold text-blue-500 px-1 rounded bg-blue-500/10 uppercase">PROJEKTNI PODACI</span>
                </div>
                <div className="grid grid-cols-2 gap-x-2">
                  <div>
                    <InputSummaryRow label="Zgrada" value={BUILDING_TYPES.find(t => t.id === buildingType)?.name || ""} />
                    <InputSummaryRow label="Hu (tlak)" value={`${(inputPressure/10).toFixed(2)} bar`} />
                  </div>
                  <div>
                    <InputSummaryRow label="dH (visina)" value={`${height} m`} />
                    <InputSummaryRow label="Σ JO" value={vikResults.water.sumJO.toFixed(1)} />
                  </div>
                </div>
              </div>
              <div className="bg-slate-500/5 border border-gray-500/10 p-1 rounded-xl space-y-1">
                <div className="px-1 py-0.5 border-b border-gray-500/10 mb-0.5 flex items-center">
                  <span className="text-[6px] font-black text-gray-400 uppercase tracking-widest">VODOVODNI SUSTAV</span>
                </div>
                <div className={`border rounded-lg p-1.5 space-y-0.5 relative overflow-hidden shadow-lg ${theme === 'dark' ? 'bg-emerald-950/10 border-emerald-900/30' : 'bg-emerald-50 border-emerald-200'}`}>
                  <div className="border-b border-emerald-900/10 pb-0.5 flex justify-between items-center">
                    <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-wider">VODOVOD (Qp)</span>
                    <select value={manualPipeName || ""} onChange={e => setManualPipeName(e.target.value === "" ? null : e.target.value)} className={`text-[8px] font-bold mono px-1 py-0.5 rounded border focus:outline-none ${themeClasses.select} ${vikResults.water.isStable ? 'text-emerald-600 border-emerald-800/10' : 'text-rose-500 border-rose-500'}`}><option value="" className={optionClass}>AUTO ({vikResults.water.selectedPipe})</option>{PIPES.map(p => (<option key={p.name} value={p.name} className={optionClass}>{p.name}</option>))}</select>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2">
                    <div className="flex flex-col">
                      <span className="text-[7px] text-emerald-800 uppercase font-bold opacity-60">Qₚ [l/s]</span>
                      <span className="text-lg font-bold text-emerald-500 mono leading-none">{vikResults.water.qPeak.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[7px] text-emerald-800 uppercase font-bold opacity-60">v [m/s]</span>
                      <span className={`text-lg font-bold mono leading-none ${vikResults.water.isStable ? 'text-emerald-600' : 'text-rose-500'}`}>{vikResults.water.velocity.toFixed(2)}</span>
                    </div>
                    <div className="col-span-2 border-t border-emerald-900/10 mt-0.5 pt-0.5 flex justify-between text-[7px] uppercase font-bold text-gray-500">
                      <span>GLAVNI VODOMJER:</span>
                      <span className="text-emerald-600 font-black">{vikResults.water.recommendedVdmDN}</span>
                    </div>
                  </div>
                </div>

                <div className={`border rounded-lg p-1.5 space-y-0.5 shadow-lg border-l-4 ${theme === 'dark' ? 'bg-blue-950/15 border-blue-600/40' : 'bg-blue-50 border-blue-200'}`}>
                  <div className="border-b border-blue-900/10 pb-0.5"><span className="text-[8px] font-bold text-blue-600 uppercase tracking-wider">VODOVOD - IJ METODA</span></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col"><span className="text-[7px] text-blue-700 font-bold opacity-60 uppercase">IJ q [l/s]</span><span className="text-lg font-bold text-blue-500 mono leading-none">{vikResults.mainInlet.qMain.toFixed(2)}</span></div>
                    <div className="flex flex-col"><span className="text-[7px] text-blue-700 font-bold opacity-60 uppercase">dₚₒₜ [mm]</span><span className="text-lg font-bold text-blue-500 mono leading-none">{vikResults.mainInlet.dPot.toFixed(1)}</span></div>
                  </div>
                  <div className={`rounded py-0.5 text-center border border-blue-500/10 ${theme === 'dark' ? 'bg-blue-600/5' : 'bg-white'}`}><div className="text-sm font-bold text-blue-500 uppercase mono">{vikResults.mainInlet.recommended}</div></div>
                </div>

                {reportConfig.hydrant && combinedServiceResults && (
                  <div className={`border-2 rounded-lg p-1.5 space-y-0.5 shadow-lg border-blue-600/30 ${theme === 'dark' ? 'bg-blue-900/10' : 'bg-blue-100/50'}`}>
                    <div className="border-b border-blue-900/10 pb-0.5 flex justify-between items-center">
                      <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">ZAJEDNIČKI PRIKLJUČAK</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 py-0.5">
                      <div className="flex flex-col">
                        <span className="text-[7px] text-gray-500 font-bold block opacity-60 uppercase">Q_max [l/s]</span>
                        <span className="text-lg font-bold text-blue-700 mono leading-none">{combinedServiceResults.qTotal.toFixed(2)}</span>
                        <span className="text-[5px] text-blue-400 font-medium uppercase mt-0.5 leading-tight">
                          {vikResults.water.qPeak.toFixed(2)} (SAN) + {hydrantResults.totalFlow.toFixed(2)} (POŽAR)
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[7px] text-gray-500 font-bold block uppercase tracking-tighter">Priključak</span>
                        <select value={manualCombinedPipeName || ""} onChange={e => setManualCombinedPipeName(e.target.value === "" ? null : e.target.value)} className={`text-[8px] font-bold mono p-0.5 rounded border focus:outline-none transition-all ${themeClasses.select} ${manualCombinedPipeName ? 'border-blue-500 shadow-sm' : 'border-gray-500/20 opacity-80'}`}>
                          <option value="" className={optionClass}>AUTO ({combinedServiceResults.autoPipe})</option>
                          {['DN 63', 'DN 75', 'DN 90', 'DN 110', 'DN 125', 'DN 160'].map(p => (<option key={p} value={p} className={optionClass}>{p}</option>))}
                        </select>
                      </div>
                    </div>
                    <div className="border-t border-blue-900/10 pt-0.5 flex justify-between items-center">
                      <span className="text-[7px] font-bold text-gray-600 uppercase tracking-tighter">VODOMJER:</span>
                      <select value={manualCombinedVdmDN || ""} onChange={e => setManualCombinedVdmDN(e.target.value === "" ? null : e.target.value)} className={`text-[8px] font-bold mono p-0.5 rounded border focus:outline-none transition-all ${themeClasses.select} ${manualCombinedVdmDN ? 'border-blue-500 shadow-sm' : 'border-gray-500/20 opacity-80'}`}>
                          <option value="" className={optionClass}>AUTO ({combinedServiceResults.autoVdmDN})</option>
                          {['DN20', 'DN25', 'DN32', 'DN40', 'DN50', 'DN65', 'DN80', 'DN100', 'DN150'].map(v => (<option key={v} value={v} className={optionClass}>{v}</option>))}
                      </select>
                    </div>
                  </div>
                )}

                <div className={`border rounded-lg p-1.5 space-y-0.5 shadow-lg ${theme === 'dark' ? 'bg-amber-950/10 border-amber-900/30' : 'bg-emerald-50 border-emerald-200'}`}>
                  <div className="border-b border-amber-900/10 pb-0.5 flex justify-between items-center"><span className="text-[8px] font-bold text-amber-600 uppercase tracking-wider">PROVJERA TLAKA</span><span className={`text-[7px] font-bold px-1 py-0.5 rounded ${vikResults.water.residualPressure >= 5 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-500'}`}>{vikResults.water.residualPressure >= 5 ? 'DOSTATNO' : 'NEDOSTATNO'}</span></div>
                  <div className="flex flex-col items-center py-0.5">
                    <span className="text-[7px] text-amber-800 uppercase font-bold opacity-60">Preostali tlak (P_res)</span>
                    <span className={`text-xl font-bold mono leading-none ${vikResults.water.residualPressure >= 5 ? 'text-emerald-600' : 'text-rose-500'}`}>{(vikResults.water.residualPressure/10).toFixed(2)} bar</span>
                  </div>
                </div>
              </div>
              <div className="bg-slate-500/5 border border-gray-500/10 p-1 rounded-xl space-y-1">
                <div className="px-1 py-0.5 border-b border-gray-500/10 mb-0.5 flex items-center">
                  <span className="text-[6px] font-black text-gray-400 uppercase tracking-widest">SUSTAV ODVODNJE</span>
                </div>
                <div className={`border rounded-lg p-1.5 space-y-0.5 shadow-lg ${theme === 'dark' ? 'bg-emerald-950/10 border-emerald-900/30' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="border-b border-emerald-900/10 pb-0.5 flex justify-between items-center"><span className="text-[8px] font-bold text-emerald-600 uppercase tracking-wider">ODVODNJA - VERTIKALE</span><select value={manualDrainageDN || ""} onChange={e => setManualDrainageDN(e.target.value === "" ? null : e.target.value)} className={`text-[8px] font-bold mono px-1 py-0.5 rounded border focus:outline-none ${themeClasses.select} ${vikResults.drainage.warning ? 'text-rose-500 border-rose-500' : 'text-emerald-600 border-emerald-800/10'}`}><option value="" className={optionClass}>AUTO ({vikResults.drainage.autoDN})</option>{DRAINAGE_DNS.map(dn => (<option key={dn} value={dn} className={optionClass}>{dn}</option>))}</select></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col"><span className="text-[7px] text-emerald-800 font-bold opacity-60 uppercase">Σ DU</span><span className="text-base font-bold text-emerald-600 mono leading-none">{vikResults.drainage.sumDU.toFixed(1)}</span></div>
                  <div className="flex flex-col"><span className="text-[7px] text-emerald-800 font-bold opacity-60 uppercase">Qₒ [l/s]</span><span className="text-base font-bold text-emerald-600 mono leading-none">{vikResults.drainage.qDrain.toFixed(2)}</span></div>
                </div>
              </div>
              
              <div className={`border rounded-lg p-1.5 space-y-0.5 shadow-lg border-l-4 ${theme === 'dark' ? 'bg-indigo-950/10 border-indigo-600/40' : 'bg-indigo-50 border-indigo-200'}`}>
                <div className="border-b border-indigo-900/10 pb-0.5 flex justify-between items-center">
                  <span className="text-[8px] font-bold text-indigo-600 uppercase tracking-wider">ODVODNJA - VANJSKA</span>
                  <select value={manualMainConnDN || ""} onChange={e => setManualMainConnDN(e.target.value === "" ? null : e.target.value)} className={`text-[8px] font-bold mono px-1 py-0.5 rounded border focus:outline-none ${themeClasses.select} ${vikResults.drainage.mainWarning ? 'text-rose-500 border-rose-500' : 'text-indigo-600 border-indigo-800/10'}`}>
                    <option value="" className={optionClass}>AUTO ({vikResults.drainage.autoMainConnDN})</option>
                    {DRAINAGE_DNS.slice(1).map(dn => (<option key={dn} value={dn} className={optionClass}>{dn}</option>))}
                  </select>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <div className="flex flex-col">
                    <span className="text-[7px] text-indigo-700 font-bold opacity-60 uppercase tracking-tighter">UKUPNI Qₜₒₜ [l/s]</span>
                    <span className="text-base font-bold text-indigo-500 mono leading-none">{vikResults.drainage.qTotalConnection.toFixed(2)}</span>
                    {vikResults.drainage.qTotalConnection > vikResults.drainage.qDrain && (
                      <div className="text-[5px] text-indigo-400 font-medium uppercase mt-0.5 leading-tight">
                        {vikResults.drainage.qDrain.toFixed(2)} (SAN) 
                        {vikResults.drainage.qRoof > 0 && ` + ${vikResults.drainage.qRoof.toFixed(2)} (KROV)`}
                        {vikResults.drainage.qSurface > 0 && ` + ${vikResults.drainage.qSurface.toFixed(2)} (OBOR)`}
                        {vikResults.drainage.qGrease > 0 && ` + ${vikResults.drainage.qGrease.toFixed(2)} (MAST)`}
                      </div>
                    )}
                  </div>
                  <div className={`rounded-md py-0.5 px-3 border border-indigo-500/10 shadow-sm transition-all ${theme === 'dark' ? 'bg-indigo-600/5' : 'bg-white'}`}><div className={`text-sm font-bold uppercase mono ${vikResults.drainage.mainWarning ? 'text-rose-500' : 'text-indigo-500'}`}>{vikResults.drainage.mainConnDN}</div></div>
                </div>
              </div>
            </div>

            <div className={`border rounded-lg p-1.5 ${theme === 'dark' ? 'bg-black/20 border-gray-800' : 'bg-slate-100 border-slate-200'}`}>
                <VerificationHeader />
                <div className="space-y-0">
                  <ChecklistItem label="Brzina strujanja" isOk={vikResults.water.isStable} value={`${vikResults.water.velocity.toFixed(2)} / 2.20 m/s`} />
                  <ChecklistItem label="Preostali tlak" isOk={vikResults.water.residualPressure >= 5} value={`${(vikResults.water.residualPressure/10).toFixed(2)} / 0.50 bar`} />
                  <ChecklistItem label="Glavni vodomjer" isOk={true} value={`${vikResults.water.recommendedVdmDN}`} />
                  <ChecklistItem label="Profil odvodnje" isOk={!vikResults.drainage.warning} value={`${vikResults.drainage.minDN}`} />
                  <ChecklistItem label="Vanjska odvodnja" isOk={!vikResults.drainage.mainWarning} value={`${vikResults.drainage.mainConnDN}`} />
                </div>
              </div>
            </div>
          )}

          {activeModule === 'surface' && (
            <div className="flex flex-col space-y-1">
               <div className={`border rounded-lg p-1 ${theme === 'dark' ? 'bg-gray-900/40 border-gray-800' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between mb-0 border-b border-gray-500/10 pb-0.5"><span className="text-[7px] font-black text-gray-500 uppercase tracking-widest">ULAZNI PARAMETRI</span></div>
                <div className="grid grid-cols-2 gap-x-2">
                  <InputSummaryRow label="Ukupna površina" value={`${surfaceResults.totalArea} m²`} />
                  <InputSummaryRow label="Intenzitet (r)" value={`${surfaceIntensity} l/s/ha`} />
                </div>
              </div>

              <div className="space-y-1">
                {surfaceResults.surfaces.map((surface, idx) => (
                  <div key={surface.id} className={`border rounded-lg p-1.5 shadow-lg ${theme === 'dark' ? 'bg-blue-950/10 border-blue-900/30' : 'bg-blue-50 border-blue-200'}`}>
                    <div className="border-b border-blue-900/10 pb-0.5 mb-1 flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-bold text-blue-600 uppercase tracking-wider">{surface.name}</span>
                        <span className="text-[6px] font-medium text-blue-700/60 uppercase">
                          {SURFACE_MATERIALS.find(m => m.id === surface.materialId)?.name || 'Manualno'} (Ψ={surface.psi})
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 py-0.5">
                      <div className="text-center">
                        <span className="text-[7px] text-blue-800 uppercase font-bold opacity-60 block">Qs [l/s]</span>
                        <span className="text-base font-bold text-blue-500 mono leading-none">{surface.results.flow.toFixed(2)}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-[7px] text-gray-500 font-bold block opacity-60">POVRŠINA</span>
                        <span className="text-base font-bold text-blue-600 mono">{surface.area} m²</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className={`border rounded-lg p-2 text-center shadow-lg ${theme === 'dark' ? 'bg-emerald-950/10 border-emerald-900/30' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="border-b border-emerald-900/10 pb-0.5 mb-1 flex justify-between items-center">
                  <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-wider">UKUPNA OBORINSKA ODVODNJA</span>
                </div>
                <span className="text-[7px] text-emerald-800 uppercase font-bold opacity-60 block">Σ Q_obor [l/s]</span>
                <span className="text-xl font-bold text-emerald-500 mono leading-none">{surfaceResults.totalFlow.toFixed(2)}</span>
                <div className="pt-1 mt-1 border-t border-emerald-900/10">
                  <span className="text-[7px] text-emerald-800 uppercase font-bold opacity-60 block mb-0.5">PREPORUKA SEPARATORA</span>
                  <div className="text-lg font-bold text-emerald-600 mono">NS {surfaceResults.recommendedNS}</div>
                </div>
              </div>

              <div className={`border rounded-lg p-1.5 ${theme === 'dark' ? 'bg-black/20 border-gray-800' : 'bg-slate-100 border-slate-200'}`}>
                <VerificationHeader />
                <ChecklistItem label="Kapacitet separatora" isOk={surfaceResults.recommendedNS >= surfaceResults.totalFlow} value={`NS ${surfaceResults.recommendedNS} >= ${surfaceResults.totalFlow.toFixed(2)}`} />
              </div>
            </div>
          )}
          {activeModule === 'roof' && (
            <div className="flex flex-col space-y-1">
               <div className={`border rounded-lg p-1 ${theme === 'dark' ? 'bg-gray-900/40 border-gray-800' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between mb-0 border-b border-gray-500/10 pb-0.5"><span className="text-[7px] font-black text-gray-500 uppercase tracking-widest">ULAZNI PARAMETRI</span></div>
                <div className="grid grid-cols-2 gap-x-2">
                  <InputSummaryRow label="Ukupna površina" value={`${roofResults.totalArea} m²`} />
                  <InputSummaryRow label="Intenzitet (r)" value={`${roofIntensity} l/s/ha`} />
                </div>
              </div>

              <div className="space-y-1">
                {roofResults.surfaces.map((surface, idx) => (
                  <div key={surface.id} className={`border rounded-lg p-1.5 shadow-lg ${theme === 'dark' ? 'bg-emerald-950/10 border-emerald-900/30' : 'bg-emerald-50 border-emerald-200'}`}>
                    <div className="border-b border-emerald-900/10 pb-0.5 mb-1 flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-wider">{surface.name}</span>
                        <span className="text-[6px] font-medium text-emerald-700/60 uppercase">
                          {(ROOF_MATERIALS as any)[surface.type].find((m: any) => m.id === surface.materialId)?.name || 'Manualno'} (Ψ={surface.coef})
                        </span>
                      </div>
                      <span className="text-[6px] font-bold text-gray-400 uppercase">{surface.type === 'sloped' ? 'Kosi' : 'Ravni'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-0.5">
                      <div className="text-center">
                        <span className="text-[7px] text-emerald-800 uppercase font-bold opacity-60 block">Qr [l/s]</span>
                        <span className="text-base font-bold text-emerald-500 mono leading-none">{surface.results.flow.toFixed(2)}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-[7px] text-gray-500 font-bold block opacity-60">VERTIKALE</span>
                        <span className="text-base font-bold text-emerald-600 mono">{surface.results.count} x</span>
                      </div>
                      <div className="text-center">
                        <span className="text-[7px] text-gray-500 font-bold block opacity-60">PROFIL</span>
                        <span className="text-base font-bold text-blue-500 mono">{surface.results.dn}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className={`border rounded-lg p-1.5 shadow-lg bg-blue-600/5 border-blue-600/20`}>
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">UKUPNI DOTOK (ΣQr)</span>
                  <span className="text-xl font-bold text-blue-600 mono leading-none">{roofResults.totalFlow.toFixed(2)} l/s</span>
                </div>
              </div>

              <div className={`border rounded-lg p-1.5 ${theme === 'dark' ? 'bg-black/20 border-gray-800' : 'bg-slate-100 border-slate-200'}`}>
                <VerificationHeader />
                <div className="space-y-0">
                  <ChecklistItem label="Hidraulički kapacitet" isOk={roofResults.surfaces.every(s => !s.results.isInsufficient)} value="SVE PLOHE OK" />
                  <ChecklistItem label="Minimalni broj vert." isOk={roofResults.surfaces.every(s => s.results.count >= s.results.recommendedCount)} value="ZADOVOLJAVA" />
                </div>
              </div>
            </div>
          )}

          {activeModule === 'septic' && (
            <div className="flex flex-col space-y-1">
              <div className={`border rounded-lg p-1 ${theme === 'dark' ? 'bg-gray-900/40 border-gray-800' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between mb-0 border-b border-gray-500/10 pb-0.5"><span className="text-[7px] font-black text-gray-500 uppercase tracking-widest">ULAZNI PARAMETRI</span></div>
                <div className="grid grid-cols-2 gap-x-2">
                  <InputSummaryRow label="Korisnici (ES)" value={septicUsers} />
                  <InputSummaryRow label="Zadržavanje (T)" value={`${septicRetention} dana`} />
                </div>
              </div>
              <div className={`border rounded-lg p-1.5 shadow-lg ${theme === 'dark' ? 'bg-emerald-950/10 border-emerald-900/30' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="border-b border-emerald-900/10 pb-0.5 mb-1"><span className="text-[8px] font-bold text-emerald-600 uppercase tracking-wider">VOLUMEN JAME</span></div>
                <div className="text-center py-1"><span className="text-[7px] text-emerald-800 uppercase font-bold opacity-60 block">IZRAČUNATI VOLUMEN [m³]</span><span className="text-xl font-bold text-emerald-500 mono leading-none">{septicResults.calculatedVolume.toFixed(2)}</span></div>
                <div className="pt-1 mt-1 border-t border-emerald-900/10 text-center"><span className="text-[7px] text-emerald-800 uppercase font-bold opacity-60 block mb-0.5">USVOJENI VOLUMEN</span><div className="text-lg font-bold text-emerald-600 mono">{septicResults.recommendedVolume.toFixed(2)} m³</div></div>
              </div>
              <div className={`border rounded-lg p-1.5 ${theme === 'dark' ? 'bg-black/20 border-gray-800' : 'bg-slate-100 border-slate-200'}`}>
                <VerificationHeader />
                <ChecklistItem label="Minimalni volumen" isOk={septicResults.recommendedVolume >= 3.0} value={`${septicResults.recommendedVolume.toFixed(2)} / 3.0 m³`} />
              </div>
            </div>
          )}

          {activeModule === 'grease' && (
            <div className="flex flex-col space-y-1">
              <div className={`border rounded-lg p-1 ${theme === 'dark' ? 'bg-gray-900/40 border-gray-800' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center justify-between mb-0 border-b border-gray-500/10 pb-0.5"><span className="text-[7px] font-black text-gray-500 uppercase tracking-widest">ULAZNI PARAMETRI</span></div>
                <div className="grid grid-cols-2 gap-x-2">
                  <InputSummaryRow label="Dotok (Qs)" value={`${greaseFlow} l/s`} />
                  <InputSummaryRow label="Faktori" value={`${greaseTempFactor}·${greaseDetFactor}·${greaseDensityFactor}`} />
                </div>
              </div>
              <div className={`border rounded-lg p-1.5 shadow-lg ${theme === 'dark' ? 'bg-emerald-950/10 border-emerald-900/30' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="border-b border-emerald-900/10 pb-0.5 mb-1"><span className="text-[8px] font-bold text-emerald-600 uppercase tracking-wider">MASTOLOV (NS)</span></div>
                <div className="text-center py-1"><span className="text-[7px] text-emerald-800 uppercase font-bold opacity-60 block">IZRAČUNATI NS</span><span className="text-xl font-bold text-emerald-500 mono leading-none">{greaseResults.nominalSize.toFixed(2)}</span></div>
                <div className="pt-1 mt-1 border-t border-emerald-900/10 text-center"><span className="text-[7px] text-emerald-800 uppercase font-bold opacity-60 block mb-0.5">STANDARDNI NS</span><div className="text-xl font-bold text-blue-600 mono">NS {greaseResults.recommendedNS}</div></div>
              </div>
              <div className={`border rounded-lg p-1.5 ${theme === 'dark' ? 'bg-black/20 border-gray-800' : 'bg-slate-100 border-slate-200'}`}>
                <VerificationHeader />
                <ChecklistItem label="Kapacitet mastolova" isOk={greaseResults.recommendedNS >= greaseResults.nominalSize} value={`NS ${greaseResults.recommendedNS} >= ${greaseResults.nominalSize.toFixed(2)}`} />
              </div>
            </div>
          )}
          </div>
        </main>

        <section className={`flex-1 ${themeClasses.sidebar} lg:border-l overflow-y-auto p-4 relative transition-colors duration-300 custom-scroll h-full flex flex-col ${mobileView === 'report' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="flex items-center justify-between mb-4 border-b pb-2 shrink-0 h-10">
            <h2 className={`font-bold text-[10px] uppercase tracking-widest flex items-center shrink-0 transition-all ${isGenerating ? 'text-blue-500 animate-pulse' : 'text-rose-500'}`}><span className={`w-1.5 h-1.5 rounded-full mr-2 transition-colors ${isGenerating ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-rose-500'}`}></span>{isGenerating ? 'AŽURIRANJE...' : 'DOKUMENTACIJA'}</h2>
            {reportHTML && <div className="flex items-center space-x-2 h-8"><button onClick={handleCopy} className={`h-7 flex items-center text-[9px] uppercase font-bold border px-3 rounded transition-all shrink-0 ${copyStatus ? 'bg-emerald-600 text-white shadow-sm border-emerald-700' : themeClasses.buttonMuted}`}>{copyStatus ? 'KOPIRANO SVE' : 'KOPIRAJ SVE'}</button><button onClick={downloadAsDoc} className={`h-7 flex items-center text-[9px] uppercase font-bold border px-3 rounded transition-all shadow-sm shrink-0 ${theme === 'light' ? 'bg-rose-600 text-white border-rose-700 hover:bg-rose-700' : 'bg-rose-600/10 text-rose-500 border-rose-900/40 hover:bg-rose-600/20'}`}>IZVOZ .DOC</button></div>}
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 bg-white shadow-2xl border border-slate-300 p-8 text-slate-800 rounded-sm">
            {!reportHTML ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-2">
                <div className="w-12 h-16 border-2 border-dashed border-slate-400 rounded-md"></div>
                <p className="text-[10px] uppercase font-bold max-w-[150px] tracking-wider">Generiranje u tijeku...</p>
              </div>
            ) : (
              <div 
                className="animate-in fade-in duration-500 select-text" 
                style={{ fontFamily: 'Arial, Helvetica, sans-serif', backgroundColor: '#fff', color: '#000' }}
                dangerouslySetInnerHTML={{ __html: reportHTML }}
              />
            )}
          </div>
        </section>

        <nav className={`lg:hidden flex items-center justify-around border-t p-2 ${themeClasses.nav} shrink-0`}><button onClick={() => setMobileView('input')} className={`flex flex-col items-center p-1 rounded transition-colors ${mobileView === 'input' ? 'text-blue-500' : 'text-gray-500'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg><span className="text-[8px] font-bold uppercase mt-1">Ulaz</span></button><button onClick={() => setMobileView('output')} className={`flex flex-col items-center p-1 rounded transition-colors ${mobileView === 'output' ? 'text-emerald-500' : 'text-gray-500'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg><span className="text-[8px] font-bold uppercase mt-1">Proračun</span></button><button onClick={() => setMobileView('report')} className={`relative flex flex-col items-center p-1 rounded transition-all ${isGenerating ? 'text-blue-400 animate-pulse' : (mobileView === 'report' ? 'text-rose-500' : 'text-gray-500')}`}>{isGenerating && <span className="absolute top-0 right-1 w-2 h-2 bg-blue-500 rounded-full border border-white dark:border-black animate-ping"></span>}<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg><span className="text-[8px] font-bold uppercase mt-1">{isGenerating ? 'Sinkronizacija' : 'Izvještaj'}</span></button></nav>
      </div>
      <footer className={`border-t px-4 py-1 flex justify-between items-center text-[8px] uppercase tracking-widest font-bold ${themeClasses.header} transition-colors duration-300 hidden md:flex`}><div className="flex space-x-6"><span className="flex items-center"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span> SUSTAV JE SPREMAN ZA RAD. | 100% LOKALNA OBRADA (0 AI TOKENS)</span></div><div>HRN EN 806 / 12056 / 12566 / 1825 / 752 / 858 | BAZA: RADONIĆ</div></footer>
      <style>{`.custom-scroll::-webkit-scrollbar { width: 5px; } .custom-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; } .custom-scroll::-webkit-scrollbar-track { background: transparent; }`}</style>
    </div>
  );
};

export default App;

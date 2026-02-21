
import { PIPES, ROUGHNESS } from '../constants';

/**
 * Darcy-Weisbach line loss calculation
 */
export const calculateLineLoss = (q: number, d_inner: number, length: number, roughness: number = ROUGHNESS): number => {
  if (q <= 0 || d_inner <= 0 || length <= 0) return 0;
  
  const D = d_inner / 1000; // mm to m
  const A = Math.PI * Math.pow(D, 2) / 4; // m2
  const v = (q / 1000) / A; // l/s to m3/s then divide by A
  const g = 9.81;
  const nu = 1.31e-6; // Kinematic viscosity at 10C
  
  const Re = (v * D) / nu;
  
  let f: number;
  if (Re < 2300) {
    f = Re > 0 ? 64 / Re : 0;
  } else {
    const k = roughness / 1000;
    f = 0.25 / Math.pow(Math.log10(k / (3.7 * D) + 5.74 / Math.pow(Re, 0.9)), 2);
  }
  
  const loss = f * (length / D) * (Math.pow(v, 2) / (2 * g));
  return loss;
};

export const calculateLocalLoss = (v: number, zetas: Record<string, number>): number => {
  if (v <= 0) return 0;
  const g = 9.81;
  const sumZeta = Object.values(zetas).reduce((acc, val) => acc + val, 0);
  return sumZeta * (Math.pow(v, 2) / (2 * g));
};

export const calculateHydrantNetwork = (
  numHydrants: number,
  flowPerHydrant: number,
  length: number,
  height: number,
  inputPressure: number,
  manualDN: string | null = null,
  zetaSum: number = 0,
  roughness: number = ROUGHNESS
) => {
  const totalFlow = numHydrants * flowPerHydrant;
  const isDN52 = flowPerHydrant >= 2.5;
  
  let selectedPipe = PIPES[PIPES.length - 1]; 
  let finalVelocity = 0;
  let finalTotalLoss = 0;
  let finalResPressure = 0;

  if (manualDN) {
    selectedPipe = PIPES.find(p => p.name === manualDN) || PIPES[PIPES.length - 1];
    const velocity = (totalFlow / 1000) / (Math.PI * Math.pow(selectedPipe.di / 1000, 2) / 4);
    const lineLoss = calculateLineLoss(totalFlow, selectedPipe.di, length, roughness);
    const localLoss = zetaSum > 0 ? (zetaSum * Math.pow(velocity, 2)) / (2 * 9.81) : lineLoss * 0.3;
    finalVelocity = velocity;
    finalTotalLoss = lineLoss + localLoss + height;
    finalResPressure = inputPressure - finalTotalLoss;
  } else {
    for (const p of PIPES) {
      if (isDN52 && p.dn < 50) continue;
      const v = (totalFlow / 1000) / (Math.PI * Math.pow(p.di / 1000, 2) / 4);
      const lineLoss = calculateLineLoss(totalFlow, p.di, length, roughness);
      const localLoss = zetaSum > 0 ? (zetaSum * Math.pow(v, 2)) / (2 * 9.81) : lineLoss * 0.3;
      const resPressure = inputPressure - (lineLoss + localLoss + height);
      if (v >= 1.5 && v <= 3.0 && resPressure >= 25) {
        selectedPipe = p;
        finalVelocity = v;
        finalTotalLoss = lineLoss + localLoss + height;
        finalResPressure = resPressure;
        break;
      }
    }
    if (finalVelocity === 0) {
      for (const p of PIPES) {
        if (isDN52 && p.dn < 50) continue;
        const v = (totalFlow / 1000) / (Math.PI * Math.pow(p.di / 1000, 2) / 4);
        const lineLoss = calculateLineLoss(totalFlow, p.di, length, roughness);
        const resPressure = inputPressure - (lineLoss + (lineLoss * 0.3) + height);
        if (resPressure >= 25) {
          selectedPipe = p;
          finalVelocity = v;
          finalTotalLoss = lineLoss + (lineLoss * 0.3) + height;
          finalResPressure = resPressure;
          break;
        }
      }
    }
    if (finalVelocity === 0) {
      selectedPipe = PIPES[PIPES.length - 1];
      finalVelocity = (totalFlow / 1000) / (Math.PI * Math.pow(selectedPipe.di / 1000, 2) / 4);
      const lineLoss = calculateLineLoss(totalFlow, selectedPipe.di, length, roughness);
      finalTotalLoss = lineLoss + (lineLoss * 0.3) + height;
      finalResPressure = inputPressure - finalTotalLoss;
    }
  }

  const pressureOk = finalResPressure >= 25;
  const flowOk = flowPerHydrant >= (isDN52 ? 2.5 : 0.63);
  const velocityOk = finalVelocity >= 1.5 && finalVelocity <= 3.0;
  const mainPipeOk = selectedPipe.dn >= 50;
  
  return {
    totalFlow,
    velocity: finalVelocity,
    pipeName: selectedPipe.name,
    pipeDN: selectedPipe.dn,
    lineLoss: calculateLineLoss(totalFlow, selectedPipe.di, length, roughness),
    localLoss: (zetaSum > 0 ? (zetaSum * Math.pow(finalVelocity, 2)) / (2 * 9.81) : calculateLineLoss(totalFlow, selectedPipe.di, length, roughness) * 0.3),
    totalLoss: finalTotalLoss,
    residualPressure: finalResPressure,
    isSufficient: pressureOk && flowOk && velocityOk && mainPipeOk,
    pressureOk,
    velocityOk,
    flowOk,
    mainPipeOk,
    needsBooster: finalResPressure < 25
  };
};

export const calculateSepticVolume = (users: number, consumption: number = 150, retention: number = 3) => {
  const volumeLiters = users * consumption * retention;
  const volumeM3 = volumeLiters / 1000;
  const recommendedM3 = Math.max(volumeM3, 3);
  
  // Cross-section velocity based on typical dual-chamber dimensions from project (4x2m)
  const crossSectionArea = 2.0 * 1.6; // width * water depth
  const flowPerSecond = (users * consumption / 86400) / 1000; // m3/s (average)
  const peakFlowPerSecond = flowPerSecond * 3.0; // peaking factor
  const velocity = peakFlowPerSecond / crossSectionArea;

  return {
    calculatedVolume: volumeM3,
    recommendedVolume: recommendedM3,
    sludgeStorage: recommendedM3 * 0.3,
    velocity: velocity // m/s
  };
};

export const calculateGreaseTrapSize = (flowRate: number, tempFactor: number = 1.0, densityFactor: number = 1.0, detergentFactor: number = 1.3) => {
  const ns = flowRate * tempFactor * densityFactor * detergentFactor;
  const standardSizes = [1, 2, 4, 7, 10, 15, 20, 25];
  const recommendedNS = standardSizes.find(s => s >= ns) || Math.ceil(ns);
  
  return {
    nominalSize: ns,
    recommendedNS: recommendedNS,
    sludgeVolume: recommendedNS * 100,
    greaseVolume: recommendedNS * 40
  };
};

export const calculateRoofDrainage = (
  area: number, 
  intensity: number, 
  coef: number, 
  type: 'sloped' | 'flat', 
  manualDN: string | null = null, 
  manualCount: number | null = null
) => {
  const totalFlow = (area * intensity * coef) / 10000; // l/s

  let recommendedDN = "";
  let recommendedCount = 1;
  let isInsufficient = false;

  if (type === 'sloped') {
    const slopedLimits = [
      { dn: '60', maxArea: 20 },
      { dn: '80', maxArea: 50 },
      { dn: '100', maxArea: 100 },
      { dn: '120', maxArea: 999999 }
    ];

    const standardLimit = 100;
    recommendedCount = Math.ceil(area / standardLimit);
    recommendedDN = "100";

    const currentDN = manualDN || recommendedDN;
    const currentCount = manualCount || recommendedCount;
    const areaPerVertical = area / currentCount;
    
    const limit = slopedLimits.find(l => l.dn === currentDN)?.maxArea || 0;
    if (areaPerVertical > limit) isInsufficient = true;

    return {
      flow: totalFlow,
      dn: currentDN + " mm",
      count: currentCount,
      recommendedDN: recommendedDN + " mm",
      recommendedCount,
      isInsufficient
    };
  } else {
    const flatCapacities: Record<string, number> = {
      'DN 70': 2.0,
      'DN 100': 4.5,
      'DN 125': 7.0,
      'DN 150': 12.0
    };

    const standardDN = 'DN 100';
    const standardCap = flatCapacities[standardDN];
    recommendedCount = Math.ceil(totalFlow / standardCap);
    recommendedDN = standardDN;

    const currentDN = manualDN || recommendedDN;
    const currentCount = manualCount || recommendedCount;
    const flowPerVertical = totalFlow / currentCount;
    
    const cap = flatCapacities[currentDN] || 0;
    if (flowPerVertical > cap) isInsufficient = true;

    return {
      flow: totalFlow,
      dn: currentDN,
      count: currentCount,
      recommendedDN,
      recommendedCount,
      isInsufficient
    };
  }
};

export const calculateSurfaceDrainage = (area: number, intensity: number, psi: number) => {
  const flow = (area * intensity * psi) / 10000; // l/s
  const standardSeparatorSizes = [3, 6, 10, 15, 20, 30, 40, 50, 65, 80, 100];
  const recommendedNS = standardSeparatorSizes.find(s => s >= flow) || Math.ceil(flow);
  
  return {
    flow,
    recommendedNS,
    areaPerHectare: area / 10000
  };
};

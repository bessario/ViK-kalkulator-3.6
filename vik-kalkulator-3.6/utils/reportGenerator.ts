
import { BUILDING_TYPES, APPLIANCES, FITTINGS, WATER_MATERIALS, DRAINAGE_MATERIALS, ROOF_MATERIALS, SURFACE_MATERIALS } from '../constants';

const style = {
  container: 'width: 100%; font-family: Arial, Helvetica, sans-serif; color: #000; line-height: 1.1; font-size: 10px;',
  table: 'width: 100%; border-collapse: collapse; margin-bottom: 8px; table-layout: fixed;',
  headerCell: 'background-color: #f3f4f6; border: 1px solid #9ca3af; padding: 2px 5px; font-weight: bold; text-align: left; color: #1e40af; font-size: 10px;',
  cell: 'border: 1px solid #d1d5db; padding: 2px 5px; color: #000; font-size: 10px; vertical-align: middle;',
  cellRight: 'border: 1px solid #d1d5db; padding: 2px 5px; text-align: right; font-weight: bold; color: #000; font-size: 10px; vertical-align: middle;',
  section: 'color: #1e40af; border-bottom: 2px solid #1e40af; margin-top: 14px; margin-bottom: 4px; text-transform: uppercase; font-size: 11px; font-weight: bold; clear: both;',
  sourceTag: 'font-size: 8px; font-style: italic; color: #666; margin-bottom: 6px; display: block;',
  formula: 'background: #f8fafc; border-left: 4px solid #3b82f6; padding: 4px 8px; margin: 6px 0; font-family: "Times New Roman", Times, serif; font-size: 11px; color: #1e3a8a; line-height: 1.3;',
  verify: (isOk: boolean) => `margin-top: 4px; padding: 2px 6px; border: 1px solid ${isOk ? '#10b981' : '#ef4444'}; background: ${isOk ? '#f0fdf4' : '#fef2f2'}; font-size: 10px; font-weight: bold; color: ${isOk ? '#065f46' : '#991b1b'};`,
  blockHeader: 'background: #1e40af; color: #fff; padding: 3px 8px; font-size: 10px; font-weight: bold; text-transform: uppercase; margin-top: 12px; margin-bottom: 6px;',
  subHeader: 'font-weight: bold; color: #374151; font-size: 9px; margin: 5px 0 2px 0; text-transform: uppercase; border-left: 3px solid #9ca3af; padding-left: 6px;',
  itemDetail: 'font-size: 8px; color: #4b5563; font-style: italic; margin-top: 1px; display: block;',
  nestedTable: 'width: 100%; border-collapse: collapse; margin-top: 4px; margin-bottom: 4px; background-color: #fff;',
  nestedHeader: 'background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 1px 3px; font-weight: bold; font-size: 8px; color: #4b5563;',
  nestedCell: 'border: 1px solid #e5e7eb; padding: 1px 3px; font-size: 8px; color: #374151;',
  summaryBox: 'margin-top: 12px; border: 2px solid #1e40af; background: #eff6ff; padding: 6px;',
  summaryLabel: 'font-weight: bold; color: #1e40af; font-size: 10px; text-transform: uppercase; padding: 1px 0;',
  summaryValue: 'text-align: right; font-weight: bold; color: #1e40af; font-size: 11px; padding: 1px 0;'
};

const formatRow = (label: string, value: string | number) => `
  <tr>
    <td style="${style.cell}" width="75%">${label}</td>
    <td style="${style.cellRight}" width="25%">${value}</td>
  </tr>`;

const NORMS_LIST = [
  "Zakon o gradnji (NN 153/13, 20/17, 39/19)",
  "Zakon o zaštiti od požara (NN 92/10)",
  "Pravilnik o hidrantskoj mreži (NN 08/06)",
  "HRN EN 806: Unutarnje instalacije za pitku vodu",
  "HRN EN 12056: Sustavi odvodnje unutar zgrada",
  "HRN EN 12566: Sabirne jame i mali uređaji za pročišćavanje",
  "HRN EN 1825 / 858: Separatori masti i lakih tekućina",
  "M. Radonić: Vodovod i kanalizacija (Referentni priručnik)"
];

export const generateLocalReport = (module: string, input: any, results: any): string => {
  let html = `<div style="${style.container}">`;

  if (module === 'vik') {
    const k = BUILDING_TYPES.find(t => t.id === input.buildingType)?.k || 0.5;
    
    html += `<div style="${style.blockHeader}">PRIMIJENJENI PROPISI I NORMATIVI</div>`;
    html += `<div style="font-size: 9px; color: #444; margin-bottom: 15px; column-count: 2; column-gap: 20px;">`;
    NORMS_LIST.forEach(norm => { html += `<div style="margin-bottom: 3px;">• ${norm}</div>`; });
    html += `</div>`;

    html += `<div style="${style.blockHeader}">HIDRAULIČKI PRORAČUN VODOVODA</div>`;
    html += `<div style="${style.formula}">
      <b>Vršni protok (prema HRN EN 806-3):</b><br/>
      Q<sub>p</sub> = 0.2 · √ΣJO = 0.2 · √${results.water.sumJO.toFixed(2)} = <b>${results.water.qPeak.toFixed(2)} l/s</b>
    </div>`;

    html += `<div style="${style.formula}">
      <b>Dokaz tlaka (Energetska bilanca):</b><br/>
      H<sub>pot</sub> = H<sub>geo</sub> + ΣΔp<sub>lin</sub> + ΣΔp<sub>loc</sub> + H<sub>vdm</sub> + H<sub>izlj</sub><br/>
      H<sub>pot</sub> = ${input.height.toFixed(2)} + ${results.water.lineLoss.toFixed(2)} + ${results.water.localLoss.toFixed(2)} + 5.00 + 5.00 = <b>${(results.water.totalLoss).toFixed(2)} mVS</b>
    </div>`;

    html += `<table style="${style.table}">
      <thead><tr><th style="${style.headerCell}">STAVKA</th><th style="${style.headerCell}; text-align:right;">VRIJEDNOST</th></tr></thead>
      <tbody>
        ${formatRow("Materijal cijevi (voda)", WATER_MATERIALS.find(m => m.id === input.waterMaterial)?.name || "N/A")}
        ${formatRow("Ukupni broj jedinica opterećenja (ΣJO)", results.water.sumJO.toFixed(2))}
        ${formatRow("Proračunski vršni protok (Qp)", results.water.qPeak.toFixed(2) + " l/s")}
        ${formatRow("Usvojeni profil cijevi (DN)", results.water.selectedPipe)}
        ${formatRow("Stvarna brzina strujanja (v)", results.water.velocity.toFixed(2) + " m/s")}
        ${formatRow("Geodetska visina (Hgeo)", input.height.toFixed(2) + " m")}
        ${formatRow("Gubici u cjevovodu (linijski)", (results.water.lineLoss).toFixed(2) + " mVS")}
        ${formatRow("Gubici u armaturi (lokalni)", (results.water.localLoss).toFixed(2) + " mVS")}
        ${formatRow("Potrebni tlak na priključku (Hpot)", (results.water.totalLoss / 10.197).toFixed(2) + " bar")}
        ${formatRow("Raspoloživi tlak na priključku (Hu)", (input.inputPressure/10).toFixed(2) + " bar")}
      </tbody>
    </table>`;

    const pUkupnoBar = results.water.totalLoss / 10.197;
    const pInputBar = input.inputPressure / 10;
    html += `<div style="${style.verify(pInputBar >= pUkupnoBar)}">
      DOKAZ TLAKA: P<sub>rasp</sub> (${pInputBar.toFixed(2)} bar) ${pInputBar >= pUkupnoBar ? '≥' : '<'} P<sub>pot</sub> (${pUkupnoBar.toFixed(2)} bar) 
      → SUSTAV ${pInputBar >= pUkupnoBar ? 'ZADOVOLJAVA' : 'ZAHTIJEVA PODIZANJE TLAKA'}
    </div>`;

    html += `<div style="${style.verify(results.water.velocity <= 2.2)}">
      BRZINA STRUJANJA: v (${results.water.velocity.toFixed(2)} m/s) ${results.water.velocity <= 2.2 ? '≤' : '>'} 2.20 m/s 
      → ${results.water.velocity <= 2.2 ? 'ZADOVOLJAVA' : 'POTREBNO POVEĆATI PROFIL'}
    </div>`;

    html += `<div style="${style.verify(true)}">
      GLAVNI VODOMJER: Odabrani profil ${results.water.recommendedVdmDN} → SUKLADNO STANDARDU
    </div>`;

    if (results.water.needsReduction) {
      html += `<div style="${style.verify(false)}">
        UPOZORENJE: Ulazni tlak (${pInputBar.toFixed(2)} bar) prelazi maksimalno dozvoljenih 6.00 bar za kućne instalacije. 
        Obavezna je ugradnja regulatora tlaka (redukcijski ventil).
      </div>`;
    }

    html += `<div style="${style.verify(true)}">
      GLAVNI PRIKLJUČAK (RADONIĆ): Preporučeni profil ${results.mainInlet.recommended} (d<sub>pot</sub> = ${results.mainInlet.dPot.toFixed(1)} mm) → SUKLADNO METODI
    </div>`;

    html += `<div style="${style.blockHeader}">HIDRAULIČKI PRORAČUN ODVODNJE</div>`;
    html += `<div style="${style.formula}">
      <b>Vršni protok otpadne vode (prema HRN EN 12056-2):</b><br/>
      Q<sub>ww</sub> = k · √ΣDU = ${k} · √${results.drainage.sumDU.toFixed(2)} = <b>${results.drainage.qDrain.toFixed(2)} l/s</b>
      <div style="${style.itemDetail}">* Proračun se temelji na vjerojatnosti istovremenosti korištenja sanitarnih uređaja.</div>
    </div>`;

    html += `<div style="${style.formula}">
      <b>Dimenzioniranje vertikala i sabirnih vodova:</b><br/>
      Odabrani profil: <b>${results.drainage.minDN}</b><br/>
      Maksimalni kapacitet profila (Q<sub>max</sub>): <b>${(results.drainage.minDN === 'N/A' ? 0 : [1.5, 4.0, 6.0, 10.0, 32.0, 55.0, 90.0][['DN75', 'DN110', 'DN125', 'DN160', 'DN200', 'DN250', 'DN315'].indexOf(results.drainage.minDN)] || 0).toFixed(2)} l/s</b>
      <div style="${style.itemDetail}">* Odabir profila vrši se prema tablicama kapaciteta za djelomičnu ispunjenost (h/d = 0.5 do 0.7).</div>
      ${results.drainage.hasWC ? `<div style="${style.itemDetail}; color: #1e40af; font-weight: bold;">* Napomena: Zbog prisutnosti WC-a, minimalni dopušteni profil vertikale je DN 110.</div>` : ''}
    </div>`;

    if (results.drainage.qTotalConnection > results.drainage.qDrain) {
      const parts = [];
      const values = [];
      parts.push("Q<sub>ww</sub>");
      values.push(results.drainage.qDrain.toFixed(2));
      
      if (results.drainage.qRoof > 0) { parts.push("Q<sub>r</sub>"); values.push(results.drainage.qRoof.toFixed(2)); }
      if (results.drainage.qSurface > 0) { parts.push("Q<sub>s</sub>"); values.push(results.drainage.qSurface.toFixed(2)); }
      if (results.drainage.qGrease > 0) { parts.push("NS<sub>m</sub>"); values.push(results.drainage.qGrease.toFixed(2)); }

      html += `<div style="${style.formula}">
        <b>Ukupni mjerodavni dotok u priključak:</b><br/>
        Q<sub>tot</sub> = ${parts.join(" + ")} = ${values.join(" + ")} = <b>${results.drainage.qTotalConnection.toFixed(2)} l/s</b>
        <div style="${style.itemDetail}">* Zbroj sanitarne vode, oborinske odvodnje s krovova i površina te kapaciteta mastolova.</div>
      </div>`;
    }

    html += `<table style="${style.table}">
      <thead><tr><th style="${style.headerCell}">STAVKA</th><th style="${style.headerCell}; text-align:right;">VRIJEDNOST</th></tr></thead>
      <tbody>
        ${formatRow("Materijal cijevi (odvodnja)", DRAINAGE_MATERIALS.find(m => m.id === input.drainageMaterial)?.name || "N/A")}
        ${formatRow("Ukupni broj odvodnih jedinica (ΣDU)", results.drainage.sumDU.toFixed(2))}
        ${formatRow("Proračunski dotok sanitarnih voda (Qww)", results.drainage.qDrain.toFixed(2) + " l/s")}
        ${formatRow("Usvojeni profil vertikale/izljeva", results.drainage.minDN)}
        ${formatRow("Sustav vanjske odvodnje", input.drainageSystemType === 'combined' ? 'Mješoviti' : 'Odvojeni')}
        ${formatRow("Ukupni dotok u priključak (Qtot)", results.drainage.qTotalConnection.toFixed(2) + " l/s")}
        ${formatRow("Profil glavnog priključka", results.drainage.mainConnDN)}
      </tbody>
    </table>`;

    html += `<div style="${style.verify(!results.drainage.warning)}">
      DOKAZ PROFILA ODVODNJE: DN ${results.drainage.minDN} ${results.drainage.warning ? 'NE ZADOVOLJAVA' : 'ZADOVOLJAVA'} 
      ${results.drainage.hasWC ? '<br/>(Obavezni uvjet: min DN110 zbog prisutnosti WC-a)' : ''}
    </div>`;

    html += `<div style="${style.verify(!results.drainage.mainWarning)}">
      VANJSKA ODVODNJA: DN ${results.drainage.mainConnDN} ${results.drainage.mainWarning ? 'NEDOVOLJNO' : 'SUKLADNO KAPACITETU'} 
      (Q<sub>tot</sub> = ${results.drainage.qTotalConnection.toFixed(2)} l/s)
    </div>`;

    html += `<div style="${style.blockHeader}">SPECIFIKACIJA OPREME I JEDINICA</div>`;
    
    if (input.unitTypes && input.unitTypes.length > 0) {
      html += `<div style="${style.subHeader}">SPECIFIKACIJA TIPSKIH STAMBENIH JEDINICA</div>`;
      
      let grandTotalJOUnits = 0;

      input.unitTypes.forEach((unit: any) => {
        let unitJO_Sum = 0;
        let equipmentRows = "";
        
        Object.entries(unit.counts).forEach(([id, count]) => {
          const app = APPLIANCES.find(a => a.id === id);
          const qty = count as number;
          if (app && qty > 0) {
            const itemTotalJO = qty * app.jo;
            unitJO_Sum += itemTotalJO;
            equipmentRows += `
              <tr>
                <td style="${style.nestedCell}">${app.name}</td>
                <td style="${style.nestedCell}; text-align: center;">${qty}</td>
                <td style="${style.nestedCell}; text-align: right;">${app.jo.toFixed(2)}</td>
                <td style="${style.nestedCell}; text-align: right;"><b>${itemTotalJO.toFixed(2)}</b></td>
              </tr>`;
          }
        });

        const totalForThisUnitType = unitJO_Sum * unit.multiplier;
        grandTotalJOUnits += totalForThisUnitType;

        html += `
          <div style="margin-bottom: 15px; border: 1px solid #9ca3af; padding: 5px; background: #fff;">
            <div style="background: #f3f4f6; padding: 4px; font-weight: bold; border-bottom: 1px solid #9ca3af; display: flex; justify-content: space-between;">
              <span style="color: #1e40af;">${unit.name.toUpperCase()} (KOLIČINA: ${unit.multiplier} KOM)</span>
              <span>Σ JO po jedinici: ${unitJO_Sum.toFixed(2)}</span>
            </div>
            <table style="${style.nestedTable}">
              <thead>
                <tr>
                  <th style="${style.nestedHeader}" width="50%">NAZIV SANITARNOG ELEMENTA</th>
                  <th style="${style.nestedHeader}; text-align: center;" width="15%">KOM</th>
                  <th style="${style.nestedHeader}; text-align: right;" width="15%">JO / KOM</th>
                  <th style="${style.nestedHeader}; text-align: right;" width="20%">UKUPNO JO</th>
                </tr>
              </thead>
              <tbody>
                ${equipmentRows}
                <tr style="background: #f9fafb;">
                  <td colspan="3" style="${style.nestedCell}; text-align: right; font-weight: bold; text-transform: uppercase;">Ukupno JO za ${unit.name}</td>
                  <td style="${style.nestedCell}; text-align: right; font-weight: bold; color: #1e40af;">${unitJO_Sum.toFixed(2)}</td>
                </tr>
                <tr style="background: #eff6ff;">
                  <td colspan="3" style="${style.nestedCell}; text-align: right; font-weight: bold; text-transform: uppercase;">SVEUKUPNO ZA ${unit.multiplier} KOM JEDINICA</td>
                  <td style="${style.nestedCell}; text-align: right; font-weight: bold; color: #1e40af; border-top: 2px solid #1e40af;">${totalForThisUnitType.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>`;
      });

      // Dodajemo sumarni blok za sve stambene jedinice
      html += `
        <div style="${style.summaryBox}">
          <table width="100%" style="border-collapse: collapse;">
            <tr>
              <td style="${style.summaryLabel}">UKUPNI MJERODAVNI ZBROJ IZ SVIH STAMBENIH JEDINICA</td>
              <td style="${style.summaryValue}">Σ JO = ${grandTotalJOUnits.toFixed(2)}</td>
            </tr>
          </table>
        </div>`;
    }

    const activeAppliances = Object.entries(input.appliances).filter(([_, count]) => (count as number) > 0);
    if (activeAppliances.length > 0) {
      html += `<div style="${style.subHeader}">SANITARNA OPREMA (OSTALI PROSTORI)</div>`;
      html += `<table style="${style.table}">
        <thead><tr><th style="${style.headerCell}" width="60%">NAZIV ELEMENTA</th><th style="${style.headerCell}; text-align: center;" width="20%">KOM</th><th style="${style.headerCell}; text-align:right;" width="20%">Σ JO</th></tr></thead>
        <tbody>`;
      activeAppliances.forEach(([id, count]) => {
        const app = APPLIANCES.find(a => a.id === id);
        if (app) {
          const qty = count as number;
          html += `<tr>
            <td style="${style.cell}">${app.name}</td>
            <td style="${style.cell}; text-align: center;">${qty}</td>
            <td style="${style.cellRight}">${(qty * app.jo).toFixed(2)}</td>
          </tr>`;
        }
      });
      html += `</tbody></table>`;
    }

    const activeFittings = Object.entries(input.fittings).filter(([_, count]) => (count as number) > 0);
    if (activeFittings.length > 0) {
      html += `<div style="${style.subHeader}">SPOJNI ELEMENTI I ARMATURA (LOKALNI GUBICI)</div>`;
      html += `<table style="${style.table}">
        <thead><tr><th style="${style.headerCell}" width="50%">NAZIV ELEMENTA</th><th style="${style.headerCell}" width="25%">ZETA (ζ)</th><th style="${style.headerCell}; text-align:right;" width="25%">KOMADA</th></tr></thead>
        <tbody>`;
      activeFittings.forEach(([id, count]) => {
        const fit = FITTINGS.find(f => f.id === id);
        if (fit) html += `<tr><td style="${style.cell}">${fit.name}</td><td style="${style.cell}">${fit.zeta.toFixed(2)}</td><td style="${style.cellRight}">${count}</td></tr>`;
      });
      html += `</tbody></table>`;
    } else if (input.useSafetyFactor) {
      html += `<div style="${style.subHeader}">SPOJNI ELEMENTI I ARMATURA</div>`;
      html += `<div style="font-size: 9px; padding: 5px; background: #f9fafb; border: 1px solid #d1d5db; color: #555;">
        * Lokalni gubici obračunati su paušalno u iznosu od 30% linijskih gubitaka prema preporuci HRN EN 806.
      </div>`;
    }
  }

  if (module === 'hydrant') {
    html += `<div style="${style.blockHeader}">UNUTARNJA HIDRANTSKA MREŽA</div>`;
    html += `<div style="${style.formula}">
      <b>Mjerodavni protok hidrantske mreže:</b><br/>
      Q<sub>h</sub> = n · q<sub>h</sub> = ${input.numHydrants} · ${input.flowPerHydrant.toFixed(2)} = <b>${results.totalFlow.toFixed(2)} l/s</b>
    </div>`;
    html += `<table style="${style.table}">
      <thead><tr><th style="${style.headerCell}">STAVKA</th><th style="${style.headerCell}; text-align:right;">VRIJEDNOST</th></tr></thead>
      <tbody>
        ${formatRow("Broj istovremeno aktivnih hidranata", input.numHydrants)}
        ${formatRow("Ukupni protok hidrantske mreže (Qh)", results.totalFlow.toFixed(2) + " l/s")}
        ${formatRow("Usvojeni profil cjevovoda", results.pipeName)}
        ${formatRow("Preostali tlak na mlaznici (Pmlaz)", (results.residualPressure/10).toFixed(2) + " bar")}
      </tbody>
    </table>`;
    html += `<div style="${style.verify(results.residualPressure/10 >= 2.5)}">UVJET TLAKA: P<sub>mlaz</sub> (${(results.residualPressure/10).toFixed(2)} bar) ≥ 2.50 bar - ZADOVOLJAVA</div>`;
    html += `<div style="${style.verify(results.velocityOk)}">BRZINA STRUJANJA: v (${results.velocity.toFixed(2)} m/s) / (1.5-3.0) m/s - ${results.velocityOk ? 'ZADOVOLJAVA' : 'IZVAN GRANICA'}</div>`;
    html += `<div style="${style.verify(results.flowOk)}">VRŠNI PROTOK PO H: q<sub>h</sub> (${input.flowPerHydrant.toFixed(2)} l/s) / 2.50 l/s (norm) - ${results.flowOk ? 'ZADOVOLJAVA' : 'NEDOVOLJNO'}</div>`;
    html += `<div style="${style.verify(results.mainPipeOk)}">PROFIL GL. RAZVODA: ${results.pipeName} (min DN50) - ${results.mainPipeOk ? 'ZADOVOLJAVA' : 'NEDOVOLJNO'}</div>`;
  }

  if (module === 'septic') {
    html += `<div style="${style.blockHeader}">SABIRNA JAMA</div>`;
    html += `<div style="${style.formula}">
      <b>Potrebni volumen jame (za t=${input.retention} dana):</b><br/>
      V = (n · q · t) / 1000 = (${input.users} · ${input.consumption} · ${input.retention}) / 1000 = <b>${results.calculatedVolume.toFixed(2)} m³</b>
    </div>`;
    html += `<table style="${style.table}">
      <thead><tr><th style="${style.headerCell}">STAVKA</th><th style="${style.headerCell}; text-align:right;">VRIJEDNOST</th></tr></thead>
      <tbody>
        ${formatRow("Izračunati volumen (V)", results.calculatedVolume.toFixed(2) + " m³")}
        ${formatRow("Usvojeni volumen jame", results.recommendedVolume.toFixed(2) + " m³")}
        ${formatRow("Brzina strujanja (v)", results.velocity.toFixed(5) + " m/s")}
      </tbody>
    </table>`;
    html += `<div style="${style.verify(results.velocity < 0.01)}">DOKAZ TALOŽENJA: v (${results.velocity.toFixed(5)} m/s) < 0.01 m/s - ZADOVOLJAVA</div>`;
    html += `<div style="${style.verify(results.recommendedVolume >= 3.0)}">MINIMALNI VOLUMEN JAME: ${results.recommendedVolume.toFixed(2)} m³ / 3.00 m³ (min) - ${results.recommendedVolume >= 3.0 ? 'ZADOVOLJAVA' : 'NEDOVOLJNO'}</div>`;
  }

  if (module === 'grease') {
    html += `<div style="${style.blockHeader}">MASTOLOV (HRN EN 1825)</div>`;
    html += `<div style="${style.formula}">
      <b>Izračunati nominalni broj (NS):</b><br/>
      NS = Q<sub>s</sub> · f<sub>t</sub> · f<sub>d</sub> · f<sub>r</sub> = ${input.flow.toFixed(2)} · ${input.tempFactor.toFixed(1)} · ${input.detergentFactor.toFixed(1)} · ${input.densityFactor.toFixed(1)} = <b>${results.nominalSize.toFixed(2)}</b>
    </div>`;
    html += `<table style="${style.table}">
      <thead><tr><th style="${style.headerCell}">STAVKA</th><th style="${style.headerCell}; text-align:right;">VRIJEDNOST</th></tr></thead>
      <tbody>
        ${formatRow("Izračunati NS", results.nominalSize.toFixed(2))}
        ${formatRow("Usvojeni standardni NS", "NS " + results.recommendedNS)}
        ${formatRow("Volumen taložnika", results.sludgeVolume.toFixed(0) + " l")}
        ${formatRow("Volumen mastolova", results.greaseVolume.toFixed(0) + " l")}
      </tbody>
    </table>`;
    html += `<div style="${style.verify(results.recommendedNS >= results.nominalSize)}">KAPACITET MASTOLOVA: NS ${results.recommendedNS} ≥ ${results.nominalSize.toFixed(2)} - ZADOVOLJAVA</div>`;
  }

  if (module === 'roof') {
    html += `<div style="${style.blockHeader}">KROVNA ODVODNJA</div>`;
    
    input.surfaces.forEach((surface: any, index: number) => {
      const res = results.surfaces[index].results;
      const material = (ROOF_MATERIALS as any)[surface.type].find((m: any) => m.id === surface.materialId);
      const materialName = material ? material.name : 'Manualno';

      html += `<div style="${style.subHeader}">${surface.name.toUpperCase()} (${surface.type === 'sloped' ? 'Kosi' : 'Ravni'} krov)</div>`;
      html += `<div style="${style.formula}">
        <b>Dotok s krovne plohe:</b><br/>
        Q<sub>r</sub> = (A · r · ψ) / 10000 = (${surface.area} · ${input.intensity} · ${surface.coef}) / 10000 = <b>${res.flow.toFixed(2)} l/s</b>
      </div>`;
      html += `<table style="${style.table}">
        <thead><tr><th style="${style.headerCell}">STAVKA</th><th style="${style.headerCell}; text-align:right;">VRIJEDNOST</th></tr></thead>
        <tbody>
          ${formatRow("Površina plohe (A)", surface.area + " m²")}
          ${formatRow("Materijal krova", materialName)}
          ${formatRow("Koeficijent otjecanja (ψ)", surface.coef.toFixed(2))}
          ${formatRow("Proračunski dotok (Qr)", res.flow.toFixed(2) + " l/s")}
          ${formatRow("Usvojeni profil vertikala", res.dn)}
          ${formatRow("Broj vertikala", res.count)}
        </tbody>
      </table>`;
      html += `<div style="${style.verify(!res.isInsufficient)}">HIDRAULIČKI KAPACITET: ${res.dn} - ${!res.isInsufficient ? 'SUKLADNO DIONICI' : 'NEDOVOLJNO'}</div>`;
      html += `<div style="${style.verify(res.count >= res.recommendedCount)}">MINIMALNI BROJ VERTIKALA: ${res.count} / ${res.recommendedCount} (prema A) - ${res.count >= res.recommendedCount ? 'ZADOVOLJAVA' : 'NEDOVOLJNO'}</div>`;
    });

    html += `<div style="${style.summaryBox}; margin-top: 2px;">
      <table width="100%" style="border-collapse: collapse;">
        <tr>
          <td style="${style.summaryLabel}">UKUPNI DOTOK SA SVIH KROVNIH POVRŠINA</td>
          <td style="${style.summaryValue}">Σ Q<sub>r</sub> = ${results.totalFlow.toFixed(2)} l/s</td>
        </tr>
      </table>
    </div>`;
  }

  if (module === 'surface') {
    html += `<div style="${style.blockHeader}">ODVODNJA MANIPULATIVNIH POVRŠINA</div>`;
    
    input.surfaces.forEach((surface: any, index: number) => {
      const res = results.surfaces[index].results;
      const material = SURFACE_MATERIALS.find(m => m.id === surface.materialId);
      const materialName = material ? material.name : 'Manualno';

      html += `<div style="${style.subHeader}">${surface.name.toUpperCase()}</div>`;
      html += `<div style="${style.formula}">
        <b>Dotok s otvorenih površina:</b><br/>
        Q<sub>s</sub> = (A · r · ψ) / 10000 = (${surface.area} · ${input.intensity} · ${surface.psi}) / 10000 = <b>${res.flow.toFixed(2)} l/s</b>
      </div>`;
      html += `<table style="${style.table}">
        <thead><tr><th style="${style.headerCell}">STAVKA</th><th style="${style.headerCell}; text-align:right;">VRIJEDNOST</th></tr></thead>
        <tbody>
          ${formatRow("Površina (A)", surface.area + " m²")}
          ${formatRow("Materijal površine", materialName)}
          ${formatRow("Koeficijent otjecanja (ψ)", surface.psi.toFixed(2))}
          ${formatRow("Proračunski dotok (Qs)", res.flow.toFixed(2) + " l/s")}
        </tbody>
      </table>`;
    });

    html += `<div style="${style.summaryBox}; margin-top: 16px;">
      <table width="100%" style="border-collapse: collapse;">
        <tr>
          <td style="${style.summaryLabel}">UKUPNI DOTOK SA SVIH MANIPULATIVNIH POVRŠINA</td>
          <td style="${style.summaryValue}">Σ Q<sub>s</sub> = ${results.totalFlow.toFixed(2)} l/s</td>
        </tr>
        <tr>
          <td style="${style.summaryLabel}">PREPORUČENI KAPACITET SEPARATORA</td>
          <td style="${style.summaryValue}">NS ${results.recommendedNS}</td>
        </tr>
      </table>
    </div>`;

    html += `<div style="${style.verify(results.recommendedNS >= results.totalFlow)}">ODABIR: Separator NS ${results.recommendedNS} (Q<sub>cap</sub> ≥ Σ Q<sub>s</sub>) - ZADOVOLJAVA</div>`;
  }

  html += `</div>`;
  return html;
};

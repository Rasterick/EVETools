// SolarSystem.js
document.addEventListener('DOMContentLoaded', () => {

    // --- SECTION 1: Data (now fetched), Constants, and Global Variables ---
    let currentSystemCelestials = []; 

    const SVG_NS = "http://www.w3.org/2000/svg";
    const AU_KM = 149597870.7;
    const CEL_RADIUS_FACTOR = 0.05 * 0.25;
    const ORBIT_WIDTH_FACTOR = 0.0015;
    // const G_CONST = 6.67430e-11; // Only if needed for Keplerian calcs you re-add

    // DOM Element References (ensure all IDs match your HTML)
    const svgElement = document.getElementById('solarSystemSVG');
    const infoBox = document.getElementById('infoBox');
    const scanDataInput = document.getElementById('scanDataInput');
    const parseScanButton = document.getElementById('parseScanButton');
    const trilaterateSelectedButton = document.getElementById('trilaterateSelectedButton');
    const parseProbeDataButton = document.getElementById('parseProbeDataButton');
    const toggleSignatureZonesButton = document.getElementById('toggleSignatureZonesButton');
    const clearScanDataButton = document.getElementById('clearScanDataButton');
    const clearMarkersButton = document.getElementById('clearMarkersButton');
    const plottedMarkersTableBody = document.getElementById('plottedMarkersTableBody');
    const probeScanTableBody = document.getElementById('probeScanTableBody');
    const selectableCelestialsContainer = document.getElementById('selectableCelestialsContainer');
    const selectableCelestialsList = document.getElementById('selectableCelestialsList');
    const selectionCountSpan = document.getElementById('selectionCount');
    const systemIdInput = document.getElementById('systemIdInput');
    const loadSystemButton = document.getElementById('loadSystemButton');
    const prepareCustomMarkerButton = document.getElementById('prepareCustomMarkerButton');
    const customMarkerControlsDiv = document.getElementById('customMarkerControls');
    const markerShapeSelect = document.getElementById('markerShape');
    const markerColorSelect = document.getElementById('markerColor');
    const cancelCustomMarkerButton = document.getElementById('cancelCustomMarkerButton');
    const customMarkerInstructions = document.getElementById('customMarkerInstructions');
    const hdrSysClassEl = document.getElementById('hdrSysClass');
    const hdrSysEffectEl = document.getElementById('hdrSysEffect');
    const hdrSysStaticsEl = document.getElementById('hdrSysStatics');
    const sysClassEl = document.getElementById('sysClass');
    const sysEffectEl = document.getElementById('sysEffect');
    const sysStatic1El = document.getElementById('sysStatic1');
    const sysStatic2El = document.getElementById('sysStatic2');
    
    let baseOrbitsGroup, signatureZonesGroup, celestialBodiesGroup, scanMarkersGroup, dscanRangeCirclesGroup; // dscanRangeCirclesGroup for later
    let currentSystemScaleFactor = 1;
    let scannerPosMarkerCounter = 0;
    let customMarkerCounter = 0;
    let plottedMarkerData = {};
    let selectedDragTarget = null;
    let dragInitiator = null;
    let offset = { x: 0, y: 0 };
    let isDraggingMarker = false;
    let knownPointsFromCurrentScan = [];
    let selectedReferencePoints = [];
    let parsedProbeSignatures = [];
    let isLinkingProbeSignature = false;
    let signatureToLink = null;
    let isAddingCustomMarkerMode = false;

    console.log("SolarSystem.js: Script Start, DOM loaded.");
    // Null checks for critical elements
    if (!svgElement) console.error("CRITICAL: svgElement not found!");
    if (!plottedMarkersTableBody) console.error("CRITICAL: plottedMarkersTableBody not found!");
    if (!probeScanTableBody) console.error("CRITICAL: probeScanTableBody not found!");


    // --- SECTION 2: ALL FUNCTION DEFINITIONS ---

    // Paste your working fetchAndRenderSystem function here
    async function fetchAndRenderSystem(systemIdentifier) {
        console.log(`Fetching data for system: ${systemIdentifier}`);
        if (svgElement) { svgElement.innerHTML = '';}
        if (plottedMarkersTableBody) plottedMarkersTableBody.innerHTML = "";
        if (probeScanTableBody) probeScanTableBody.innerHTML = "";
        if (selectableCelestialsContainer) selectableCelestialsContainer.style.display = "none";
        currentSystemCelestials = []; scannerPosMarkerCounter = 0; customMarkerCounter = 0;
        plottedMarkerData = {}; parsedProbeSignatures = [];
        selectedReferencePoints = []; knownPointsFromCurrentScan = []; 
        if (typeof updateSelectionCountAndButton === 'function') updateSelectionCountAndButton();
        isLinkingProbeSignature = false; signatureToLink = null; isAddingCustomMarkerMode = false;
        if (customMarkerControlsDiv) customMarkerControlsDiv.style.display = 'none';
        if (parseScanButton) parseScanButton.disabled = false;
        if (trilaterateSelectedButton) trilaterateSelectedButton.disabled = true; 
        if (parseProbeDataButton) parseProbeDataButton.disabled = false;
        if (toggleSignatureZonesButton) toggleSignatureZonesButton.textContent = "Show Signature Zones";
        if (signatureZonesGroup && signatureZonesGroup.style) signatureZonesGroup.style.display = 'none';
        if (dscanRangeCirclesGroup) { dscanRangeCirclesGroup.innerHTML = ''; }
        console.log("All previous system state and UI cleared/reset for new system load.");
        try {
            const response = await fetch('../db_test.php', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', }, body: `systemID=${encodeURIComponent(systemIdentifier)}` });
            if (!response.ok) { const errorText = await response.text(); console.error("PHP Error:", errorText); throw new Error(`HTTP error ${response.status}`);}
            const data = await response.json();
            if (data && data.systemInfo) {
                const si = data.systemInfo;
                const appTitleH1 = document.getElementById('currentSystemTitleHeader');
                if (appTitleH1) appTitleH1.textContent = `System Information - ${si.systemName || systemIdentifier}`;
                document.title = `EVE System Mapper - ${si.systemName || systemIdentifier}`;
                if(hdrSysClassEl) hdrSysClassEl.textContent = si.class || 'N/A';
                if(hdrSysEffectEl) hdrSysEffectEl.textContent = si.effect || 'None';
                let staticsCombined = "";
                if (si.static1_type) staticsCombined += `${si.static1_type}${si.static1_leadsTo ? ' ('+si.static1_leadsTo+')' : ''}`;
                if (si.static2_type) staticsCombined += `${staticsCombined ? ' / ' : ''}${si.static2_type}${si.static2_leadsTo ? ' ('+si.static2_leadsTo+')' : ''}`;
                if(hdrSysStaticsEl) hdrSysStaticsEl.textContent = staticsCombined || 'None';
                if(sysClassEl) sysClassEl.textContent = si.class || 'N/A';
                if(sysEffectEl) sysEffectEl.textContent = si.effect || 'None';
                if(sysStatic1El) sysStatic1El.textContent = `${si.static1_type || 'N/A'}${si.static1_leadsTo ? ' -> ' + si.static1_leadsTo : ''}`;
                if(sysStatic2El) sysStatic2El.textContent = `${si.static2_type || 'N/A'}${si.static2_leadsTo ? ' -> ' + si.static2_leadsTo : ''}`;
            } else { console.warn("No systemInfo received for system:", systemIdentifier); /* Clear info fields */ }
            let celestialsToRender = [];
            if (data && data.celestials && data.celestials.length > 0) celestialsToRender = data.celestials;
            else if (data && Array.isArray(data) && data.length > 0 && !data.systemInfo) celestialsToRender = data;
            currentSystemCelestials = celestialsToRender;
            if (currentSystemCelestials.length > 0) { if (typeof renderSystemSVG === 'function') renderSystemSVG(currentSystemCelestials); }
            else { if (svgElement) svgElement.innerHTML = ''; console.error('No celestial data for system ID:', systemIdentifier); alert(`No celestial data for ${systemIdentifier}.`); }
        } catch (error) { console.error('Error fetching system data:', error); alert(`Error loading system data: ${error.message}`); }
    }

    function safeParseFloat(value) {
    if (
      value === "None" ||
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim() === "")
    )
      return NaN;
    const num = parseFloat(String(value).replace(/,/g, ""));
    return isNaN(num) ? NaN : num;
  }
    function transformRawDataToSystemFormat(dataToTransform) {
    const cels = dataToTransform.map((body) => {
      let groupID;
      if (body.itemName.includes("Star")) groupID = 6;
      else if (body.itemName.includes("Moon")) groupID = 8;
      else if (body.Represenatation === "Structure") groupID = 10;
      else groupID = 7;
      let typeColor;
      switch (body.Represenatation) {
        case "Yellow Circle":
          typeColor = "#FFFF33";
          break;
        case "Brown Circle":
          typeColor = "#A55A2A";
          break;
        case "Red Circle":
          typeColor = "#FF4444";
          break;
        case "Dark Grey Circle":
          typeColor = "#888888";
          break;
        case "Olive Circle":
          typeColor = "#808030";
          break;
        case "Pale Grey Circle":
          typeColor = "#CCCCCC";
          break;
        case "Blue Circle":
          typeColor = "#6666FF";
          break;
        case "Structure":
          typeColor = "#33FF33";
          break;
        default:
          typeColor = "#FFFFFF";
      }
      const xVal = typeof body.X === "number" ? body.X : 0;
      const yVal = typeof body.Y === "number" ? body.Y : 0;
      const zVal = typeof body.Z === "number" ? body.Z : 0;
      return {
        itemName: body.itemName,
        groupID: groupID,
        typeColor: typeColor,
        map_x: xVal,
        map_y: zVal,
        originalData: body,
      };
    });
    // Determine systemName from the data if possible
    let systemName = "Unknown System";
    if (dataToTransform[0] && dataToTransform[0].itemName.includes(" - Star")) {
      systemName = dataToTransform[0].itemName.split(" - Star")[0].trim();
    }
    return { solarSystemName: systemName, cels: cels };
  }




    function calculateOrbitalProperties(objects) {
    objects.forEach((obj) => {
      obj.map_x =
        obj.map_x !== undefined
          ? obj.map_x
          : obj.originalData
          ? obj.originalData.X
          : 0;
      obj.map_y =
        obj.map_y !== undefined
          ? obj.map_y
          : obj.originalData
          ? obj.originalData.Z
          : 0;
    });
  }
    function renderSystemSVG(celestialDataForSystem) {
    console.log("renderSystemSVG: Called with data for system.");
    if (!celestialDataForSystem || celestialDataForSystem.length === 0) {
      console.error("renderSystemSVG called with no celestial data.");
      return;
    }

    // transformRawDataToSystemFormat should now operate on celestialDataForSystem
    const systemObject = transformRawDataToSystemFormat(celestialDataForSystem);

    // calculateOrbitalProperties should also operate on the processed objects from the current system
    calculateOrbitalProperties(systemObject.cels);

    //svgElement.innerHTML = '';

    baseOrbitsGroup = document.createElementNS(SVG_NS, "g");
    baseOrbitsGroup.setAttribute("id", "baseOrbitsGroup");
    svgElement.appendChild(baseOrbitsGroup);

    signatureZonesGroup = document.createElementNS(SVG_NS, "g");
    signatureZonesGroup.setAttribute("id", "signatureZonesGroup");
    signatureZonesGroup.style.display = "none";
    svgElement.appendChild(signatureZonesGroup);

    celestialBodiesGroup = document.createElementNS(SVG_NS, "g");
    celestialBodiesGroup.setAttribute("id", "celestialBodiesGroup");
    svgElement.appendChild(celestialBodiesGroup);

    scanMarkersGroup = document.createElementNS(SVG_NS, "g");
    scanMarkersGroup.setAttribute("id", "scanMarkersGroup");
    svgElement.appendChild(scanMarkersGroup);

    const viewSize = 600;
    const halfViewSize = viewSize / 2;
    svgElement.setAttribute(
      "viewBox",
      `${-halfViewSize} ${-halfViewSize} ${viewSize} ${viewSize}`
    );
    let maxdist = 0;
    systemObject.cels.forEach((cel) => {
      if (cel.groupID === 7 || cel.groupID === 8 || cel.groupID === 10) {
        const distSq = cel.map_x * cel.map_x + cel.map_y * cel.map_y;
        if (distSq > maxdist) maxdist = distSq;
      }
    });
    maxdist = Math.sqrt(maxdist);
    if (maxdist === 0) {
      maxdist = AU_KM * 10;
    } // Ensure maxdist is not zero
    currentSystemScaleFactor =
      (halfViewSize * (1 - CEL_RADIUS_FACTOR * 3.0)) / maxdist;
    console.log(
      `RENDERER: Set currentSystemScaleFactor = ${currentSystemScaleFactor.toExponential(
        5
      )} based on maxdist ${maxdist.toExponential(3)}`
    );
    console.log(
      `RENDERER: Final maxdist for scaling = ${maxdist.toExponential(5)} km (${(
        maxdist / AU_KM
      ).toFixed(2)} AU)`
    );
    currentSystemScaleFactor =
      (halfViewSize * (1 - CEL_RADIUS_FACTOR * 3.0)) / maxdist;
    console.log(
      `RENDERER: Calculated currentSystemScaleFactor = ${currentSystemScaleFactor.toExponential(
        5
      )}`
    );
    currentSystemScaleFactor =
      (halfViewSize * (1 - CEL_RADIUS_FACTOR * 3.0)) / maxdist;
    console.log(
      `RENDER DEBUG: maxdist_km = ${maxdist.toExponential(
        3
      )}, halfViewSize = ${halfViewSize}, CEL_RADIUS_FACTOR_EFFECTIVE = ${
        CEL_RADIUS_FACTOR * 3.0
      }`
    );
    console.log(
      `RENDER DEBUG: currentSystemScaleFactor = ${currentSystemScaleFactor.toExponential(
        5
      )}`
    );
    const orbitStrokeWidthViewBox = ORBIT_WIDTH_FACTOR * viewSize;

    const orbitsToDraw = [];
    const bodiesAndStructures = [];
    const stars = [];
    systemObject.cels.forEach((cel) => {
      if (cel.groupID === 7) {
        orbitsToDraw.push(cel);
        bodiesAndStructures.push(cel);
      } else if (cel.groupID === 8 || cel.groupID === 10) {
        bodiesAndStructures.push(cel);
      } else if (cel.groupID === 6) {
        stars.push(cel);
      }
    });

    orbitsToDraw.forEach((cel) => {
      const orbit = document.createElementNS(SVG_NS, "circle");
      const orbitRadiusKm = Math.sqrt(
        cel.map_x * cel.map_x + cel.map_y * cel.map_y
      );
      const orbitRadiusSVG = orbitRadiusKm * currentSystemScaleFactor;
      if (orbitRadiusSVG > 0) {
        orbit.setAttribute("cx", "0");
        orbit.setAttribute("cy", "0");
        orbit.setAttribute("r", orbitRadiusSVG.toString());
        orbit.setAttribute("fill", "none");
        orbit.setAttribute("stroke", "rgba(255, 255, 255, 0.2)");
        orbit.setAttribute("stroke-width", orbitStrokeWidthViewBox.toString());
        baseOrbitsGroup.appendChild(orbit);
      }
    });

    const sortedCelestialsToDraw = [...stars, ...bodiesAndStructures];
    sortedCelestialsToDraw.forEach((cel) => {
      const bodyPlotX = cel.map_x * currentSystemScaleFactor;
      const bodyPlotY = cel.map_y * currentSystemScaleFactor;
      let currentCelRadiusScaled = CEL_RADIUS_FACTOR * halfViewSize;
      if (cel.groupID === 6) currentCelRadiusScaled *= 1.5;
      else if (cel.groupID === 8) currentCelRadiusScaled *= 0.6;
      else if (cel.groupID === 10) currentCelRadiusScaled *= 0.8;

      const bodyShape = document.createElementNS(SVG_NS, "circle");
      bodyShape.setAttribute("cx", bodyPlotX.toString());
      bodyShape.setAttribute("cy", bodyPlotY.toString());
      bodyShape.setAttribute("r", currentCelRadiusScaled.toString());
      bodyShape.setAttribute("fill", cel.typeColor);
      bodyShape.setAttribute("class", "celestial-body-svg");
      bodyShape.celestialData = cel;
      bodyShape.originalRadius = currentCelRadiusScaled;
      bodyShape.addEventListener("mouseover", handleBodyMouseOverSVG);
      bodyShape.addEventListener("mouseout", handleBodyMouseOutSVG);
      celestialBodiesGroup.appendChild(bodyShape);

      if (cel.groupID !== 6 && cel.groupID !== 8) {
        const labelTextElement = document.createElementNS(SVG_NS, "text");
        let labelName = cel.itemName;
        const nameParts = cel.itemName.split(" ");
        if (nameParts.length > 1) {
          const lastPart = nameParts[nameParts.length - 1];
          const secondLastPart =
            nameParts.length > 2
              ? nameParts[nameParts.length - 2].toLowerCase()
              : "";
          if (
            ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"].includes(
              lastPart.toUpperCase()
            )
          ) {
            labelName = lastPart;
          } else if (secondLastPart === "moon" && !isNaN(parseInt(lastPart))) {
            labelName = "M" + lastPart;
          } else if (
            !isNaN(parseInt(lastPart)) &&
            cel.itemName.includes("Moon")
          ) {
            labelName = "M" + lastPart;
          }
        }
        const labelPlotX =
          bodyPlotX + currentCelRadiusScaled + halfViewSize * 0.01;
        const labelPlotY = bodyPlotY;
        labelTextElement.setAttribute("x", labelPlotX.toString());
        labelTextElement.setAttribute("y", labelPlotY.toString());
        labelTextElement.textContent = labelName;
        const baseFontSizeSVG = halfViewSize * 0.025;
        labelTextElement.setAttribute("font-size", baseFontSizeSVG.toString());
        labelTextElement.setAttribute("fill", "#b0b0b0");
        labelTextElement.setAttribute("text-anchor", "start");
        labelTextElement.setAttribute("dominant-baseline", "middle");
        labelTextElement.style.pointerEvents = "none";
        celestialBodiesGroup.appendChild(labelTextElement);
      }
    });
    console.log("renderSystemSVG: Finished drawing map.");
  }
    
     function formatDistanceKmToAu(km) {
    if (km === undefined) return "N/A";
    if (km === 0) return "0 AU";
    return (km / AU_KM).toFixed(2) + " AU";
  }
    function formatNumber(num) {
    if (num === undefined) return "N/A";
    if (num === 0) return "0";
    const absNum = Math.abs(num);
    const sign = num < 0 ? "-" : "";
    if (absNum >= 1e12) return sign + (absNum / 1e12).toFixed(1) + " Tkm";
    if (absNum >= 1e9) return sign + (absNum / 1e9).toFixed(1) + " Bkm";
    if (absNum >= 1e6) return sign + (absNum / 1e6).toFixed(1) + " Mkm";
    if (absNum >= 1e3) return sign + (absNum / 1e3).toFixed(0) + " kkm";
    return sign + absNum.toFixed(0) + " km";
  }
    function handleBodyMouseOverSVG(event) {
    const celData = event.target.celestialData;
    if (!celData) return;
    const original = celData.originalData;
    let distKm;
    if (celData.groupID === 6) {
      distKm = 0;
    } else {
      distKm = Math.sqrt(
        celData.map_x * celData.map_x + celData.map_y * celData.map_y
      );
    }
    infoBox.innerHTML = `<strong>${
      celData.itemName
    }</strong><br>Dist (X-Z): ${formatDistanceKmToAu(
      distKm
    )}<br>Map X (orig X): ${formatNumber(
      celData.map_x
    )}<br>Map Y (orig Z): ${formatNumber(
      celData.map_y
    )}<br>Original Y-coord: ${formatNumber(original.Y)}`;
    infoBox.classList.add("visible");
    event.target.setAttribute(
      "r",
      (event.target.originalRadius * 1.5).toString()
    );
  }
    function handleBodyMouseOutSVG(event) {
    infoBox.classList.remove("visible");
    event.target.setAttribute("r", event.target.originalRadius.toString());
  }
    
     function parseDistanceToKm(distanceStr) {
    if (distanceStr === "-" || !distanceStr) return NaN;
    let distanceKmValue;
    const val = safeParseFloat(distanceStr);
    if (isNaN(val)) return NaN;
    if (distanceStr.toLowerCase().includes("au")) {
      distanceKmValue = val * AU_KM;
    } else if (distanceStr.toLowerCase().includes("km")) {
      distanceKmValue = val;
    } else {
      distanceKmValue = val / 1000;
    }
    return isNaN(distanceKmValue) ? NaN : distanceKmValue;
  }




    function parseScanLinesForTrilateration(scanText) {
    const lines = scanText.split("\n");
    const knownPoints = [];
    lines.forEach((line) => {
      const parts = line.split("\t");
      if (parts.length < 4) return;
      const itemName = parts[1].trim();
      const distanceStr = parts[3].trim();
      const distanceKm = parseDistanceToKm(distanceStr);
      if (itemName && !isNaN(distanceKm)) {
        const celestial = currentSystemCelestials.find(
          (c) => c.itemName === itemName
        );
        if (celestial) {
          knownPoints.push({
            x: celestial.X,
            y: celestial.Z,
            d: distanceKm,
            name: celestial.itemName,
          });
        }
      }
    });
    return knownPoints;
  }
    function trilaterate2D(p1, p2, p3) {
    let ex_x = p2.x - p1.x;
    let ex_y = p2.y - p1.y;
    const d_12 = Math.sqrt(ex_x * ex_x + ex_y * ex_y);
    if (d_12 === 0) {
      console.error("Trilateration Error: P1 and P2 are coincident.");
      return null;
    }
    ex_x /= d_12;
    ex_y /= d_12;
    const i_vec_x = p3.x - p1.x;
    const i_vec_y = p3.y - p1.y;
    const i = ex_x * i_vec_x + ex_y * i_vec_y;
    let ey_x = i_vec_x - i * ex_x;
    let ey_y = i_vec_y - i * ex_y;
    const d_13_projection_onto_ey = Math.sqrt(ey_x * ey_x + ey_y * ey_y);
    if (Math.abs(d_13_projection_onto_ey) < 1e-6) {
      console.error(
        "Trilateration Error: P1,P2,P3 appear to be collinear or P3 is too close to the P1-P2 line."
      );
      return null;
    }
    ey_x /= d_13_projection_onto_ey;
    ey_y /= d_13_projection_onto_ey;
    const j = ey_x * i_vec_x + ey_y * i_vec_y;
    if (Math.abs(j) < 1e-6) {
      console.error(
        "Trilateration Error: Calculated j is zero, indicates collinearity or problem with ey vector (P3 might be on line P1-P2)."
      );
      return null;
    }
    const x_prime = (p1.d * p1.d - p2.d * p2.d + d_12 * d_12) / (2 * d_12);
    const y_prime =
      (p1.d * p1.d - p3.d * p3.d + i * i + j * j - 2 * i * x_prime) / (2 * j);
    const final_scanner_x = p1.x + x_prime * ex_x + y_prime * ey_x;
    const final_scanner_z = p1.y + x_prime * ex_y + y_prime * ey_y;
    return { x: final_scanner_x, z: final_scanner_z };
  }
    
   function makeMarkerDraggable(elementToDrag, groupToActuallyTransform) {
    elementToDrag.style.cursor = "move";
    elementToDrag.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      let target = e.target;
      while (target && target !== svgElement) {
        if (
          target.classList &&
          target.classList.contains("scanner-marker-label")
        ) {
          return;
        }
        target = target.parentNode;
      }
      selectedDragTarget = groupToActuallyTransform;
      dragInitiator = elementToDrag;
      isDraggingMarker = true;
      const existingTransform =
        selectedDragTarget.transform.baseVal.consolidate();
      let initialTranslateX = 0;
      let initialTranslateY = 0;
      if (existingTransform) {
        initialTranslateX = existingTransform.matrix.e;
        initialTranslateY = existingTransform.matrix.f;
      }
      const CTM = svgElement.getScreenCTM();
      const svgPoint = svgElement.createSVGPoint();
      svgPoint.x = e.clientX;
      svgPoint.y = e.clientY;
      const svgClickCoords = svgPoint.matrixTransform(CTM.inverse());
      offset.x = svgClickCoords.x - initialTranslateX;
      offset.y = svgClickCoords.y - initialTranslateY;
      e.preventDefault();
    });
  }

    svgElement.addEventListener("mousemove", (e) => {
    if (!isDraggingMarker || !selectedDragTarget) return;
    e.preventDefault();
    const CTM = svgElement.getScreenCTM();
    const svgPoint = svgElement.createSVGPoint();
    svgPoint.x = e.clientX;
    svgPoint.y = e.clientY;
    const svgDragCoords = svgPoint.matrixTransform(CTM.inverse());
    let newX = svgDragCoords.x - offset.x;
    let newY = svgDragCoords.y - offset.y;
    selectedDragTarget.setAttribute("transform", `translate(${newX}, ${newY})`);
    const markerId = selectedDragTarget.id;
    if (
      plottedMarkerData[markerId] &&
      currentSystemScaleFactor !== 0 &&
      typeof currentSystemScaleFactor === "number"
    ) {
      const newKmX = newX / currentSystemScaleFactor;
      const newKmZ = newY / currentSystemScaleFactor;
      plottedMarkerData[markerId].x_km = newKmX;
      plottedMarkerData[markerId].z_km = newKmZ;
      updateMarkerInTable(markerId, { x_km: newKmX, z_km: newKmZ });
    }
  });
  svgElement.addEventListener("mouseup", (e) => {
    if (isDraggingMarker) {
      isDraggingMarker = false;
      selectedDragTarget = null;
      dragInitiator = null;
    }
  });
  svgElement.addEventListener("mouseleave", (e) => {
    if (isDraggingMarker) {
      isDraggingMarker = false;
      selectedDragTarget = null;
      dragInitiator = null;
    }
  });
    
  
   svgElement.addEventListener("click", (e) => {
    console.log(
      "SVG clicked. isAddingCustomMarkerMode:",
      isAddingCustomMarkerMode,
      "Target:",
      e.target
    ); // DEBUG

    if (isAddingCustomMarkerMode) {
      console.log(
        "SVG click in add mode. Target:",
        e.target.tagName,
        "SVG element is:",
        svgElement.tagName
      ); // DEBUG

      // Prevent placing on an existing interactive element if it's not the SVG canvas itself
      if (e.target !== svgElement) {
        // Check if the click was directly on the SVG or on a child
        console.log(
          "  Target is not the SVG element itself. Target tagName:",
          e.target.tagName
        ); // DEBUG
        // Allow clicking on orbit lines (circles in baseOrbitsGroup) or the SVG background
        // Disallow if clicking on celestial bodies, existing S-markers, or custom markers
        if (
          e.target.closest(".celestial-body-svg") ||
          e.target.closest(".scanner-marker-cross") ||
          e.target.closest(".scanner-marker-label") ||
          e.target.closest(".custom-marker-shape") || // Check for custom shapes
          e.target.closest(".custom-marker-label")
        ) {
          // Check for custom labels
          console.log(
            "  Custom marker placement: Click was on an existing interactive element, not placing."
          ); // DEBUG
          return;
        }
        // If it's a simple circle (like an orbit) and not the SVG itself, allow placement
        // This might need refinement if other non-interactive circles are present
        if (
          e.target.tagName === "circle" &&
          !e.target.classList.contains("celestial-body-svg") &&
          !e.target.classList.contains("custom-marker-shape")
        ) {
          console.log("  Target is likely an orbit line. Proceeding.");
        } else if (e.target !== svgElement && e.target.tagName !== "svg") {
          // If it's some other child that's not an orbit
          console.log(
            "  Target was an unhandled child element. Not placing yet."
          );
          // For now, let's only allow placement on SVG background or orbits.
          // If you want to place on any non-interactive child, remove this specific return.
          // return; // UNCOMMENT THIS if you ONLY want placement on SVG background or specific allowed children
        }
      } else {
        console.log(
          "  Target IS the SVG element itself. Proceeding with placement attempt."
        );
      }

      const CTM = svgElement.getScreenCTM()?.inverse();
      if (!CTM) {
        console.error("SVG CTM not available for custom marker placement.");
        return;
      }

      const svgPoint = svgElement.createSVGPoint();
      svgPoint.x = e.clientX;
      svgPoint.y = e.clientY;
      const mapClickCoords = svgPoint.matrixTransform(CTM); // Coords in SVG viewBox units

      const selectedShape = markerShapeSelect
        ? markerShapeSelect.value
        : "circle";
      const selectedColor = markerColorSelect ? markerColorSelect.value : "red";

      const markerLabelText = prompt(
        "Enter label for this custom marker:",
        `Custom ${customMarkerCounter + 1}`
      );

      if (markerLabelText !== null) {
        // User clicked "OK" on the prompt
        customMarkerCounter++;
        const markerId = `customMarker_${customMarkerCounter}`;

        if (
          typeof currentSystemScaleFactor !== "number" ||
          currentSystemScaleFactor === 0 ||
          isNaN(currentSystemScaleFactor)
        ) {
          alert(
            "Map scale factor is not set. Cannot calculate marker coordinates in km. Please load a system."
          );
          console.error(
            "Custom Marker: currentSystemScaleFactor is invalid:",
            currentSystemScaleFactor
          );
          customMarkerCounter--;
          // Exit add mode
          isAddingCustomMarkerMode = false;
          if (customMarkerControlsDiv)
            customMarkerControlsDiv.style.display = "none";
          if (customMarkerInstructions)
            customMarkerInstructions.textContent =
              "Select shape & color, then CLICK ON MAP to place.";
          if (parseScanButton) parseScanButton.disabled = false;
          if (trilaterateSelectedButton)
            trilaterateSelectedButton.disabled = !(
              selectedReferencePoints && selectedReferencePoints.length === 3
            );
          if (parseProbeDataButton) parseProbeDataButton.disabled = false;
          return;
        }
        const kmX = mapClickCoords.x / currentSystemScaleFactor;
        const kmZ = mapClickCoords.y / currentSystemScaleFactor;

        plottedMarkerData[markerId] = {
          label: markerLabelText.trim() || `Custom ${customMarkerCounter}`,
          x_km: kmX,
          z_km: kmZ,
          notes: `Shape: ${selectedShape}, Color: ${selectedColor}`,
          isCustom: true,
          shape: selectedShape,
          color: selectedColor,
        };

        // Create and plot the custom marker using its SVG coordinates
        createAndPlotCustomMarker(
          markerId,
          plottedMarkerData[markerId].label,
          selectedShape,
          selectedColor,
          mapClickCoords.x, // Pass SVG X
          mapClickCoords.y // Pass SVG Y
        );
        addMarkerToTable(markerId, plottedMarkerData[markerId].label, kmX, kmZ);

        // Automatically exit adding mode after successful placement
        isAddingCustomMarkerMode = false;
        if (customMarkerControlsDiv) {
          customMarkerControlsDiv.style.display = "none";
        }
        if (customMarkerInstructions) {
          customMarkerInstructions.textContent =
            "Select shape & color, then CLICK ON MAP to place.";
        }
        if (parseScanButton) parseScanButton.disabled = false;
        if (trilaterateSelectedButton) {
          trilaterateSelectedButton.disabled = !(
            selectedReferencePoints && selectedReferencePoints.length === 3
          );
        }
        if (parseProbeDataButton) parseProbeDataButton.disabled = false;
        console.log(
          "Exited custom marker placement mode after placing one marker."
        );
      } else {
        console.log(
          "Custom marker label prompt cancelled by user. Staying in add marker mode unless user clicks Cancel button."
        );
      }
    }
    // Add other global SVG click logic here if needed
  });

  /* ---- END ---*/

  if (cancelCustomMarkerButton) {
    cancelCustomMarkerButton.addEventListener("click", () => {
      isAddingCustomMarkerMode = false;
      if (customMarkerControlsDiv)
        customMarkerControlsDiv.style.display = "none";
      if (customMarkerInstructions)
        customMarkerInstructions.textContent =
          "Select shape & color, then CLICK ON MAP to place.";

      // Re-enable other buttons
      if (parseScanButton) parseScanButton.disabled = false;
      if (trilaterateSelectedButton) {
        trilaterateSelectedButton.disabled = !(
          selectedReferencePoints && selectedReferencePoints.length === 3
        );
      }
      if (parseProbeDataButton) parseProbeDataButton.disabled = false;
      console.log("Cancelled custom marker placement mode via button.");
    });
  }

    function addMarkerToTable(markerId, labelText, posX_km, posZ_km) {
    if (!plottedMarkersTableBody) {
      console.error(
        "CRITICAL addMarkerToTable: plottedMarkersTableBody is null or undefined!"
      );
      alert("Error: Table body for plotted markers not found!");
      return;
    }
    // console.log("addMarkerToTable: Adding row for markerId:", markerId, "Label:", labelText);

    const row = plottedMarkersTableBody.insertRow();
    if (!row) {
      console.error("addMarkerToTable: Failed to insert row!");
      return;
    }
    row.setAttribute("data-marker-id", markerId);

    const cellLabel = row.insertCell();
    cellLabel.textContent = labelText;

    const cellNotes = row.insertCell();
    const notesInput = document.createElement("input");

    if (!notesInput) {
      console.error(
        "CRITICAL addMarkerToTable: document.createElement('input') for notes returned null/undefined!"
      );
      return;
    }

    notesInput.type = "text";
    notesInput.placeholder = "Enter notes/type...";
    notesInput.className = "notes-input"; // Apply class after creation

    // Populate notes for both S-markers and custom markers
    if (plottedMarkerData[markerId]) {
      if (plottedMarkerData[markerId].isCustom) {
        // For custom markers, default notes can include shape and color
        notesInput.value =
          plottedMarkerData[markerId].notes ||
          `Shape: ${plottedMarkerData[markerId].shape}, Color: ${plottedMarkerData[markerId].color}`;
      } else {
        // For S-markers (trilaterated positions), notes might be linked signature info or user input
        notesInput.value = plottedMarkerData[markerId].notes || "";
      }
    } else {
      notesInput.value = ""; // Fallback if data somehow missing
      console.warn(
        "addMarkerToTable: plottedMarkerData missing for id when setting notes:",
        markerId
      );
    }

    notesInput.addEventListener("change", (e) => {
      if (plottedMarkerData[markerId]) {
        plottedMarkerData[markerId].notes = e.target.value;
        console.log(
          `Notes for ${markerId} updated in plottedMarkerData: ${e.target.value}`
        );
      }
    });
    cellNotes.appendChild(notesInput);

    const cellX = row.insertCell();
    cellX.textContent = (posX_km / AU_KM).toFixed(2);

    const cellZ = row.insertCell();
    cellZ.textContent = (posZ_km / AU_KM).toFixed(2);

    const cellActions = row.insertCell();
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Del";
    deleteButton.className = "delete-marker-button";
    deleteButton.onclick = function () {
      console.log("Delete button clicked for markerId:", markerId);
      const markerOnMap = document.getElementById(markerId);
      if (markerOnMap) {
        markerOnMap.remove();
        console.log(`SVG marker ${markerId} removed from map.`);
      } else {
        console.warn(`SVG marker ${markerId} not found on map for deletion.`);
      }

      row.remove(); // Remove table row
      console.log(`Table row for ${markerId} removed.`);

      delete plottedMarkerData[markerId]; // Remove from our data store
      console.log(`Data for ${markerId} removed from plottedMarkerData.`);

      // If this marker was linked to a probe signature, update the probe signature's state
      const probeSigIndex = parsedProbeSignatures.findIndex(
        (sig) => sig.mapMarkerId === markerId
      );
      if (probeSigIndex > -1) {
        parsedProbeSignatures[probeSigIndex].linkedMapMarkerLabel = null;
        parsedProbeSignatures[probeSigIndex].mapMarkerId = null;
        console.log(
          `Unlinked probe signature: ${parsedProbeSignatures[probeSigIndex].id}`
        );
        if (typeof displayParsedProbeSignatures === "function") {
          displayParsedProbeSignatures(); // Refresh probe table to show it's unlinked
        }
      }
    };
    cellActions.appendChild(deleteButton);
    // console.log("addMarkerToTable: Row added successfully for", markerId);
  }

  function updateMarkerInTable(markerId, updates) {
    if (!plottedMarkersTableBody) {
      console.error("updateMarkerInTable: plottedMarkersTableBody is null");
      return;
    }
    const row = plottedMarkersTableBody.querySelector(
      `tr[data-marker-id="${markerId}"]`
    );
    if (!row) return;
    if (updates.label !== undefined) {
      row.cells[0].textContent = updates.label;
    }
    if (
      updates.notes !== undefined &&
      row.cells[1].firstChild &&
      row.cells[1].firstChild.value !== updates.notes
    ) {
      row.cells[1].firstChild.value = updates.notes;
    }
    if (updates.x_km !== undefined) {
      row.cells[2].textContent = (updates.x_km / AU_KM).toFixed(2);
    }
    if (updates.z_km !== undefined) {
      row.cells[3].textContent = (updates.z_km / AU_KM).toFixed(2);
    }
  }

function handleParseScanAndPrepareSelection() {
    console.log("handleParseScanAndPrepareSelection called"); // For debugging

    // Ensure necessary DOM elements are available
    if (!scanDataInput || !selectableCelestialsContainer || !trilaterateSelectedButton || !selectionCountSpan) {
        console.error("handleParseScanAndPrepareSelection: One or more required UI elements for D-Scan selection are missing from the DOM or not yet defined in JS.");
        alert("Error: UI components for D-Scan processing are not ready.");
        return;
    }

    const scanText = scanDataInput.value;

    if (!scanText.trim()) {
        alert("Paste D-Scan data into the text area.");
        selectableCelestialsContainer.style.display = 'none';
        trilaterateSelectedButton.style.display = 'none';
        // Clear any existing D-Scan range circles if that group exists
        if (typeof dscanRangeCirclesGroup !== 'undefined' && dscanRangeCirclesGroup) {
            dscanRangeCirclesGroup.innerHTML = '';
        }
        knownPointsFromCurrentScan = []; // Clear previous scan points
        selectedReferencePoints = [];    // Clear previous selections
        if (typeof updateSelectionCountAndButton === 'function') {
            updateSelectionCountAndButton(); // Update UI for (0/3) and button state
        }
        return;
    }

    // Parse the scan text to find known celestials and their distances
    if (typeof parseScanLinesForTrilateration === 'function') {
        knownPointsFromCurrentScan = parseScanLinesForTrilateration(scanText);
        console.log("Parsed known points from D-scan for trilateration list:", knownPointsFromCurrentScan);
    } else {
        console.error("handleParseScanAndPrepareSelection: parseScanLinesForTrilateration function is not defined!");
        return;
    }

    // Display these celestials for user selection
    if (typeof displaySelectableCelestials === 'function') {
        displaySelectableCelestials();
    } else {
        console.error("handleParseScanAndPrepareSelection: displaySelectableCelestials function is not defined!");
    }
}


  function displaySelectableCelestials() {
    if (
      !selectableCelestialsList ||
      !selectableCelestialsContainer ||
      !selectionCountSpan
    )
      return;
    selectableCelestialsList.innerHTML = "";
    selectedReferencePoints = [];
    updateSelectionCountAndButton();

    if (
      !knownPointsFromCurrentScan ||
      knownPointsFromCurrentScan.length === 0
    ) {
      selectableCelestialsList.innerHTML =
        "<p style='color: #888;'>No known celestials with distances found in scan data.</p>";
      //selectableCelestialsContainer.style.display = "block";
      if (selectableCelestialsContainer)
        selectableCelestialsContainer.style.display = "flex";
      return;
    }
    if (knownPointsFromCurrentScan.length < 3) {
      selectableCelestialsList.innerHTML = `<p style='color: #ff8888;'>Need at least 3 known celestials with distances for trilateration. Found ${knownPointsFromCurrentScan.length}.</p>`;
      selectableCelestialsContainer.style.display = "block";
      return;
    }
    knownPointsFromCurrentScan.forEach((point, index) => {
      const itemDiv = document.createElement("div");
      itemDiv.classList.add("celestial-item");
      itemDiv.textContent = `${point.name} (${(point.d / AU_KM).toFixed(
        2
      )} AU)`;
      itemDiv.dataset.pointIndex = index.toString();

      itemDiv.addEventListener("click", () => {
        const alreadySelected = itemDiv.classList.contains("selected");
        if (alreadySelected) {
          itemDiv.classList.remove("selected");
          selectedReferencePoints = selectedReferencePoints.filter(
            (p) => p.name !== point.name
          );
        } else {
          if (selectedReferencePoints.length < 3) {
            itemDiv.classList.add("selected");
            selectedReferencePoints.push(point);
          } else {
            alert("You can only select up to 3 reference points.");
          }
        }
        updateSelectionCountAndButton();
      });
      selectableCelestialsList.appendChild(itemDiv);
    });
    selectableCelestialsContainer.style.display = "block";
  }


   



    function handleTrilaterateSelected() {
    // This is the function called after D-Scan point selection
    if (!currentSystemScaleFactor || currentSystemScaleFactor === 0) {
      alert("System scale factor not set. Please load a system map first.");
      console.error(
        "handleTrilaterateSelected: currentSystemScaleFactor is invalid."
      );
      return;
    }
    if (selectedReferencePoints.length !== 3) {
      alert("Please select exactly 3 reference points from the list.");
      return;
    }
    console.log(
      "Using user-selected points for trilateration:",
      selectedReferencePoints
    );
    const p1 = selectedReferencePoints[0];
    const p2 = selectedReferencePoints[1];
    const p3 = selectedReferencePoints[2];

    if (
      (Math.abs(p1.x - p2.x) < 1e-3 && Math.abs(p1.y - p2.y) < 1e-3) ||
      (Math.abs(p1.x - p3.x) < 1e-3 && Math.abs(p1.y - p3.y) < 1e-3) ||
      (Math.abs(p2.x - p3.x) < 1e-3 && Math.abs(p2.y - p3.y) < 1e-3)
    ) {
      alert(
        "Trilateration requires three distinct reference points. Please choose different celestials."
      );
      return;
    }

    const scannerPosKm = trilaterate2D(p1, p2, p3);

    if (
      scannerPosKm &&
      typeof scannerPosKm.x === "number" &&
      typeof scannerPosKm.z === "number" &&
      !isNaN(scannerPosKm.x) &&
      !isNaN(scannerPosKm.z)
    ) {
      console.log(
        "Calculated Scanner Position (km in X-Z plane):",
        scannerPosKm
      );
      scannerPosMarkerCounter++;
      const markerGroupId = `scannerMarkerGroup_${scannerPosMarkerCounter}`;
      const initialLabelText = `S${scannerPosMarkerCounter}`;

      plottedMarkerData[markerGroupId] = {
        label: initialLabelText,
        x_km: scannerPosKm.x,
        z_km: scannerPosKm.z,
        notes: "",
        linkedSignatureId: null,
      };

      const plotX_svg = scannerPosKm.x * currentSystemScaleFactor;
      const plotZ_svg = scannerPosKm.z * currentSystemScaleFactor;
      const markerSizeViewBox = 7; // Visual size of the cross arms in SVG units

      const markerGroup = document.createElementNS(SVG_NS, "g");
      markerGroup.setAttribute("id", markerGroupId);
      // markerGroup.dataset.originalPlotX = plotX_svg; // Not strictly needed if we store km in plottedMarkerData
      // markerGroup.dataset.originalPlotY = plotZ_svg;

      const cross = document.createElementNS(SVG_NS, "g");
      cross.classList.add("scanner-marker-cross"); // CSS will style the lines inside

      const line1 = document.createElementNS(SVG_NS, "line");
      line1.setAttribute("x1", (-markerSizeViewBox).toString());
      line1.setAttribute("y1", (0).toString());
      line1.setAttribute("x2", markerSizeViewBox.toString());
      line1.setAttribute("y2", (0).toString());

      const line2 = document.createElementNS(SVG_NS, "line");
      line2.setAttribute("x1", (0).toString());
      line2.setAttribute("y1", (-markerSizeViewBox).toString());
      line2.setAttribute("x2", (0).toString());
      line2.setAttribute("y2", markerSizeViewBox.toString());

      cross.appendChild(line1);
      cross.appendChild(line2);
      console.log("Cross lines created and appended to cross group."); // Debug

      const label = document.createElementNS(SVG_NS, "text");
      const labelOffsetX = markerSizeViewBox + 5;
      const labelOffsetY = 0;
      label.setAttribute("x", labelOffsetX.toString());
      label.setAttribute("y", labelOffsetY.toString());
      label.classList.add("scanner-marker-label");
      label.textContent = initialLabelText;
      label.style.cursor = "pointer";

      label.addEventListener("click", (e) => {
        // Event listener for label editing/linking
        e.stopPropagation();
        const mapMarkerLabelElement = e.currentTarget;
        const currentMapLabelText = mapMarkerLabelElement.textContent;

        let parentGroupForLabel = mapMarkerLabelElement.parentNode;
        while (
          parentGroupForLabel &&
          !parentGroupForLabel.id.startsWith("scannerMarkerGroup_")
        ) {
          parentGroupForLabel = parentGroupForLabel.parentNode;
        }
        const clickedMarkerGroupId = parentGroupForLabel
          ? parentGroupForLabel.id
          : null;

        if (!clickedMarkerGroupId) {
          console.error("Could not determine marker group ID for label click.");
          return;
        }

        if (isLinkingProbeSignature && signatureToLink) {
          // ... (linking logic as before) ...
          console.log(
            `Linking signature ${signatureToLink.id} to map marker ${currentMapLabelText} (ID: ${clickedMarkerGroupId})`
          );
          signatureToLink.linkedMapMarkerLabel = currentMapLabelText;
          signatureToLink.mapMarkerId = clickedMarkerGroupId;
          if (plottedMarkerData[clickedMarkerGroupId]) {
            plottedMarkerData[clickedMarkerGroupId].linkedSignatureId =
              signatureToLink.id;
            if (!plottedMarkerData[clickedMarkerGroupId].notes) {
              plottedMarkerData[clickedMarkerGroupId].notes = `${
                signatureToLink.id
              } (${signatureToLink.specificName || signatureToLink.name})`;
            }
          }
          displayParsedProbeSignatures();
          updateMarkerInTable(clickedMarkerGroupId, {
            notes: plottedMarkerData[clickedMarkerGroupId]?.notes,
          });
          alert(
            `Signature ${signatureToLink.id} linked to map marker ${currentMapLabelText}.`
          );
          isLinkingProbeSignature = false;
          signatureToLink = null;
          if (parseScanButton) parseScanButton.disabled = false;
          if (trilaterateSelectedButton)
            trilaterateSelectedButton.disabled =
              selectedReferencePoints.length !== 3;
        } else {
          // Normal label editing
          let promptDefault = currentMapLabelText.match(/^S\d+$/)
            ? ""
            : currentMapLabelText;
          const newLabelText = prompt(
            `Enter new label for marker (was "${currentMapLabelText}"):`,
            promptDefault
          );
          if (newLabelText !== null) {
            const trimmedNewLabel = newLabelText.trim();
            if (trimmedNewLabel !== "") {
              mapMarkerLabelElement.textContent = trimmedNewLabel;
              if (plottedMarkerData[clickedMarkerGroupId])
                plottedMarkerData[clickedMarkerGroupId].label = trimmedNewLabel;
              updateMarkerInTable(clickedMarkerGroupId, {
                label: trimmedNewLabel,
              });
              const linkedSig = parsedProbeSignatures.find(
                (sig) => sig.mapMarkerId === clickedMarkerGroupId
              );
              if (linkedSig) {
                linkedSig.linkedMapMarkerLabel = trimmedNewLabel;
                displayParsedProbeSignatures();
              }
            } else {
              if (!currentMapLabelText.match(/^S\d+$/)) {
                const defaultSxLabel = plottedMarkerData[clickedMarkerGroupId]
                  ? plottedMarkerData[clickedMarkerGroupId].label
                  : `S${
                      clickedMarkerGroupId.split("_")[1] ||
                      scannerPosMarkerCounter
                    }`;
                mapMarkerLabelElement.textContent = defaultSxLabel;
                if (plottedMarkerData[clickedMarkerGroupId])
                  plottedMarkerData[clickedMarkerGroupId].label =
                    defaultSxLabel;
                updateMarkerInTable(clickedMarkerGroupId, {
                  label: defaultSxLabel,
                });
                if (
                  parsedProbeSignatures.find(
                    (sig) => sig.mapMarkerId === clickedMarkerGroupId
                  )
                ) {
                  parsedProbeSignatures.find(
                    (sig) => sig.mapMarkerId === clickedMarkerGroupId
                  ).linkedMapMarkerLabel = defaultSxLabel;
                  displayParsedProbeSignatures();
                }
                alert("Label cannot be empty. Reverted.");
              }
            }
          }
        }
      });

      markerGroup.appendChild(cross);
      markerGroup.appendChild(label);

      markerGroup.setAttribute(
        "transform",
        `translate(${plotX_svg}, ${plotZ_svg})`
      );

      if (scanMarkersGroup) {
        // Ensure scanMarkersGroup exists
        scanMarkersGroup.appendChild(markerGroup);
        console.log(
          `Scanner marker S${scannerPosMarkerCounter} group appended to scanMarkersGroup.`
        );
      } else {
        console.error(
          "scanMarkersGroup is not defined when trying to append markerGroup!"
        );
      }

      if (typeof makeMarkerDraggable === "function") {
        // Ensure function exists
        makeMarkerDraggable(cross, markerGroup);
        console.log(`Draggability applied to cross for ${markerGroupId}`);
      } else {
        console.error("makeMarkerDraggable function is not defined!");
      }

      addMarkerToTable(
        markerGroupId,
        initialLabelText,
        scannerPosKm.x,
        scannerPosKm.z
      );
    } else {
      alert(
        "Could not determine scanner position. Trilateration failed. Check scan data and console for errors."
      );
      console.error("Trilateration result was null or invalid:", scannerPosKm);
    }
  }
    function handleClearScanText() {
    if (scanDataInput) scanDataInput.value = "";
  }

    function handleClearMarkers() {
    if (scanMarkersGroup) {
      while (scanMarkersGroup.firstChild) {
        scanMarkersGroup.removeChild(scanMarkersGroup.firstChild);
      }
    }
    if (plottedMarkersTableBody) plottedMarkersTableBody.innerHTML = "";
    if (probeScanTableBody) probeScanTableBody.innerHTML = "";
    if (!probeScanTableBody)
      console.error(
        "CRITICAL ERROR: probeScanTableBody element not found on script start!"
      );
    scannerPosMarkerCounter = 0;

    /* reset the Custom Marker */
    customMarkerCounter = 0;
    /* --- END --- */

    plottedMarkerData = {};
    parsedProbeSignatures = [];
    if (selectableCelestialsContainer)
      selectableCelestialsContainer.style.display = "none";
    if (trilaterateSelectedButton)
      trilaterateSelectedButton.style.display = "none";
    selectedReferencePoints = [];
    if (
      selectionCountSpan &&
      typeof updateSelectionCountAndButton === "function"
    )
      updateSelectionCountAndButton();
    isLinkingProbeSignature = false;
    signatureToLink = null;
    if (parseScanButton) parseScanButton.disabled = false;
    if (
      trilaterateSelectedButton &&
      typeof selectedReferencePoints !== "undefined" &&
      selectedReferencePoints.length === 3
    )
      trilaterateSelectedButton.disabled = false;
    else if (trilaterateSelectedButton)
      trilaterateSelectedButton.disabled = true;
    console.log("All markers and all tables cleared. Linking state reset.");
  }

  function toggleSignatureZones() {
    console.log("toggleSignatureZones: Called.");

    if (
      typeof currentSystemScaleFactor !== "number" ||
      currentSystemScaleFactor === 0 ||
      isNaN(currentSystemScaleFactor)
    ) {
      console.error(
        "toggleSignatureZones FATAL: currentSystemScaleFactor is invalid:",
        currentSystemScaleFactor
      );
      alert(
        "Map scale factor not properly set. Please load or re-load a system first."
      );
      return;
    }
    if (!currentSystemCelestials || currentSystemCelestials.length === 0) {
      console.error(
        "toggleSignatureZones FATAL: currentSystemCelestials is empty or not defined."
      );
      alert(
        "No celestial data loaded to draw zones around. Please load a system map first."
      );
      return;
    }
    if (!signatureZonesGroup) {
      console.error(
        "toggleSignatureZones FATAL: signatureZonesGroup DOM element is not defined/found! Cannot proceed."
      );
      return;
    }

    const FOUR_AU_IN_KM = 4 * AU_KM;
    const calculated_svg_radius_for_4AU =
      FOUR_AU_IN_KM * currentSystemScaleFactor; // This is the true scaled radius

    // --- DECIDE ON FINAL RADIUS AND STROKE FOR DISPLAY ---
    // Option: Always use true scale for radius
    const final_radius_to_use = calculated_svg_radius_for_4AU;
    // Option: Use a fixed, thin stroke width in viewBox units
    const final_stroke_width_to_use = 0.75; // Example: 0.75 viewBox units for stroke

    console.log(
      `toggleSignatureZones: 4AU in KM = ${FOUR_AU_IN_KM.toExponential(2)}`
    );
    console.log(
      `toggleSignatureZones: currentSystemScaleFactor = ${currentSystemScaleFactor.toExponential(
        5
      )}`
    );
    console.log(
      `toggleSignatureZones: Calculated 4AU radius in SVG units = ${calculated_svg_radius_for_4AU.toFixed(
        2
      )}`
    );
    console.log(
      `toggleSignatureZones: Using display radius = ${final_radius_to_use.toFixed(
        2
      )}, display stroke = ${final_stroke_width_to_use.toFixed(2)}`
    );

    if (signatureZonesGroup.style.display === "none") {
      console.log(
        "toggleSignatureZones: Zones are hidden, attempting to draw and show."
      );
      while (signatureZonesGroup.firstChild) {
        signatureZonesGroup.removeChild(signatureZonesGroup.firstChild);
      }

      const systemToDrawZonesFor = transformRawDataToSystemFormat(
        currentSystemCelestials
      );

      if (
        systemToDrawZonesFor &&
        systemToDrawZonesFor.cels &&
        systemToDrawZonesFor.cels.length > 0
      ) {
        systemToDrawZonesFor.cels.forEach((cel) => {
          const plotX_celestial = cel.map_x * currentSystemScaleFactor;
          const plotY_celestial = cel.map_y * currentSystemScaleFactor;

          const zoneCircle = document.createElementNS(SVG_NS, "circle");
          zoneCircle.setAttribute("cx", plotX_celestial.toString());
          zoneCircle.setAttribute("cy", plotY_celestial.toString());
          zoneCircle.setAttribute("r", final_radius_to_use.toString());
          zoneCircle.setAttribute(
            "stroke-width",
            final_stroke_width_to_use.toString()
          );
          zoneCircle.setAttribute("class", "signature-zone-circle"); // CSS class handles fill/stroke color/opacity
          zoneCircle.style.pointerEvents = "none";
          signatureZonesGroup.appendChild(zoneCircle);
        });
        signatureZonesGroup.style.display = "";
        if (toggleSignatureZonesButton)
          toggleSignatureZonesButton.textContent = "Hide Signature Zones";
      } else {
        console.error(
          "toggleSignatureZones: No processed celestial data for zones."
        );
      }
    } else {
      signatureZonesGroup.style.display = "none";
      if (toggleSignatureZonesButton)
        toggleSignatureZonesButton.textContent = "Show Signature Zones";
    }
  }
    
    function handleParseProbeData() {
    console.log("handleParseProbeData: Called.");
    if (!scanDataInput) {
      console.error("Main scan data input area ('scanDataInput') not found.");
      alert("Error: Scan input area not found. Please refresh.");
      return;
    }
    const scanText = scanDataInput.value;
    if (!scanText.trim()) {
      alert("Paste probe scan data into the text area first.");
      if (probeScanTableBody) probeScanTableBody.innerHTML = "";
      parsedProbeSignatures = [];
      return;
    }
    parsedProbeSignatures = [];
    const lines = scanText.split("\n");
    let parseErrors = 0;
    let successfullyParsedCount = 0;
    lines.forEach((line) => {
      const parts = line.split("\t");
      if (parts.length >= 6) {
        const id = parts[0].trim();
        const group = parts[1].trim();
        const name = parts[2].trim();
        const specificName = parts[3].trim();
        const resolutionStr = parts[4].trim().replace("%", "");
        const rangeStr = parts[5].trim();
        const resolution = parseFloat(resolutionStr);
        const rangeKm = parseDistanceToKm(rangeStr);
        if (id && !isNaN(resolution) && !isNaN(rangeKm)) {
          parsedProbeSignatures.push({
            id,
            group,
            name,
            specificName,
            resolution,
            rangeKm,
            rangeOriginalStr: rangeStr,
            linkedMapMarkerLabel: null,
            mapMarkerId: null,
          });
          successfullyParsedCount++;
        } else {
          parseErrors++;
        }
      } else if (line.trim() !== "") {
        parseErrors++;
      }
    });
    if (
      parsedProbeSignatures.length === 0 &&
      parseErrors > 0 &&
      lines.length > 0
    ) {
      alert("No valid probe scan entries parsed. Check format.");
    } else if (parseErrors > 0) {
      alert(
        `Parsed ${successfullyParsedCount} signatures, ${parseErrors} lines with errors.`
      );
    } else if (parsedProbeSignatures.length === 0 && lines.length > 0) {
      alert("No signatures found in text.");
    }
    displayParsedProbeSignatures();
  }
    function displayParsedProbeSignatures() {
    console.log(
      "displayParsedProbeSignatures: Called with",
      parsedProbeSignatures.length,
      "signatures."
    );
    if (!probeScanTableBody) {
      console.error(
        "displayParsedProbeSignatures: probeScanTableBody element is null!"
      );
      return;
    }
    probeScanTableBody.innerHTML = "";
    if (parsedProbeSignatures.length === 0) {
      const row = probeScanTableBody.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 8;
      cell.textContent = "No probe scan data parsed or list is empty.";
      cell.style.textAlign = "center";
      cell.style.color = "#888";
      return;
    }
    parsedProbeSignatures.forEach((sig) => {
      const row = probeScanTableBody.insertRow();
      row.classList.remove("res-green", "res-yellow", "res-red");
      if (sig.resolution === 100) row.classList.add("res-green");
      else if (sig.resolution >= 50) row.classList.add("res-yellow");
      else row.classList.add("res-red");
      row.insertCell().textContent = sig.id;
      row.insertCell().textContent = sig.group;
      row.insertCell().textContent = sig.name;
      row.insertCell().textContent = sig.specificName;
      row.insertCell().textContent = sig.resolution.toFixed(1) + "%";
      row.insertCell().textContent = sig.rangeOriginalStr;
      const linkedMarkerCell = row.insertCell();
      linkedMarkerCell.textContent = sig.linkedMapMarkerLabel || "---";
      linkedMarkerCell.id = `probe-link-cell-${sig.id.replace(/\W/g, "_")}`;
      const actionsCell = row.insertCell();
      const linkButton = document.createElement("button");
      linkButton.textContent = "Link";
      linkButton.className = "link-marker-button";
      linkButton.onclick = () => startLinkingSignature(sig);
      actionsCell.appendChild(linkButton);
    });
  }
    function startLinkingSignature(signature) {
    if (isLinkingProbeSignature) {
      alert(
        `Already linking "${signatureToLink.id}". Click map marker or cancel.`
      );
      return;
    }
    isLinkingProbeSignature = true;
    signatureToLink = signature;
    if (trilaterateSelectedButton) trilaterateSelectedButton.disabled = true;
    if (parseScanButton) parseScanButton.disabled = true;
    alert(
      `LINKING MODE: Click label of an 'S' marker on map to link with ${signature.id}.`
    );
    console.log("Linking mode for sig:", signature);
  }

    function createAndPlotCustomMarker(id, labelText, shapeType, color, svgX, svgY) {
    // svgX, svgY are the SVG coordinates where the user clicked (center of the marker)
    //console.log(`Creating Custom Marker: ID=${id}, Label=${labelText}, Shape=${shapeType}, Color=${color}, svgX=${svgX.toFixed(1)}, svgY=${svgY.toFixed(1)}`);

    if (!scanMarkersGroup) {
        console.error("CRITICAL createAndPlotCustomMarker: scanMarkersGroup is not initialized!");
        return;
    }
    if (typeof currentSystemScaleFactor !== 'number' || currentSystemScaleFactor === 0 || isNaN(currentSystemScaleFactor)) {
         console.error("CRITICAL createAndPlotCustomMarker: currentSystemScaleFactor is invalid for custom marker km calculation.");
        // Marker can still be placed using SVG coords, but km coords in table might be off.
    }


    const markerGroup = document.createElementNS(SVG_NS, "g");
    markerGroup.setAttribute("id", id);
    markerGroup.setAttribute('transform', `translate(${svgX}, ${svgY})`); // Position the whole group

    let shapeElement; // This will be the main visual shape or the drag handle
    const baseSize = 6; // Base size in SVG viewBox units for small shapes/handles
    const strokeW = 1.5;

    switch (shapeType) {
        case "dscan_area":
            const DSCAN_RADIUS_AU = 14.3;
            const dscanRadiusKm = DSCAN_RADIUS_AU * AU_KM;
            const dscanRadiusSVG = dscanRadiusKm * currentSystemScaleFactor;

            const rangeCircle = document.createElementNS(SVG_NS, "circle");
            rangeCircle.setAttribute("cx", "0"); // Relative to markerGroup
            rangeCircle.setAttribute("cy", "0");
            rangeCircle.setAttribute("r", dscanRadiusSVG.toString());
            
            rangeCircle.setAttribute("fill", "rgba(255, 100, 0, 0.05)"); // More opaque orange fill
            rangeCircle.setAttribute("stroke", "yellow");             // Bright yellow stroke
            rangeCircle.setAttribute("stroke-width", "1");          // 2 viewBox units thick stroke
            rangeCircle.setAttribute("stroke-dasharray", "8,8");     // Longer dashes

            rangeCircle.style.pointerEvents = "none"; // The large circle itself is not draggable
            markerGroup.appendChild(rangeCircle);
            // ... create rangeCircle ...
                shapeElement = document.createElementNS(SVG_NS, "g");
                shapeElement.classList.add("dscan-area-handle"); // New class for this specific handle
                // ... create lines, add to shapeElement ...

            // Add a small central cross as the visible shape and drag handle
            shapeElement = document.createElementNS(SVG_NS, "g");
            shapeElement.classList.add("custom-marker-shape"); // For potential common styling
            // Apply a class similar to scanner-marker-cross or define styles for it
            const dscanLine1 = document.createElementNS(SVG_NS, "line");
            dscanLine1.setAttribute("x1", -baseSize); dscanLine1.setAttribute("y1", 0);
            dscanLine1.setAttribute("x2", baseSize);  dscanLine1.setAttribute("y2", 0);
            dscanLine1.setAttribute("stroke", color); // Use selected color for the central cross
            dscanLine1.setAttribute("stroke-width", strokeW.toString());
            const dscanLine2 = document.createElementNS(SVG_NS, "line");
            dscanLine2.setAttribute("x1", 0); dscanLine2.setAttribute("y1", -baseSize);
            dscanLine2.setAttribute("x2", 0); dscanLine2.setAttribute("y2", baseSize);
            dscanLine2.setAttribute("stroke", color); dscanLine2.setAttribute("stroke-width", strokeW.toString());
            shapeElement.appendChild(dscanLine1);
            shapeElement.appendChild(dscanLine2);
            break; // End of dscan_area case

        case "cross":
            shapeElement = document.createElementNS(SVG_NS, "g");
            // ... (rest of cross creation as before, using 'baseSize' and 'color') ...
            const line1 = document.createElementNS(SVG_NS, "line");
            line1.setAttribute("x1", -baseSize); line1.setAttribute("y1", 0);
            line1.setAttribute("x2", baseSize);  line1.setAttribute("y2", 0);
            line1.setAttribute("stroke", color); line1.setAttribute("stroke-width", strokeW.toString());
            const line2 = document.createElementNS(SVG_NS, "line");
            line2.setAttribute("x1", 0); line2.setAttribute("y1", -baseSize);
            line2.setAttribute("x2", 0); line2.setAttribute("y2", baseSize);
            line2.setAttribute("stroke", color); line2.setAttribute("stroke-width", strokeW.toString());
            shapeElement.appendChild(line1); shapeElement.appendChild(line2);
            break;
        case "square":
            shapeElement = document.createElementNS(SVG_NS, "rect");
            shapeElement.setAttribute("x", (-baseSize / 2).toString());
            shapeElement.setAttribute("y", (-baseSize / 2).toString());
            shapeElement.setAttribute("width", baseSize.toString());
            shapeElement.setAttribute("height", baseSize.toString());
            shapeElement.setAttribute("fill", color);
            break;
        case "diamond":
            shapeElement = document.createElementNS(SVG_NS, "polygon");
            shapeElement.setAttribute("points", `0,${-baseSize} ${baseSize},0 0,${baseSize} ${-baseSize},0`); // Adjusted for baseSize
            shapeElement.setAttribute("fill", color);
            break;
        case "triangle_up":
            shapeElement = document.createElementNS(SVG_NS, "polygon");
            shapeElement.setAttribute("points", `0,${-baseSize*0.866} ${baseSize},${baseSize*0.433} ${-baseSize},${baseSize*0.433}`);
            shapeElement.setAttribute("fill", color);
            break;
        case "circle":
        default:
            shapeElement = document.createElementNS(SVG_NS, "circle");
            shapeElement.setAttribute("cx", "0");
            shapeElement.setAttribute("cy", "0");
            shapeElement.setAttribute("r", (baseSize / 1.5).toString()); // Make circle a bit larger for visibility
            shapeElement.setAttribute("fill", color);
            break;
    }

    if (!shapeElement) {
        console.error("Failed to create shapeElement for type:", shapeType);
        return; // Don't proceed if shape wasn't created
    }
    shapeElement.classList.add("custom-marker-shape"); // Add common class if needed for global styles
    markerGroup.appendChild(shapeElement); // Add the primary shape/drag handle

    // Add Label
    const label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("x", (baseSize + 2).toString()); // Position label to the right of the central shape/handle
    label.setAttribute("y", "0");    
    label.classList.add("custom-marker-label"); 
    label.textContent = labelText;
    // label.style.fill = tinycolor(color).isDark() ? "#e0e0e0" : "#101010"; // Requires TinyColor
    label.style.fill = "#DDDDDD"; // Default label color

    label.style.cursor = "pointer";
    label.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentLabelContent = label.textContent;
        let promptDefault = currentLabelContent; // Keep current custom label as default
        const newLabelText = prompt(`Edit custom marker label (was "${currentLabelContent}"):`, promptDefault);
        if (newLabelText !== null && newLabelText.trim() !== "") {
            const trimmedNewLabel = newLabelText.trim();
            label.textContent = trimmedNewLabel;
            if (plottedMarkerData[id]) plottedMarkerData[id].label = trimmedNewLabel;
            updateMarkerInTable(id, { label: trimmedNewLabel });
        } else if (newLabelText !== null && newLabelText.trim() === "" && plottedMarkerData[id]) {
            // If user entered empty string, revert to original if it was custom, or keep if it was default Custom X
            const originalLabel = plottedMarkerData[id].label.startsWith("Custom ") ? labelText : plottedMarkerData[id].label;
            label.textContent = originalLabel;
            alert("Label cannot be empty. Reverted.");
        }
    });
    markerGroup.appendChild(label);

    scanMarkersGroup.appendChild(markerGroup);
    
    // Make the 'shapeElement' (which is the central cross for dscan_area, or the shape itself for others) draggable.
    // This element will move the whole 'markerGroup'.
    if (typeof makeMarkerDraggable === 'function') {
       makeMarkerDraggable(shapeElement, markerGroup); 
    } else {
        console.error("makeMarkerDraggable function is not defined!");
    }
    console.log(`Custom marker "${labelText}" (ID: ${id}) added to map.`);
}
  

    // --- SECTION 3: Event Listener Attachments ---
    console.log("Attaching event listeners...");
    if (loadSystemButton) loadSystemButton.addEventListener('click', () => { const sysId = systemIdInput ? systemIdInput.value.trim() : null; if (sysId) fetchAndRenderSystem(sysId); else alert("Enter System Name."); });
    if (parseScanButton) parseScanButton.addEventListener('click', handleParseScanAndPrepareSelection);
    if (trilaterateSelectedButton) trilaterateSelectedButton.addEventListener('click', handleTrilaterateSelected);
    if (parseProbeDataButton) parseProbeDataButton.addEventListener('click', handleParseProbeData);
    if (toggleSignatureZonesButton) toggleSignatureZonesButton.addEventListener('click', toggleSignatureZones);
    if (clearScanDataButton) clearScanDataButton.addEventListener('click', handleClearScanText);
    if (clearMarkersButton) clearMarkersButton.addEventListener('click', handleClearMarkers);
    if (prepareCustomMarkerButton) prepareCustomMarkerButton.addEventListener('click', () => { isAddingCustomMarkerMode = true; if(customMarkerControlsDiv) customMarkerControlsDiv.style.display = 'flex'; if(customMarkerInstructions) customMarkerInstructions.textContent = "Select shape & color, then CLICK ON MAP to place."; if(parseScanButton) parseScanButton.disabled = true; if(trilaterateSelectedButton) trilaterateSelectedButton.disabled = true; if(parseProbeDataButton) parseProbeDataButton.disabled = true; });
    if (cancelCustomMarkerButton) cancelCustomMarkerButton.addEventListener('click', () => { isAddingCustomMarkerMode = false; if(customMarkerControlsDiv) customMarkerControlsDiv.style.display = 'none'; if(customMarkerInstructions) customMarkerInstructions.textContent = "Select shape & color, then CLICK ON MAP to place."; if(parseScanButton) parseScanButton.disabled = false; if(trilaterateSelectedButton && selectedReferencePoints && selectedReferencePoints.length === 3) trilaterateSelectedButton.disabled = false; else if (trilaterateSelectedButton) trilaterateSelectedButton.disabled = true; if(parseProbeDataButton) parseProbeDataButton.disabled = false; });
    console.log("Event listeners attached.");

    // --- SECTION 4: Initial Render Call ---
    const defaultSystemName = "J121116"; 
    if (typeof fetchAndRenderSystem === 'function') {
        console.log(`Initial load for system: ${defaultSystemName}`);
        fetchAndRenderSystem(defaultSystemName);
    } else { console.error("fetchAndRenderSystem function is not defined!"); }
    console.log("Script End (after DOMContentLoaded)."); 

}); // End of DOMContentLoaded listener
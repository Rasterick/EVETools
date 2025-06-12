// SolarSystem.js
document.addEventListener("DOMContentLoaded", () => { // <<<< SINGLE TOP-LEVEL DOMContentLoaded LISTENER
  
  // --- SECTION 1: Data, Constants, and Global Variables ---
  let currentSystemCelestials = [];
  let currentSystemScaleFactor = 1; // Initialize properly, will be set by renderSystemSVG

  const SVG_NS = "http://www.w3.org/2000/svg";
  /* ---- D-Scan constants -- */
  const baseWikiUrl = "https://wiki.eveuniversity.org/";


  // Constants for D-Scan and rendering

  const AU_KM = 149597870.7;
  const CEL_RADIUS_FACTOR = 0.05 * 0.25;
  const ORBIT_WIDTH_FACTOR = 0.0015;

  // DOM Element References
  // Add to your DOM element const declarations at the top
  const toggleDScanRangeRingsButton = document.getElementById('toggleDScanRangeRingsButton');

  const svgElement = document.getElementById("solarSystemSVG");
  const infoBox = document.getElementById("infoBox");
  const scanDataInput = document.getElementById("scanDataInput");
  const parseScanButton = document.getElementById("parseScanButton");
  const trilaterateSelectedButton = document.getElementById("trilaterateSelectedButton");
  const parseProbeDataButton = document.getElementById("parseProbeDataButton");
  const toggleSignatureZonesButton = document.getElementById("toggleSignatureZonesButton");
  const clearScanDataButton = document.getElementById("clearScanDataButton");
  const clearMarkersButton = document.getElementById("clearMarkersButton");
  const plottedMarkersTableBody = document.getElementById("plottedMarkersTableBody");
  const probeScanTableBody = document.getElementById("probeScanTableBody");
  const selectableCelestialsContainer = document.getElementById("selectableCelestialsContainer");
  const selectableCelestialsList = document.getElementById("selectableCelestialsList");
  const selectionCountSpan = document.getElementById("selectionCount");
  
  const prepareCustomMarkerButton = document.getElementById("prepareCustomMarkerButton");
  const customMarkerControlsDiv = document.getElementById("customMarkerControls");
  const markerShapeSelect = document.getElementById("markerShape");
  const markerColorSelect = document.getElementById("markerColor");
  const cancelCustomMarkerButton = document.getElementById("cancelCustomMarkerButton");
  const customMarkerInstructions = document.getElementById("customMarkerInstructions");
  
  const systemIdInput = document.getElementById("systemIdInput");
  const loadSystemButton = document.getElementById("loadSystemButton");

  // Modal UI Elements
  const selectRefsModal = document.getElementById('selectRefsModal'); // Assuming this ID is in your HTML for the modal
  const modalTitleCountSpan = document.getElementById('modalSelectionCount'); 
  const modalSelectableCelestialsList = document.getElementById('modalSelectableCelestialsList');
  const modalTrilaterateButton = document.getElementById('modalTrilaterateButton');
  const modalCancelButton = document.getElementById('modalCancelButton');

  // Header and System Info Box Spans
  const hdrSysClassEl = document.getElementById('hdrSysClass');
  const hdrSysEffectEl = document.getElementById('hdrSysEffect');
  const hdrSysStaticsEl = document.getElementById('hdrSysStatics');
  const sysClassEl = document.getElementById('sysClass');
  const sysEffectEl = document.getElementById('sysEffect');
  const sysStatic1El = document.getElementById('sysStatic1');
  const sysStatic2El = document.getElementById('sysStatic2');

  /* --- D-Scan ---*/
  // Add to your DOM Element References (SECTION 1)
const curseCountInput = document.getElementById('curseCountInput');
const rookCountInput = document.getElementById('rookCountInput');
const lachesisCountInput = document.getElementById('lachesisCountInput');
const huginnCountInput = document.getElementById('huginnCountInput');


  let baseOrbitsGroup, signatureZonesGroup, celestialBodiesGroup, scanMarkersGroup, dscanRangeCirclesGroup;
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

  console.log("Script Start: DOM loaded, constants and DOM elements defined.");
  if (!probeScanTableBody) console.error("CRITICAL ERROR: probeScanTableBody element not found on script start!");
  if (!plottedMarkersTableBody) console.error("CRITICAL ERROR: plottedMarkersTableBody element not found on script start!");
  if (!selectRefsModal) console.warn("Modal 'selectRefsModal' not found. D-Scan selection UI will not work.");
  
  /* ------- D-Scan Parser Functionality --- */
let shipDatabase = []; 

async function loadShipData() {
    console.log("Attempting to load shipData.json...");
    try {
        const response = await fetch('data/shipData.json'); // Verify this path is correct relative to your HTML file
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} while fetching shipData.json`);
        }
        const jsonData = await response.json();

        // Process URLs and other data as you had in your function
        const baseWikiUrl = "https://wiki.eveuniversity.org/"; // Define if not global
        jsonData.forEach((ship) => {
            let url = ship.URL ? String(ship.URL).trim() : "";
            if (!url || url.startsWith("<img") || (url.includes("_Shuttle") && !url.startsWith(baseWikiUrl))) {
                const shipNameForUrl = (ship.Ship || "Unknown_Ship").replace(/ /g, "_");
                ship.URL = baseWikiUrl + encodeURIComponent(shipNameForUrl);
            } else {
                ship.URL = url;
            }
            ship["Faction Icon"] = ship["Faction Icon"] || "";
            ship.Tank = ship.Tank || "";
        });

        shipDatabase = jsonData; // <<< ASSIGN TO THE GLOBAL VARIABLE
        // Sort by ship name length (descending) for more specific matching first in determineShipIdentity
        shipDatabase.sort((a, b) => {
            const lenA = a.Ship ? a.Ship.length : 0;
            const lenB = b.Ship ? b.Ship.length : 0;
            return lenB - lenA; 
        });
        
        console.log("Ship database loaded successfully:", shipDatabase.length, "entries.");
        // Example: console.log("First few ships:", shipDatabase.slice(0,3));
    } catch (e) {
        console.error("Error loading or parsing shipData.json:", e);
        alert("Error loading ship data. Threat analysis may not work correctly. Check console. Ensure 'data/shipData.json' exists and is valid.");
        // No need for systemInfoContainerElem.innerHTML here, as the main app will still try to load
    }
}



 
  /* Function to use the data generated by the PHP Script db_test.php */

 async function fetchAndRenderSystem(systemIdentifier) {
    console.log(`Fetching data for system: ${systemIdentifier}`);
    if (svgElement) { svgElement.innerHTML = ''; }
    if (plottedMarkersTableBody) plottedMarkersTableBody.innerHTML = "";
    if (probeScanTableBody) probeScanTableBody.innerHTML = "";
    if (selectableCelestialsContainer && selectableCelestialsContainer.style) selectableCelestialsContainer.style.display = "none"; // Old UI
    if (selectRefsModal && selectRefsModal.style) selectRefsModal.style.display = "none"; // New Modal UI
    
    currentSystemCelestials = []; 
    scannerPosMarkerCounter = 0; customMarkerCounter = 0;
    plottedMarkerData = {}; parsedProbeSignatures = [];
    selectedReferencePoints = []; knownPointsFromCurrentScan = []; 
    if (typeof updateSelectionCountAndButton === 'function') updateSelectionCountAndButton();
    isLinkingProbeSignature = false; signatureToLink = null; isAddingCustomMarkerMode = false;
    if (customMarkerControlsDiv && customMarkerControlsDiv.style) customMarkerControlsDiv.style.display = 'none';
    if (parseScanButton) parseScanButton.disabled = false;
    if (trilaterateSelectedButton) trilaterateSelectedButton.disabled = true; 
    if (parseProbeDataButton) parseProbeDataButton.disabled = false;
    if (toggleSignatureZonesButton) toggleSignatureZonesButton.textContent = "Show Signature Zones";
    if (signatureZonesGroup && signatureZonesGroup.style) signatureZonesGroup.style.display = 'none'; else if(signatureZonesGroup) signatureZonesGroup.innerHTML = '';
    
    // Inside fetchAndRenderSystem(), in the initial reset section
// ...
if (dscanRangeCirclesGroup) {
    while (dscanRangeCirclesGroup.firstChild) { dscanRangeCirclesGroup.removeChild(dscanRangeCirclesGroup.firstChild); }
    dscanRangeCirclesGroup.style.display = 'none';
}
if (toggleDScanRangeRingsButton) toggleDScanRangeRingsButton.textContent = "Show D-Scan Rings";


    console.log("All previous system state and UI cleared/reset for new system load.");

    try {
        const response = await fetch('../db_test.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', },
            body: `systemID=${encodeURIComponent(systemIdentifier)}`
        });
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
        } else { 
            console.warn("No systemInfo received for system:", systemIdentifier);
            const appTitleH1 = document.getElementById('currentSystemTitleHeader');
            if (appTitleH1) appTitleH1.textContent = `System Information - ${systemIdentifier} (Info N/A)`;
            if(hdrSysClassEl) hdrSysClassEl.textContent = 'N/A'; if(hdrSysEffectEl) hdrSysEffectEl.textContent = 'N/A'; if(hdrSysStaticsEl) hdrSysStaticsEl.textContent = 'N/A';
            if(sysClassEl) sysClassEl.textContent = 'N/A'; if(sysEffectEl) sysEffectEl.textContent = 'N/A'; if(sysStatic1El) sysStatic1El.textContent = 'N/A'; if(sysStatic2El) sysStatic2El.textContent = 'N/A';
        }

        let celestialsToRender = [];
        if (data && data.celestials && data.celestials.length > 0) celestialsToRender = data.celestials;
        else if (data && Array.isArray(data) && data.length > 0 && !data.systemInfo) celestialsToRender = data;
        
        currentSystemCelestials = celestialsToRender;
        if (currentSystemCelestials.length > 0) { if (typeof renderSystemSVG === 'function') renderSystemSVG(currentSystemCelestials); }
        else { if (svgElement) svgElement.innerHTML = ''; console.error('No celestial data for ID:', systemIdentifier); alert(`No celestial data for ${systemIdentifier}.`); }
    } catch (error) { console.error('Error fetching/processing system data:', error); alert(`Error loading system: ${error.message}`); }
  }

  // ---- END

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

    console.log("renderSystemSVG: Called with data length:", celestialDataForSystem ? celestialDataForSystem.length : 'undefined');
    if (!svgElement) { console.error("renderSystemSVG: svgElement not found!"); return; }
    // svgElement.innerHTML = ''; // This is now done in fetchAndRenderSystem BEFORE this is called

    if (!celestialDataForSystem || celestialDataForSystem.length === 0) {
        console.error("renderSystemSVG called with no celestial data. Map cannot be drawn.");
        return;
    }

    if (!celestialDataForSystem || celestialDataForSystem.length === 0) {
      console.error("renderSystemSVG called with no celestial data.");
      return;
    }

    // transformRawDataToSystemFormat should now operate on celestialDataForSystem
    const systemObject = transformRawDataToSystemFormat(celestialDataForSystem);

    // calculateOrbitalProperties should also operate on the processed objects from the current system
    calculateOrbitalProperties(systemObject.cels);

    svgElement.innerHTML = '';

        // --- RECREATE ALL SVG GROUPS ---
    baseOrbitsGroup = document.createElementNS(SVG_NS, "g"); 
    baseOrbitsGroup.setAttribute("id", "baseOrbitsGroup");
    svgElement.appendChild(baseOrbitsGroup); // Layer 1 (Bottom)

    signatureZonesGroup = document.createElementNS(SVG_NS, "g"); 
    signatureZonesGroup.setAttribute("id", "signatureZonesGroup");
    signatureZonesGroup.style.display = 'none'; 
    svgElement.appendChild(signatureZonesGroup); // Layer 2

    // --- D-SCAN RANGE CIRCLES GROUP ---
    dscanRangeCirclesGroup = document.createElementNS(SVG_NS, "g"); 
    dscanRangeCirclesGroup.setAttribute("id", "dscanRangeCirclesGroup");
    svgElement.appendChild(dscanRangeCirclesGroup); // Layer 3 << DRAWN HERE

    celestialBodiesGroup = document.createElementNS(SVG_NS, "g"); 
    celestialBodiesGroup.setAttribute("id", "celestialBodiesGroup");
    svgElement.appendChild(celestialBodiesGroup); // Layer 4 (Planets, etc. on top of range circles)

    scanMarkersGroup = document.createElementNS(SVG_NS, "g"); 
    scanMarkersGroup.setAttribute("id", "scanMarkersGroup");
    svgElement.appendChild(scanMarkersGroup); // Layer 5 (S-Markers, Custom Markers on very top)

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
      `RENDERER: Final maxdist for scaling = ${maxdist.toExponential(5)} km (${(
        maxdist / AU_KM
      ).toFixed(2)} AU)`
    );
    currentSystemScaleFactor =
      (halfViewSize * (1 - CEL_RADIUS_FACTOR * 3.0)) / maxdist;
 
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
  function handleBodyMouseMoveSVG(event) {
    /* This function is not currently used due to fixed infobox */
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

   // This function now populates the MODAL for D-Scan ref selection
  // Inside SolarSystem.js
function displaySelectableCelestials() {
    if (!modalSelectableCelestialsList || !selectRefsModal || !modalTitleCountSpan) {
        console.error("displaySelectableCelestials: Modal UI elements missing.");
        return;
    }
    console.log("displaySelectableCelestials (MODAL): Clearing and resetting selections.");
    modalSelectableCelestialsList.innerHTML = ''; 
    selectedReferencePoints = []; // CRITICAL: Reset this global array
    updateSelectionCountAndButton(); // Update to (0/3) and disable button

    if (!knownPointsFromCurrentScan || knownPointsFromCurrentScan.length === 0) {
        modalSelectableCelestialsList.innerHTML = "<p style='color: #888;'>No known celestials with distances found in scan data.</p>";
        if (selectRefsModal) selectRefsModal.style.display = 'flex';
        return;
    }
    if (knownPointsFromCurrentScan.length < 3) {
        modalSelectableCelestialsList.innerHTML = `<p style='color: #ff8888;'>Need at least 3 known celestials for trilateration. Found ${knownPointsFromCurrentScan.length}.</p>`;
        // Still list them, but they won't be fully functional for selection
        knownPointsFromCurrentScan.forEach((point) => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('celestial-item'); // Keep class for consistent styling
            itemDiv.style.cursor = 'default';    // Indicate not selectable for trilateration
            itemDiv.style.opacity = '0.7';
            itemDiv.textContent = `${point.name} (${(point.d / AU_KM).toFixed(2)} AU)`;
            modalSelectableCelestialsList.appendChild(itemDiv);
        });
        if (selectRefsModal) selectRefsModal.style.display = 'flex';
        return;
    }
    
    console.log("displaySelectableCelestials (MODAL): Populating list with selectable items.");
    knownPointsFromCurrentScan.forEach((point) => { // Removed 'index' as dataset.pointIndex isn't crucial if 'point' is used
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('celestial-item');
        itemDiv.textContent = `${point.name} (${(point.d / AU_KM).toFixed(2)} AU)`;
        // itemDiv.dataset.pointName = point.name; // Store name for easier removal if needed

        itemDiv.addEventListener('click', function() { 
            console.log("MODAL Celestial item CLICKED:", this.textContent); 

            // 'point' is the actual object from knownPointsFromCurrentScan for this itemDiv
            const isCurrentlySelected = selectedReferencePoints.includes(point);

            if (isCurrentlySelected) {
                this.classList.remove('selected');
                selectedReferencePoints = selectedReferencePoints.filter(p => p !== point); 
                console.log(`Deselected ${point.name}. New selection count: ${selectedReferencePoints.length}`);
            } else {
                if (selectedReferencePoints.length < 3) {
                    this.classList.add('selected');
                    selectedReferencePoints.push(point); 
                    console.log(`Selected ${point.name}. New selection count: ${selectedReferencePoints.length}`);
                } else {
                    alert("You can only select up to 3 reference points.");
                }
            }
            // console.log("Selected points array:", selectedReferencePoints.map(p => p.name)); // For debugging
            updateSelectionCountAndButton();
        });
        modalSelectableCelestialsList.appendChild(itemDiv);
    });
    if (selectRefsModal) selectRefsModal.style.display = 'flex';
    console.log("displaySelectableCelestials (MODAL): List populated and modal shown.");
}

  // This function now updates the MODAL's counter and trilaterate button
function updateSelectionCountAndButton() {
    if (!modalTitleCountSpan || !modalTrilaterateButton) { 
        console.warn("updateSelectionCountAndButton: Modal UI elements for count/button not found. Cannot update.");
        return; 
    }

    const count = selectedReferencePoints.length;
    modalTitleCountSpan.textContent = `(${count}/3)`;
    // console.log("Updated modal selection count to:", modalTitleCountSpan.textContent); // Already logged if successful

    if (count === 3) {
        modalTrilaterateButton.disabled = false; // Enable the button
        // modalTrilaterateButton.style.display = 'inline-block'; // Ensure it's visible if previously hidden
        console.log("Modal trilaterate button ENABLED.");
    } else {
        modalTrilaterateButton.disabled = true; // Disable the button
        // modalTrilaterateButton.style.display = 'none'; // Or hide it
        console.log("Modal trilaterate button DISABLED. Count:", count);
    }
}

// Inside SolarSystem.js

function handleParseScanAndPrepareSelection() {
    console.log("handleParseScanAndPrepareSelection called");

    // 1. Ensure scanDataInput element exists
    if (!scanDataInput) { 
        console.error("handleParseScanAndPrepareSelection: Main scanDataInput element not found!");
        alert("Error: Scan input area element is missing. Please refresh the page.");
        return;
    }

    // 2. Get the scanText value
    const scanText = scanDataInput.value; 

    // 3. Clear previous D-Scan range circles first.
    //    This is fine to do even if scanText is empty later, ensures a clean slate.
   if (dscanRangeCirclesGroup) {
        while (dscanRangeCirclesGroup.firstChild) {
            dscanRangeCirclesGroup.removeChild(dscanRangeCirclesGroup.firstChild);
        }
        dscanRangeCirclesGroup.style.display = 'none'; // Ensure hidden
    }
    if (toggleDScanRangeRingsButton) { // Reset toggle button text
         toggleDScanRangeRingsButton.textContent = "Show D-Scan Rings";
    }
    

    // 4. Handle empty scan input
    if (!scanText.trim()) { 
        alert("Paste D-Scan data into the text area.");
        if (selectRefsModal && selectRefsModal.style.display !== 'none') { // If using modal
            selectRefsModal.style.display = 'none';
        } else if (selectableCelestialsContainer && selectableCelestialsContainer.style) { // If using old in-page one
            selectableCelestialsContainer.style.display = 'none';
        }
        if (trilaterateSelectedButton) trilaterateSelectedButton.style.display = 'none';
        
        knownPointsFromCurrentScan = []; 
        selectedReferencePoints = [];    
        if(typeof updateSelectionCountAndButton === 'function') {
            updateSelectionCountAndButton(); 
        }
        return; 
    }

    // 5. Parse the scan text for known celestials
    if (typeof parseScanLinesForTrilateration === 'function') {
        knownPointsFromCurrentScan = parseScanLinesForTrilateration(scanText); // scanText is now defined
        console.log("Parsed known points from D-scan for trilateration list:", knownPointsFromCurrentScan);
    } else {
        console.error("handleParseScanAndPrepareSelection: parseScanLinesForTrilateration function is not defined!");
        return; 
    }

    // 6. Draw all D-Scan range circles on the main map
    if (typeof drawAllScannedRangeCircles === 'function') {
        drawAllScannedRangeCircles(knownPointsFromCurrentScan); 
    } else {
        console.warn("handleParseScanAndPrepareSelection: drawAllScannedRangeCircles function is not defined (this feature might be off).");
    }

    // 7. Call displaySelectableCelestials to populate and show the MODAL (or old UI)
    if (typeof displaySelectableCelestials === 'function') {
        displaySelectableCelestials(); 
    } else {
        console.error("handleParseScanAndPrepareSelection: displaySelectableCelestials function is not defined!");
    }
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

      label.textContent = initialLabelText; 

      label.setAttribute("x", labelOffsetX.toString());
      label.setAttribute("y", labelOffsetY.toString());
      label.classList.add("scanner-marker-label");
      label.style.cursor = "pointer";

      

      label.addEventListener('click', (e) => handleMarkerLabelClick(e, markerGroupId, initialLabelText));

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
    // svgElement.innerHTML = ''; // This would wipe out the base map too if called standalone.
    // Better to clear specific groups.
    if (scanMarkersGroup) { // For S-markers and Custom Markers
        while (scanMarkersGroup.firstChild) { scanMarkersGroup.removeChild(scanMarkersGroup.firstChild); }
    }
    
if (dscanRangeCirclesGroup) { // For D-Scan range circles
        while (dscanRangeCirclesGroup.firstChild) { dscanRangeCirclesGroup.removeChild(dscanRangeCirclesGroup.firstChild); }
    }

    // Note: signatureZonesGroup is handled by its own toggle function.

    if (plottedMarkersTableBody) plottedMarkersTableBody.innerHTML = '';

    /*  --- Clear D-Scan Tables -- */
    // --- NEW: Clear D-Scan Threat Analysis Tables & Info ---
    const classSummaryTableBody = document.getElementById('classSummaryTableBody');
    const shipSummaryTableBody = document.getElementById('shipSummaryTableBody');
    const unlistedEntriesTableBody = document.getElementById('unlistedEntriesTableBody');
    const malformedLinesInfoThreat = document.getElementById('malformedLinesInfoThreat');
    const dscanTimeLabel = document.getElementById('dscanTimeLabel'); // For the time in threat panel

    if (classSummaryTableBody) classSummaryTableBody.innerHTML = '';
    if (shipSummaryTableBody) shipSummaryTableBody.innerHTML = '';
    if (unlistedEntriesTableBody) unlistedEntriesTableBody.innerHTML = '';
    if (malformedLinesInfoThreat) malformedLinesInfoThreat.innerHTML = '<p>No D-Scan data analysed yet.</p>'; // Reset message
    if (dscanTimeLabel) dscanTimeLabel.textContent = 'N/A'; // Reset time

    const dScanAnalysisTitleEl = document.getElementById('dScanAnalysisTitle');
    if (dScanAnalysisTitleEl) dScanAnalysisTitleEl.textContent = 'D-Scan Threat Analysis'; // Reset to default
    if (dscanTimeLabel) dscanTimeLabel.textContent = 'N/A'; 
    
    // --- END NEW ---

    /* -- End --- */

    if (probeScanTableBody) probeScanTableBody.innerHTML = ''; 
    
    scannerPosMarkerCounter = 0; customMarkerCounter = 0;
    plottedMarkerData = {}; parsedProbeSignatures = [];
    
    if (selectableCelestialsContainer) selectableCelestialsContainer.style.display = 'none';
    if (trilaterateSelectedButton) trilaterateSelectedButton.style.display = 'none';
    selectedReferencePoints = []; knownPointsFromCurrentScan = [];
    
    if (selectionCountSpan && typeof updateSelectionCountAndButton === 'function') updateSelectionCountAndButton();
    isLinkingProbeSignature = false; signatureToLink = null; isAddingCustomMarkerMode = false;
    if (customMarkerControlsDiv) customMarkerControlsDiv.style.display = 'none';
    
    // Reset button states
    if (parseScanButton) parseScanButton.disabled = false;
    if (trilaterateSelectedButton) trilaterateSelectedButton.disabled = true;
    if (parseProbeDataButton) parseProbeDataButton.disabled = false;

    if (selectRefsModal) selectRefsModal.style.display = 'none'; // Hide modal
    
    console.log("All interactive markers and related UI cleared.");
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
    
    label.addEventListener('click', (e) => handleMarkerLabelClick(e, id, labelText));

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

// --- NEW Reusable Function for Label Interaction ---
function handleMarkerLabelClick(event, markerGroupIdFromEvent, initialDefaultLabel) {
    
     event.stopPropagation(); // Good to keep this to prevent other clicks if needed

    console.log("--- handleMarkerLabelClick ---"); // Log 1
   
    const mapMarkerLabelElement = event.currentTarget; // The <text> element that was clicked
    const currentMapLabelText = mapMarkerLabelElement.textContent;

    console.log("  Marker Label Clicked:", currentMapLabelText); // Log 2
    console.log("  Received markerGroupIdFromEvent:", markerGroupIdFromEvent); // Log 3
    console.log("  Received initialDefaultLabel:", initialDefaultLabel); // Log 4
    console.log("  Current isLinkingProbeSignature state:", isLinkingProbeSignature); // Log 5
    if (isLinkingProbeSignature) {
        console.log("  SignatureToLink object:", signatureToLink); // Log 6
    }

    // Ensure markerGroupIdFromEvent is valid
    if (!markerGroupIdFromEvent || !markerGroupIdFromEvent.startsWith) { // Check if it's a string and starts with
        console.error("  handleMarkerLabelClick: markerGroupIdFromEvent is invalid or missing:", markerGroupIdFromEvent);
        // Fallback attempt to find it by traversing up from the label (event.currentTarget)
        let parentGroup = mapMarkerLabelElement.parentNode;
        while (parentGroup && !(parentGroup.id && (parentGroup.id.startsWith('scannerMarkerGroup_') || parentGroup.id.startsWith('customMarker_'))) ) {
            parentGroup = parentGroup.parentNode;
        }
        markerGroupIdFromEvent = parentGroup ? parentGroup.id : null;
        console.log("  Fallback markerGroupIdFromEvent from parent traversal:", markerGroupIdFromEvent); // Log 7
        if (!markerGroupIdFromEvent) {
             console.error("  CRITICAL: Could not determine marker group ID for label click even after traversal.");
             return;
        }
    }
    
    const markerData = plottedMarkerData[markerGroupIdFromEvent];
    if (!markerData) {
        console.error("  No data found in plottedMarkerData for markerId:", markerGroupIdFromEvent, "plottedMarkerData content:", plottedMarkerData); // Log 8
        return;
    }
    console.log("  Found markerData:", markerData); // Log 9

    if (isLinkingProbeSignature && signatureToLink) {
        console.log(`  Attempting to link signature ${signatureToLink.id} to map marker ${currentMapLabelText} (ID: ${markerGroupIdFromEvent})`); // Log 10
        
        // Unlink from any previous marker this signature was linked to
        const previouslyLinkedMarkerId = signatureToLink.mapMarkerId;
        if (previouslyLinkedMarkerId && previouslyLinkedMarkerId !== markerGroupIdFromEvent) {
            if (plottedMarkerData[previouslyLinkedMarkerId]) {
                plottedMarkerData[previouslyLinkedMarkerId].linkedSignatureId = null;
                // Decide if notes should be cleared upon unlinking
                // plottedMarkerData[previouslyLinkedMarkerId].notes = plottedMarkerData[previouslyLinkedMarkerId].notes.replace(`${signatureToLink.id} (...)`, '').trim();
                updateMarkerInTable(previouslyLinkedMarkerId, { 
                    notes: plottedMarkerData[previouslyLinkedMarkerId].notes, 
                    linkedSignatureId: null // This assumes you have a column for this in S-marker table
                });
            }
        }
        // Unlink any signature previously linked to THIS map marker, IF it's a different signature
        if (markerData.linkedSignatureId && markerData.linkedSignatureId !== signatureToLink.id) {
            const oldSigToUnlink = parsedProbeSignatures.find(s => s.id === markerData.linkedSignatureId);
            if (oldSigToUnlink) {
                oldSigToUnlink.linkedMapMarkerLabel = null;
                oldSigToUnlink.mapMarkerId = null;
            }
        }

        signatureToLink.linkedMapMarkerLabel = markerData.label; // Use the TRUE label from plottedMarkerData
        signatureToLink.mapMarkerId = markerGroupIdFromEvent;
        
        markerData.linkedSignatureId = signatureToLink.id;
        // Auto-fill notes if notes are empty or only contain default shape/color info for custom markers
        const defaultCustomNotesPattern = /^Shape: \w+, Color: \w+$/;
        if (!markerData.notes || (markerData.isCustom && defaultCustomNotesPattern.test(markerData.notes))) { 
            markerData.notes = `${signatureToLink.id} (${signatureToLink.specificName || signatureToLink.name})`;
        } else if (!markerData.notes.includes(signatureToLink.id)) { // Append if not already there
            markerData.notes += (markerData.notes ? "; " : "") + `${signatureToLink.id} (${signatureToLink.specificName || signatureToLink.name})`;
        }
        
        if(typeof displayParsedProbeSignatures === 'function') displayParsedProbeSignatures(); 
        updateMarkerInTable(markerGroupIdFromEvent, { notes: markerData.notes, linkedSignatureId: signatureToLink.id });
        alert(`Signature ${signatureToLink.id} linked to map marker ${markerData.label}.`);
        
        isLinkingProbeSignature = false; signatureToLink = null;
        if(parseScanButton) parseScanButton.disabled = false;
        if(trilaterateSelectedButton && selectedReferencePoints) trilaterateSelectedButton.disabled = (selectedReferencePoints.length !== 3); else if(trilaterateSelectedButton) trilaterateSelectedButton.disabled = true;
        if(parseProbeDataButton) parseProbeDataButton.disabled = false;
        console.log("  Linking complete. Exited linking mode."); // Log 11

    } else { // Normal label editing
        console.log("  Proceeding to label edit for:", currentMapLabelText); // Log 12
        let promptDefault = currentMapLabelText;
        if (currentMapLabelText.match(/^S\d+$/) || (markerData.isCustom && currentMapLabelText === initialDefaultLabel) ) {
            promptDefault = "";
        }

        const newLabelText = prompt(`Enter new label for marker (was "${currentMapLabelText}"):`, promptDefault);
        if (newLabelText !== null) {
            const trimmedNewLabel = newLabelText.trim();
            if (trimmedNewLabel !== "") {
                mapMarkerLabelElement.textContent = trimmedNewLabel;
                markerData.label = trimmedNewLabel; // Update data store
                updateMarkerInTable(markerGroupIdFromEvent, { label: trimmedNewLabel });
                
                const linkedSig = parsedProbeSignatures.find(sig => sig.mapMarkerId === markerGroupIdFromEvent);
                if (linkedSig) { 
                    linkedSig.linkedMapMarkerLabel = trimmedNewLabel; 
                    if(typeof displayParsedProbeSignatures === 'function') displayParsedProbeSignatures(); 
                }
                console.log(`  Label for ${markerGroupIdFromEvent} updated to: ${trimmedNewLabel}`); // Log 13
            } else { 
                if (!currentMapLabelText.match(/^S\d+$/) && !(markerData.isCustom && currentMapLabelText === initialDefaultLabel)) { 
                    mapMarkerLabelElement.textContent = initialDefaultLabel; 
                    markerData.label = initialDefaultLabel; // Revert in data store
                    updateMarkerInTable(markerGroupIdFromEvent, { label: initialDefaultLabel });
                    const linkedSig = parsedProbeSignatures.find(sig => sig.mapMarkerId === markerGroupIdFromEvent);
                    if (linkedSig) { linkedSig.linkedMapMarkerLabel = initialDefaultLabel; if(typeof displayParsedProbeSignatures === 'function') displayParsedProbeSignatures(); }
                    alert("Label cannot be empty. Reverted to default.");
                    console.log(`  Label for ${markerGroupIdFromEvent} reverted to: ${initialDefaultLabel}`); // Log 14
                }
            }
        } else {
            console.log("  Label edit prompt cancelled by user."); // Log 15
        }
    }
    console.log("--- handleMarkerLabelClick END ---"); // Log 16
}


// -- Function to draw range rings on celestials -----
// Place this in SECTION 2: ALL FUNCTION DEFINITIONS

function drawAllScannedRangeCircles(scannedPoints) {
    if (!dscanRangeCirclesGroup) {
        console.warn("drawAllScannedRangeCircles: dscanRangeCirclesGroup not ready.");
        // Attempt to create it if it was missed, though renderSystemSVG should handle it.
        dscanRangeCirclesGroup = document.createElementNS(SVG_NS, "g");
        dscanRangeCirclesGroup.setAttribute("id", "dscanRangeCirclesGroup");
        if (svgElement && celestialBodiesGroup) {
            svgElement.insertBefore(dscanRangeCirclesGroup, celestialBodiesGroup);
        } else if (svgElement) {
            svgElement.appendChild(dscanRangeCirclesGroup);
        } else { return; } // Cannot proceed
    }
    
    while (dscanRangeCirclesGroup.firstChild) { // Clear previous
        dscanRangeCirclesGroup.removeChild(dscanRangeCirclesGroup.firstChild);
    }

    if (!scannedPoints || scannedPoints.length === 0) return;
    if (typeof currentSystemScaleFactor !== 'number' || currentSystemScaleFactor === 0 || isNaN(currentSystemScaleFactor)) {
        console.error("drawAllScannedRangeCircles: Invalid currentSystemScaleFactor."); return;
    }

    let circlesDrawn = 0;
    scannedPoints.forEach(point => {
        if (isNaN(point.x) || isNaN(point.y) || isNaN(point.d) || point.d <= 0) return;

        // Center of the circle is the celestial's known map position from rawSystemData/currentSystemCelestials
        // point.x is celestial.X (km), point.y is celestial.Z (km)
        const centerX_svg = point.x * currentSystemScaleFactor;
        const centerY_svg = point.y * currentSystemScaleFactor; 
        
        // Radius of the circle is the SCANNED DISTANCE 'd' (km) to that celestial
        const radius_svg = point.d * currentSystemScaleFactor; 

        if (radius_svg <= 0) return;

        const circle = document.createElementNS(SVG_NS, "circle");
        circle.setAttribute("cx", centerX_svg.toString());
        circle.setAttribute("cy", centerY_svg.toString());
        circle.setAttribute("r", radius_svg.toString());
        // Styling is applied via CSS selector: #dscanRangeCirclesGroup circle
        
        circle.dataset.celestialName = point.name; // For potential highlighting
        dscanRangeCirclesGroup.appendChild(circle);
        circlesDrawn++;
    });
    console.log(`Drew ${circlesDrawn} D-Scan range circles into #dscanRangeCirclesGroup.`);
}
// --- Display Selectable Celestials in MODAL --- //

function displaySelectableCelestials() {
    if (!modalSelectableCelestialsList || !selectRefsModal || !modalTitleCountSpan) {
        console.error("displaySelectableCelestials: Modal UI elements missing."); return;
    }
    // console.log("displaySelectableCelestials (MODAL): Clearing and resetting selections."); // Already confirmed
    modalSelectableCelestialsList.innerHTML = ''; 
    selectedReferencePoints = [];          
    updateSelectionCountAndButton(); 

    if (!knownPointsFromCurrentScan || knownPointsFromCurrentScan.length === 0) { /* ... empty message ... */ return; }
    if (knownPointsFromCurrentScan.length < 3) { /* ... need more points message + list non-selectable items ... */ return; }
    
    // console.log("displaySelectableCelestials (MODAL): Populating list with selectable items."); // Already confirmed
    knownPointsFromCurrentScan.forEach((point) => { 
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('celestial-item');
        itemDiv.textContent = `${point.name} (${(point.d / AU_KM).toFixed(2)} AU)`;
        
        itemDiv.addEventListener('click', function() { 
            console.log("--- itemDiv Click Listener START ---"); // Log A
            console.log("Clicked item text:", this.textContent);
            console.log("Associated point object:", point); // 'point' is from the forEach closure

            const isCurrentlySelected = selectedReferencePoints.includes(point);
            console.log("Is currently selected:", isCurrentlySelected); // Log B

            if (isCurrentlySelected) {
                this.classList.remove('selected');
                console.log("Removed .selected class from:", this.textContent); // Log C
                selectedReferencePoints = selectedReferencePoints.filter(p => p !== point); 
                console.log(`Deselected ${point.name}. Current selectedReferencePoints:`, selectedReferencePoints.map(p=>p.name)); // Log D
            } else {
                console.log("Not currently selected. Selected points length:", selectedReferencePoints.length); // Log E
                if (selectedReferencePoints.length < 3) {
                    this.classList.add('selected');
                    console.log("Added .selected class to:", this.textContent); // Log F
                    selectedReferencePoints.push(point); 
                    console.log(`Selected ${point.name}. Current selectedReferencePoints:`, selectedReferencePoints.map(p=>p.name)); // Log G
                } else {
                    alert("You can only select up to 3 reference points.");
                    console.log("Attempted to select more than 3; limit reached."); // Log H
                }
            }
            console.log("Calling updateSelectionCountAndButton from itemDiv click."); // Log I
            updateSelectionCountAndButton();
            // highlightSelectedReferenceCircles(); // Still keep commented
            console.log("--- itemDiv Click Listener END ---"); // Log J
        });
        modalSelectableCelestialsList.appendChild(itemDiv);
    });
    if (selectRefsModal) selectRefsModal.style.display = 'flex';
    // console.log("displaySelectableCelestials (MODAL): List populated and modal shown."); // Already confirmed
}

//--Now uodates the modal's title count span

function updateSelectionCountAndButton() {
    console.log("--- updateSelectionCountAndButton START ---"); // Log K
    if (!modalTitleCountSpan || !modalTrilaterateButton) { 
        console.warn("updateSelectionCountAndButton: Modal count span or trilaterate button not found. Cannot update.");
        console.log("modalTitleCountSpan:", modalTitleCountSpan);
        console.log("modalTrilaterateButton:", modalTrilaterateButton);
        return; 
    }

    const count = selectedReferencePoints.length;
    console.log("  Current selectedReferencePoints count:", count); // Log L
    
    modalTitleCountSpan.textContent = `(${count}/3)`;
    console.log("  Updated modal selection count display to:", modalTitleCountSpan.textContent); // Log M

    if (count === 3) {
        modalTrilaterateButton.disabled = false; 
        console.log("  Modal trilaterate button ENABLED."); // Log N
    } else {
        modalTrilaterateButton.disabled = true; 
        console.log("  Modal trilaterate button DISABLED."); // Log O
    }
    console.log("--- updateSelectionCountAndButton END ---"); // Log P
}

function handleModalTrilaterate() {
        console.log("Modal 'Trilaterate with Selected' button clicked.");
        if (typeof handleTrilaterateSelected === 'function') {
            handleTrilaterateSelected(); // Call the existing main trilateration function
        } else {
            console.error("handleTrilaterateSelected function is not defined!");
        }
        // Hide the modal after attempting trilateration
        if (selectRefsModal) {
            selectRefsModal.style.display = 'none';
        }
    }

function handleModalCancel() {
    console.log("Modal 'Cancel Selection' button clicked.");
    if (selectRefsModal) selectRefsModal.style.display = 'none';
    selectedReferencePoints = []; 
    if (typeof dscanRangeCirclesGroup !== 'undefined' && dscanRangeCirclesGroup) {
        dscanRangeCirclesGroup.querySelectorAll("circle.reference-selected").forEach(circ => circ.classList.remove("reference-selected"));
    }
    if (typeof updateSelectionCountAndButton === 'function') updateSelectionCountAndButton(); 
  }

function toggleDScanRangeRings() {
    console.log("toggleDScanRangeRings Called.");
    if (!dscanRangeCirclesGroup) {
        console.error("D-Scan range circles group not found.");
        // Attempt to create it if it wasn't made during initial render
        dscanRangeCirclesGroup = document.createElementNS(SVG_NS, "g");
        dscanRangeCirclesGroup.setAttribute("id", "dscanRangeCirclesGroup");
        if (svgElement && celestialBodiesGroup) { // Try to insert before celestial bodies
            svgElement.insertBefore(dscanRangeCirclesGroup, celestialBodiesGroup);
        } else if (svgElement) { svgElement.appendChild(dscanRangeCirclesGroup); }
        else { return; } // Cannot proceed
    }

    if (!knownPointsFromCurrentScan || knownPointsFromCurrentScan.length === 0) {
        alert("No D-Scan data parsed yet to show range rings. Please parse a D-Scan first.");
        // Ensure group is hidden if no data
        dscanRangeCirclesGroup.style.display = 'none';
        if(toggleDScanRangeRingsButton) toggleDScanRangeRingsButton.textContent = "Show D-Scan Rings";
        return;
    }

    if (dscanRangeCirclesGroup.style.display === 'none') {
        // Circles are hidden or not yet drawn for current scan data. Draw/Re-draw them.
        drawAllScannedRangeCircles(knownPointsFromCurrentScan); // This function clears then draws
        dscanRangeCirclesGroup.style.display = ''; // Show the group
        if(toggleDScanRangeRingsButton) toggleDScanRangeRingsButton.textContent = "Hide D-Scan Rings";
    } else {
        // Circles are visible, so hide them
        dscanRangeCirclesGroup.style.display = 'none';
        if(toggleDScanRangeRingsButton) toggleDScanRangeRingsButton.textContent = "Show D-Scan Rings";
    }
}

/* --- D-Scan Analysis Section ----*/
// SolarSystem.js - SECTION 2

function determineShipIdentity(rawColumn3Text) {
    const trimmedOriginalInput = rawColumn3Text.trim();
    const lowerTrimmedOriginalInput = trimmedOriginalInput.toLowerCase();
    // const lowerRawColumn3Text = rawColumn3Text.toLowerCase(); // Not strictly needed if using lowerTrimmedOriginalInput

    if (!shipDatabase || shipDatabase.length === 0) { // Check the global shipDatabase
        // console.warn("determineShipIdentity: shipDatabase is empty or not loaded.");
        return { foundShip: null, effectiveName: trimmedOriginalInput };
    }

    // Exact match first (case-insensitive)
    let found = shipDatabase.find(dbShip => 
        dbShip.Ship && dbShip.Ship.toLowerCase() === lowerTrimmedOriginalInput
    );
    if (found) {
        return { foundShip: found, effectiveName: found.Ship };
    }

    // Then, partial match (since shipsData is sorted by length descending, longer names get checked first)
    // This helps avoid "Probe" matching "Sisters Core Scanner Probe" incorrectly if "Probe" comes first in an unsorted list.
    for (const dbShip of shipDatabase) { // Use the global shipDatabase
        if (dbShip.Ship && dbShip.Ship.trim() !== "" && lowerTrimmedOriginalInput.includes(dbShip.Ship.toLowerCase())) {
            // To make this more robust, ensure it's a whole word match or at the start/end
            // For now, this simple includes might be okay given the sorted list.
            return { foundShip: dbShip, effectiveName: dbShip.Ship };
        }
    }

    return { foundShip: null, effectiveName: trimmedOriginalInput };
}
/* --- EscapeHtml --- */
 // *** CORRECTED escapeHtml FUNCTION ***
 // 
 function escapeHtml(unsafe) {
   if (unsafe === null || typeof unsafe === "undefined") return "";
       return String(unsafe)
            .replace(/&/g, "&")
            .replace(/</g, "<")
            .replace(/>/g, ">")
            .replace(/"/g, '"')
            .replace(/'/g, "'");
       }



// SolarSystem.js - SECTION 2

function parseDScanLineForEntities(lineText) {
    const parts = lineText.split('\t');
    // Standard EVE D-Scan paste: ID, Name, Type, Distance
    // Sometimes Name and Type are swapped or Type is missing for ships.
    // Column 2 (parts[1]) is often the ship type OR the player name.
    // Column 3 (parts[2]) is often the player name if col 2 was ship type, OR ship type if col 2 was garbage.

    if (parts.length < 3) return null; // Need at least ID, Col2, Col3 (which might contain distance or type)

    const idStr = parts[0].trim();
    const col2 = parts[1].trim(); // Could be Type or Pilot
    const col3 = parts[2].trim(); // Could be Pilot or Type or Distance
    let distanceStr = parts.length > 3 ? parts[3].trim() : null; // Distance is often 4th
    
    // Heuristic to find which part is the ship/item name vs pilot name
    // EVE D-Scan usually has item name in column 3 if it's a structure/ship.
    // Column 2 might be NPC (e.g. "Serpentis Private") or Player Name.
    // If column 2 is a known ship type, then column 3 is likely a pilot.
    // If column 3 is a known ship type, then column 2 is likely a pilot/NPC prefix.

    let potentialShipName = col3;
    let potentialPilotName = col2;
    
    // Check if col2 looks like a distance (e.g. "1.0 AU", "100 km")
    // If so, then col3 might not be there or is something else, and item is in col2
    if (distanceStr === null) { // If distance was not in parts[3]
        if (parseDistanceToKm(col3) !== null && !isNaN(parseDistanceToKm(col3))) {
             distanceStr = col3;
             potentialShipName = col2; // Assume col2 is the item then
             potentialPilotName = ""; // No pilot name explicitly
        }
    }
    
    const distanceKm = parseDistanceToKm(distanceStr); // Use your existing helper
    if (isNaN(distanceKm)) return null; // If we can't get a distance, skip

    const identity = determineShipIdentity(potentialShipName);

    if (identity.foundShip) { // It's a known ship/object from shipDatabase
        return {
            rawLine: lineText,
            id: idStr, // D-scan ID, might not be useful
            isShip: true, // Or more generally, isRecognizedEntity
            itemName: identity.effectiveName, // The matched name from shipDatabase
            pilotName: (identity.effectiveName.toLowerCase() !== potentialPilotName.toLowerCase() && potentialPilotName !== "UNK" && potentialPilotName !== "-") ? potentialPilotName : null, // Crude pilot check
            shipDetails: identity.foundShip,
            distanceKm: distanceKm,
            distanceOriginalStr: distanceStr
        };
    } else if (potentialShipName && potentialShipName !== "-") { // Unrecognized, but not empty
         return {
            rawLine: lineText,
            id: idStr,
            isShip: false,
            itemName: potentialShipName, // The text that wasn't identified as a ship
            pilotName: (potentialPilotName !== potentialShipName && potentialPilotName !== "UNK" && potentialPilotName !== "-") ? potentialPilotName : null,
            shipDetails: null,
            distanceKm: distanceKm,
            distanceOriginalStr: distanceStr
        };
    }
    return null; // Line couldn't be meaningfully parsed
}

function assessThreat(shipDetails, pilotName) {
    // Placeholder - your logic from standalone tool will go here
    if (!shipDetails) return { category: "Unknown", score: 0, color: "#888888" };

    // Example basic logic (replace with your advanced logic)
    if (shipDetails.Class && shipDetails.Class.toLowerCase().includes("capital")) return { category: "Capital", score: 10, color: "red" };
    if (shipDetails.Faction && shipDetails.Faction.toLowerCase().includes("pirate")) return { category: "Pirate NPC", score: 5, color: "orange" };
    // ... more rules ...
    return { category: "Standard", score: 1, color: "#CCCCCC" };
}

function displayThreatClassSummary(classSummaryData) {
    console.log("displayThreatClassSummary: Called with data:", classSummaryData); // Log 1
    if (!window.classSummaryTableBody) { 
        console.error("displayThreatClassSummary: classSummaryTableBody element not found!"); 
        return; 
    }
    classSummaryTableBody.innerHTML = ''; // Clear previous

    if (Object.keys(classSummaryData).length === 0) {
        const row = classSummaryTableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 2; // Assuming 2 columns: Class, Count
        cell.textContent = "No ship classes identified.";
        cell.style.textAlign = "center";
        return;
    }

    Object.keys(classSummaryData).sort().forEach(className => {
        const row = classSummaryTableBody.insertRow();
        console.log("displayThreatClassSummary: Adding row for class:", className, "Count:", classSummaryData[className]); // Log 2
        row.insertCell().textContent = className;
        row.insertCell().textContent = classSummaryData[className];
    });
    console.log("displayThreatClassSummary: Finished populating class summary table."); // Log 3
}

function displayThreatShipSummary(shipSummaryData) {

    console.log("displayThreatShipSummary: Called with data (first 3 shown):", JSON.parse(JSON.stringify(shipSummaryData.slice(0,3)))); // Log 4
  
    if (!window.shipSummaryTableBody) { 
        console.error("displayThreatShipSummary: shipSummaryTableBody element not found!"); 
        return; 
    }
  
    shipSummaryTableBody.innerHTML = '';

    if (shipSummaryData.length === 0) {
        const row = shipSummaryTableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 8; // Adjust to number of columns in your ship summary table
        cell.textContent = "No specific ships identified or to summarize.";
        cell.style.textAlign = "center";
        return;
    }

    // Aggregate ship counts before displaying
    const aggregatedShips = {};
  
    shipSummaryData.forEach(ship => {
        const key = `${ship.ship}-${ship.pilotNotes || 'N/A'}`; // Aggregate by ship and pilot/notes
        if (!aggregatedShips[key]) {
            aggregatedShips[key] = {...ship, count: 0};
        }
        aggregatedShips[key].count++;
    });

    Object.values(aggregatedShips).forEach(ship => { // Iterate over aggregated ships
        const row = shipSummaryTableBody.insertRow();
        console.log("displayThreatShipSummary: Adding row for ship:", ship.ship, "Count:", ship.count); // Log 5
        
        // Apply threat color to row or specific cells
        if (ship.threatColor) {
            // Example: row.style.color = ship.threatColor; // Or apply to specific cells
        }

        row.insertCell().textContent = ship.count;
        const shipCell = row.insertCell();
        if (ship.shipDetails && ship.shipDetails.URL) {
            shipCell.innerHTML = `<a href="${escapeHtml(ship.shipDetails.URL)}" target="_blank">${escapeHtml(ship.ship)}</a>`;
        } else {
            shipCell.textContent = escapeHtml(ship.ship);
        }
        row.insertCell().textContent = escapeHtml(ship.shipClass);
        row.insertCell().textContent = escapeHtml(ship.faction);
        const sensorCell = row.insertCell();
        sensorCell.textContent = escapeHtml(ship.ecmSensor);
        // Apply sensor class from your dscanscript.js CSS if you bring it over
        // Example: if(ship.ecmSensor.toLowerCase().includes("radar")) sensorCell.classList.add("sensor-radar");
        row.insertCell().textContent = escapeHtml(ship.tank);
        row.insertCell().textContent = escapeHtml(ship.dps);
    });
  
    console.log("displayThreatShipSummary: Finished populating ship summary table."); // Log 6

  }


function displayUnlistedDScanEntries(unlistedEntriesData) {
    console.log("displayUnlistedDScanEntries: Called with data:", unlistedEntriesData); // Log 7
    if (!window.unlistedEntriesTableBody) { 
        console.error("displayUnlistedDScanEntries: unlistedEntriesTableBody element not found!"); 
        return; 
    }
    unlistedEntriesTableBody.innerHTML = '';

    if (Object.keys(unlistedEntriesData).length === 0) {
        const row = unlistedEntriesTableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 2; // Assuming 2 columns: Count, Item Name
        cell.textContent = "No unlisted entries found.";
        cell.style.textAlign = "center";
        return;
    }

    Object.keys(unlistedEntriesData).sort().forEach(itemName => {
        const row = unlistedEntriesTableBody.insertRow();
        console.log("displayUnlistedDScanEntries: Adding row for item:", itemName, "Count:", unlistedEntriesData[itemName]); // Log 8
        row.insertCell().textContent = unlistedEntriesData[itemName];
        row.insertCell().textContent = escapeHtml(itemName);
    });
    console.log("displayUnlistedDScanEntries: Finished populating unlisted entries table."); // Log 9
}

// Inside SolarSystem.js

function handleAnalyseDScanThreats() {
    console.log("--- handleAnalyseDScanThreats START ---"); 

    if (!scanDataInput) { /* ... error check ... */ return; }
    if (shipDatabase.length === 0) { /* ... error check ... */ return; }

    const scanText = scanDataInput.value;
    const reconShipsText = document.getElementById('reconShipsText') ? document.getElementById('reconShipsText').value : "";
    
    // Clear previous threat tables
    if (window.classSummaryTableBody) classSummaryTableBody.innerHTML = '';
    if (window.shipSummaryTableBody) shipSummaryTableBody.innerHTML = '';
    if (window.unlistedEntriesTableBody) unlistedEntriesTableBody.innerHTML = '';
    if (window.malformedLinesInfoThreat) malformedLinesInfoThreat.innerHTML = '';

    const dscanEntities = [];
    const unlistedEntries = {}; 
    let malformedCount = 0;

    const lines = scanText.split('\n');
    lines.forEach((line) => { // Process D-Scan lines
        if (line.trim() === "") return;
        const entity = parseDScanLineForEntities(line);
        if (entity) {
            dscanEntities.push(entity);
            if (!entity.shipDetails) { 
                unlistedEntries[entity.itemName] = (unlistedEntries[entity.itemName] || 0) + 1;
            }
        } else {
            malformedCount++;
        }
    });

    // --- NEW: Process Specific Recon Ship Counts ---
    const reconShipsToAdd = [
        { name: "Curse", count: parseInt(curseCountInput?.value) || 0 }, // Use optional chaining and default to 0
        { name: "Rook", count: parseInt(rookCountInput?.value) || 0 },
        { name: "Lachesis", count: parseInt(lachesisCountInput?.value) || 0 },
        { name: "Huginn", count: parseInt(huginnCountInput?.value) || 0 }
    ];

    reconShipsToAdd.forEach(reconShip => {
        if (reconShip.count > 0) {
            const identity = determineShipIdentity(reconShip.name); // Uses shipDatabase
            if (identity.foundShip) {
                for (let i = 0; i < reconShip.count; i++) {
                    dscanEntities.push({
                        rawLine: `OFF-SCAN RECON: ${reconShip.name}`, // Indicate source
                        id: `RECON_${reconShip.name}_${i+1}`, // Create a dummy ID
                        isShip: true, 
                        itemName: identity.effectiveName,
                        pilotName: "Recon Force", // Generic pilot for these
                        shipDetails: identity.foundShip,
                        distanceKm: 0, // No actual distance from D-Scan
                        distanceOriginalStr: "Off-Scan" 
                    });
                }
                console.log(`Added ${reconShip.count} x ${reconShip.name} from recon inputs.`);
            } else {
                // This recon ship name isn't in shipDatabase, add to unlisted
                unlistedEntries[reconShip.name] = (unlistedEntries[reconShip.name] || 0) + reconShip.count;
                console.warn(`Recon ship type "${reconShip.name}" not found in shipDatabase.`);
            }
        }
    });
    // --- END OF NEW RECON SHIP PROCESSING ---
    
    // --- AGGREGATE SHIP SUMMARY DATA ---
    const classSummary = {};
    const aggregatedShipData = {}; // Use an object for easier aggregation by a unique key

    dscanEntities.forEach(entity => {
        if (entity.shipDetails) { 
            const shipClass = entity.shipDetails.Class || "Unknown Class";
            classSummary[shipClass] = (classSummary[shipClass] || 0) + 1;
            
            // Create a unique key for aggregation, e.g., shipName-faction-pilot (if distinct pilots matter)
            // Or just shipName-faction if pilot names are not reliably parsed or not needed for aggregation.
            // For now, let's aggregate by effective ship name + specific pilot name (if present)
            // If pilotName is null or generic, they will group together.
            const pilotIdentifier = entity.pilotName || "N/A"; // Use "N/A" if no pilot, to group them
            const aggregationKey = `${entity.itemName}_${pilotIdentifier}`; 

            if (!aggregatedShipData[aggregationKey]) {
                const threat = assessThreat(entity.shipDetails, entity.pilotName);
                aggregatedShipData[aggregationKey] = {
                    count: 0,
                    ship: entity.itemName,
                    shipClass: shipClass,
                    faction: entity.shipDetails["Faction Icon"] || 'N/A',
                    ecmSensor: entity.shipDetails.Sensor || 'N/A', 
                    tank: entity.shipDetails.Tank || 'N/A',
                    dps: entity.shipDetails.DPS || 'N/A',
                    // Pilot/Notes: Use the parsed pilot name if available, otherwise from ship DB notes.
                    // The original D-Scan line's column 2 might also be relevant if not a ship type.
                    // pilotNotes: entity.pilotName || entity.shipDetails.Notes || (entity.rawLine.split('\t')[1] !== entity.itemName && entity.rawLine.split('\t')[1].trim() !== "-" ? entity.rawLine.split('\t')[1].trim() : ''),
                    threatCategory: threat.category, 
                    threatColor: threat.color,
                    shipDetails: entity.shipDetails // Keep for URL link
                };
            }
            aggregatedShipData[aggregationKey].count++;
        }
    });

    const finalShipSummaryForTable = Object.values(aggregatedShipData);
    // --- END OF AGGREGATION ---

    console.log("handleAnalyseDScanThreats: classSummary data:", classSummary);
    console.log("handleAnalyseDScanThreats: aggregatedShipData for table (first 5):", JSON.parse(JSON.stringify(finalShipSummaryForTable.slice(0,5))));
    console.log("handleAnalyseDScanThreats: unlistedEntries data:", unlistedEntries);

    // Call display functions
    if (typeof displayThreatClassSummary === 'function') displayThreatClassSummary(classSummary);
    if (typeof displayThreatShipSummary === 'function') displayThreatShipSummary(finalShipSummaryForTable); // Pass aggregated data
    if (typeof displayUnlistedDScanEntries === 'function') displayUnlistedDScanEntries(unlistedEntries);

     if (window.malformedLinesInfoThreat && malformedCount > 0) {
        malformedLinesInfoThreat.textContent = `Could not fully parse ${malformedCount} D-Scan lines.`;
    } else if (window.malformedLinesInfoThreat) {
        malformedLinesInfoThreat.textContent = malformedCount === 0 ? "All D-Scan lines parsed without structural errors." : "";
    }
    
    // --- NEW: Update D-Scan Analysis Title with Time ---
    const dScanAnalysisTitleEl = document.getElementById('dScanAnalysisTitle');
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const dateString = now.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }); // e.g., 12 Jun 2025

    if (dScanAnalysisTitleEl) {
        dScanAnalysisTitleEl.textContent = `D-Scan Threat Analysis - ${timeString} ${dateString}`;
    }
    // Also update the separate time label if you still have it within the panel
    const dscanTimeLabel = document.getElementById('dscanTimeLabel'); // If this element exists for just time
    if (dscanTimeLabel) dscanTimeLabel.textContent = `${timeString} ${dateString}`;
    // --- END NEW ---
    

    // ... (rest of the function: malformed lines info, dscan time label) ...
    console.log("--- handleAnalyseDScanThreats END ---");
}
/* --- End of D-Scan Analysis Section ----/


  /* --- End of Custom Marker Function --- */

    
  // --- SECTION 3: Event Listener Attachments ---

if(svgElement){

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

console.log("--- GLOBAL SVG CLICK LISTENER FIRED --- Target:", e.target); // Log A
console.log("Global SVG Click: isAddingCustomMarkerMode at this point is:", isAddingCustomMarkerMode); // Log B

  
    console.log(
      "SVG clicked. isAddingCustomMarkerMode:",
      isAddingCustomMarkerMode,
      "Target:",
      e.target
    ); // DEBUG

    if (isAddingCustomMarkerMode) {

      console.log("  Global SVG Click: Entering 'isAddingCustomMarkerMode' block."); // Log C


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
        console.log("  Global SVG Click: NOT in 'isAddingCustomMarkerMode'."); // Log D
      }
    }
    // Add other global SVG click logic here if needed

     if (modalTrilaterateButton && typeof handleModalTrilaterate === 'function') { // Check function exists
        modalTrilaterateButton.addEventListener('click', handleModalTrilaterate);
    } else {
        console.error("modalTrilaterateButton or its handler handleModalTrilaterate not found/defined.");
    }

    if (modalCancelButton && typeof handleModalCancel === 'function') { // Check function exists
        modalCancelButton.addEventListener('click', handleModalCancel);
    } else {
        console.error("modalCancelButton or its handler handleModalCancel not found/defined.");
    }
  });

}
 else { console.error("svgElement not found, global listeners not attached.");}
    
    console.log("Event listeners attached.");

// Lets create a event listener for Analyse Current D-Scan Button

// --- SECTION 3: Event Listener Attachments ---
    // ... (your existing listeners for loadSystemButton, parseScanButton, etc.) ...

    const analyseThreatButton = document.getElementById('analyseThreatButton');
    if (analyseThreatButton && typeof handleAnalyseDScanThreats === 'function') {
        analyseThreatButton.addEventListener('click', handleAnalyseDScanThreats);
    } else {
        if (!analyseThreatButton) console.error("analyseThreatButton element not found for event listener.");
        if (typeof handleAnalyseDScanThreats !== 'function') console.error("handleAnalyseDScanThreats function is not defined for event listener.");
    }


// -------- End of Event Listeners -----
  console.log("Attaching event listeners...");
  // System Load
   if (loadSystemButton) {
        loadSystemButton.addEventListener("click", () => {
            const systemIdentifier = systemIdInput ? systemIdInput.value.trim() : null;
            if (systemIdentifier && typeof fetchAndRenderSystem === 'function') {
                fetchAndRenderSystem(systemIdentifier);
            } else if (!systemIdentifier) {
                alert("Please enter a System Name or ID.");
            } else {
                console.error("fetchAndRenderSystem is not defined.");
            }
        });
    } else { console.error("loadSystemButton not found"); }

  // D-Scan Trilateration Flow
    if (parseScanButton && typeof handleParseScanAndPrepareSelection === 'function') {
        parseScanButton.addEventListener('click', handleParseScanAndPrepareSelection);
    } else { console.error("parseScanButton or its handler not found/defined"); }

    if (trilaterateSelectedButton && typeof handleTrilaterateSelected === 'function') {
        trilaterateSelectedButton.addEventListener('click', handleTrilaterateSelected);
    } else { console.error("trilaterateSelectedButton or its handler not found/defined"); }

        // Event Listener Attachments (add for new modal buttons)

    if (modalTrilaterateButton) modalTrilaterateButton.addEventListener('click', handleModalTrilaterate);
    if (modalCancelButton) modalCancelButton.addEventListener('click', handleModalCancel);

  // Probe Scan Flow
    if (parseProbeDataButton && typeof handleParseProbeData === 'function') {
        parseProbeDataButton.addEventListener('click', handleParseProbeData);
    } else { console.error("parseProbeDataButton or its handler not found/defined"); }
  
  // Other Controls
    if (toggleSignatureZonesButton && typeof toggleSignatureZones === 'function') {
        toggleSignatureZonesButton.addEventListener('click', toggleSignatureZones);
    } else { console.error("toggleSignatureZonesButton or its handler not found/defined"); }

    if (clearScanDataButton && typeof handleClearScanText === 'function') {
        clearScanDataButton.addEventListener('click', handleClearScanText);
    } else { console.error("clearScanDataButton or its handler not found/defined"); }

    if (clearMarkersButton && typeof handleClearMarkers === 'function') {
        clearMarkersButton.addEventListener('click', handleClearMarkers);
    } else { console.error("clearMarkersButton or its handler not found/defined"); }

    // Custom Marker Controls Event Listeners
    if (prepareCustomMarkerButton && customMarkerControlsDiv && typeof handleBodyMouseMoveSVG !== 'undefined') { // handleBodyMouseMoveSVG was removed, so this condition might change
        prepareCustomMarkerButton.addEventListener("click", () => {
            isAddingCustomMarkerMode = true;
            console.log("prepareCustomMarkerButton clicked: isAddingCustomMarkerMode set to true");
            customMarkerControlsDiv.style.display = "flex";
            if (customMarkerInstructions) customMarkerInstructions.textContent = "Select shape & color, then CLICK ON MAP to place. You'll be prompted for a label.";
            if (parseScanButton) parseScanButton.disabled = true;
            if (trilaterateSelectedButton) trilaterateSelectedButton.disabled = true;
            if (parseProbeDataButton) parseProbeDataButton.disabled = true;
        });
    } else { console.error("prepareCustomMarkerButton or customMarkerControlsDiv not found/defined for custom markers."); }

    if (cancelCustomMarkerButton && customMarkerControlsDiv) {
        cancelCustomMarkerButton.addEventListener("click", () => {
            isAddingCustomMarkerMode = false;
            console.log("cancelCustomMarkerButton clicked: isAddingCustomMarkerMode set to false");
            customMarkerControlsDiv.style.display = "none";
            if (customMarkerInstructions) customMarkerInstructions.textContent = "Select shape & color, then CLICK ON MAP to place.";
            if (parseScanButton) parseScanButton.disabled = false;
            if (trilaterateSelectedButton) trilaterateSelectedButton.disabled = !(selectedReferencePoints && selectedReferencePoints.length === 3);
            if (parseProbeDataButton) parseProbeDataButton.disabled = false;
        });
    } else { console.error("cancelCustomMarkerButton or customMarkerControlsDiv not found/defined for custom markers."); }

    // In SECTION 3: Event Listener Attachments
if (toggleDScanRangeRingsButton && typeof toggleDScanRangeRings === 'function') {
    toggleDScanRangeRingsButton.addEventListener('click', toggleDScanRangeRings);
} else {
    console.error("toggleDScanRangeRingsButton or its handler not found/defined.");
}
    
   console.log("Event listeners attached."); 


  // --- SECTION 4: Initial Render Call ---
// --- INITIAL RENDER CALL ---
async function initializeApp() {
    console.log("Initializing application...");
    await loadShipData(); // Wait for ship data to be fetched and processed

    // Now that ship data is loaded (or has attempted to load), proceed with map
    const defaultSystemName = "J121116"; 
    if (typeof fetchAndRenderSystem === 'function') {
        console.log(`Initial load for system: ${defaultSystemName}`);
        fetchAndRenderSystem(defaultSystemName);
    } else { 
        console.error("fetchAndRenderSystem function is not defined! Initial map cannot be drawn.");
    }
    // console.log("Application initialized. Script End."); // Moved Script End log
}

// --- INITIALIZE THE APP ---
if (typeof initializeApp === 'function') {
    initializeApp().then(() => {
        console.log("initializeApp sequence finished. Script End (after DOMContentLoaded).");
    }).catch(err => {
        console.error("Error during initializeApp:", err);
        console.log("Script End (after DOMContentLoaded, with error in init).");
    });
} else {
    console.error("initializeApp function is not defined!");
    console.log("Script End (after DOMContentLoaded, init function missing).");
}

});

// End of DOMContentLoaded listener
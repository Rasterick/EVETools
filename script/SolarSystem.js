// SolarSystem.js
document.addEventListener("DOMContentLoaded", () => {
  // <<<< SINGLE TOP-LEVEL DOMContentLoaded LISTENER

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
  const toggleDScanRangeRingsButton = document.getElementById(
    "toggleDScanRangeRingsButton"
  );

  const svgElement = document.getElementById("solarSystemSVG");
  const infoBox = document.getElementById("infoBox");
  const scanDataInput = document.getElementById("scanDataInput");
  const parseScanButton = document.getElementById("parseScanButton");
  const trilaterateSelectedButton = document.getElementById(
    "trilaterateSelectedButton"
  );
  const parseProbeDataButton = document.getElementById("parseProbeDataButton");
  const toggleSignatureZonesButton = document.getElementById(
    "toggleSignatureZonesButton"
  );
  const clearScanDataButton = document.getElementById("clearScanDataButton");
  const clearMarkersButton = document.getElementById("clearMarkersButton");
  const plottedMarkersTableBody = document.getElementById(
    "plottedMarkersTableBody"
  );
  const probeScanTableBody = document.getElementById("probeScanTableBody");
  const selectableCelestialsContainer = document.getElementById(
    "selectableCelestialsContainer"
  );
  const selectableCelestialsList = document.getElementById(
    "selectableCelestialsList"
  );
  const selectionCountSpan = document.getElementById("selectionCount");

  const prepareCustomMarkerButton = document.getElementById(
    "prepareCustomMarkerButton"
  );
  const customMarkerControlsDiv = document.getElementById(
    "customMarkerControls"
  );
  const markerShapeSelect = document.getElementById("markerShape");
  const markerColorSelect = document.getElementById("markerColor");
  const cancelCustomMarkerButton = document.getElementById(
    "cancelCustomMarkerButton"
  );
  const customMarkerInstructions = document.getElementById(
    "customMarkerInstructions"
  );

  const systemIdInput = document.getElementById("systemIdInput");
  const loadSystemButton = document.getElementById("loadSystemButton");

  // Modal UI Elements
  const selectRefsModal = document.getElementById("selectRefsModal"); // Assuming this ID is in your HTML for the modal
  const modalTitleCountSpan = document.getElementById("modalSelectionCount");
  const modalSelectableCelestialsList = document.getElementById(
    "modalSelectableCelestialsList"
  );
  const modalTrilaterateButton = document.getElementById(
    "modalTrilaterateButton"
  );
  const modalCancelButton = document.getElementById("modalCancelButton");

  // Header and System Info Box Spans
  const hdrSysClassEl = document.getElementById("hdrSysClass");
  const hdrSysEffectEl = document.getElementById("hdrSysEffect");
  const hdrSysStaticsEl = document.getElementById("hdrSysStatics");
  const sysClassEl = document.getElementById("sysClass");
  const sysEffectEl = document.getElementById("sysEffect");
  const sysStatic1El = document.getElementById("sysStatic1");
  const sysStatic2El = document.getElementById("sysStatic2");

  /* --- D-Scan ---*/
  // Add to your DOM Element References (SECTION 1)
  const curseCountInput = document.getElementById("curseCountInput");
  const rookCountInput = document.getElementById("rookCountInput");
  const lachesisCountInput = document.getElementById("lachesisCountInput");
  const huginnCountInput = document.getElementById("huginnCountInput");

  const celestialKeywords = [
    "Planet",
    "Moon",
    "Sun",
    "Star",
    "Asteroid Belt",
    "Stargate",
    "Station",
    "Customs Office",
    "Beacon",
  ];

  /* --- Manual celestial Range Entry --- */
  const manualRangeEntryButton = document.getElementById(
    "manualRangeEntryButton"
  );
  const manualRangeModal = document.getElementById("manualRangeModal");
  const manualRangeCelestialsList = document.getElementById(
    "manualRangeCelestialsList"
  );
  const generateDScanFromManualRangesButton = document.getElementById(
    "generateDScanFromManualRangesButton"
  );
  const cancelManualRangeButton = document.getElementById(
    "cancelManualRangeButton"
  );

  /* --- D-Scan Orin Functionality --- */
  const setDscanOriginButton = document.getElementById("setDscanOriginButton");
  const dscanOriginInput = document.getElementById("dscanOriginInput"); // For displaying the origin label
  const dscanRangeInput = document.getElementById("dscanRangeInput"); // For D-Scan range in AU

  /* --- System State Control --- */
  
  const saveStateToUrlButton = document.getElementById('saveStateToUrlButton');


  let baseOrbitsGroup,
    signatureZonesGroup,
    celestialBodiesGroup,
    scanMarkersGroup,
    dscanRangeCirclesGroup;
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

  /* --  D-Scan Marker -- */

  let isAddingCustomMarkerMode = false;
  let isSettingDScanOrigin = false;
  let currentActiveDScanOriginMarkerId = null;

  // Add a global variable to store the last known correct system name
let currentLoadedSystemName = "J121116"; // Initialize with default


let currentClassSummaryData = {};
let currentShipSummaryData = [];
let currentUnlistedEntriesData = {};


  console.log("Script Start: DOM loaded, constants and DOM elements defined.");
  if (!probeScanTableBody)
    console.error(
      "CRITICAL ERROR: probeScanTableBody element not found on script start!"
    );
  if (!plottedMarkersTableBody)
    console.error(
      "CRITICAL ERROR: plottedMarkersTableBody element not found on script start!"
    );
  if (!selectRefsModal)
    console.warn(
      "Modal 'selectRefsModal' not found. D-Scan selection UI will not work."
    );

  /* ------- D-Scan Parser Functionality --- */
  let shipDatabase = [];

  async function loadShipData() {
    console.log("Attempting to load shipData.json...");
    try {
      const response = await fetch("data/shipData.json"); // Verify this path is correct relative to your HTML file
      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status} while fetching shipData.json`
        );
      }
      const jsonData = await response.json();

      // Process URLs and other data as you had in your function
      const baseWikiUrl = "https://wiki.eveuniversity.org/"; // Define if not global
      jsonData.forEach((ship) => {
        let url = ship.URL ? String(ship.URL).trim() : "";
        if (
          !url ||
          url.startsWith("<img") ||
          (url.includes("_Shuttle") && !url.startsWith(baseWikiUrl))
        ) {
          const shipNameForUrl = (ship.Ship || "Unknown_Ship").replace(
            / /g,
            "_"
          );
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

      console.log(
        "Ship database loaded successfully:",
        shipDatabase.length,
        "entries."
      );
      // Example: console.log("First few ships:", shipDatabase.slice(0,3));
    } catch (e) {
      console.error("Error loading or parsing shipData.json:", e);
      alert(
        "Error loading ship data. Threat analysis may not work correctly. Check console. Ensure 'data/shipData.json' exists and is valid."
      );
      // No need for systemInfoContainerElem.innerHTML here, as the main app will still try to load
    }
  }

  /* Function to use the data generated by the PHP Script db_test.php */

  // Find your existing fetchAndRenderSystem function.
// It should look something like this (I'll paste the full structure from your last JS file for this function)

async function fetchAndRenderSystem(systemIdentifier) { // systemIdentifier is the name like "J121116"
    
  console.log(`Fetching data for system: ${systemIdentifier}`);
    currentLoadedSystemName = systemIdentifier.toUpperCase(); 
    console.log(`Set currentLoadedSystemName (tentative) to: ${currentLoadedSystemName}`);

    // --- FULL RESET ---
    if (svgElement) { 
        svgElement.innerHTML = ''; 
        console.log("Cleared svgElement innerHTML");
    }
    if (plottedMarkersTableBody) plottedMarkersTableBody.innerHTML = "";
    if (probeScanTableBody) probeScanTableBody.innerHTML = "";
    
    // --- ADD THIS LINE TO CLEAR THE TEXTAREA ---
    if (scanDataInput) {
        scanDataInput.value = "";
        console.log("Cleared scanDataInput textarea.");
    }
    // --- END OF ADDED LINE ---

    if (selectableCelestialsContainer && selectableCelestialsContainer.style) selectableCelestialsContainer.style.display = "none"; 
    if (selectRefsModal && selectRefsModal.style) selectRefsModal.style.display = "none"; 

    // Clear D-Scan related UI and data
    if (window.classSummaryTableBody) classSummaryTableBody.innerHTML = '';
    if (window.shipSummaryTableBody) shipSummaryTableBody.innerHTML = '';
    if (window.unlistedEntriesTableBody) unlistedEntriesTableBody.innerHTML = '';
    if (window.malformedLinesInfoThreat) malformedLinesInfoThreat.innerHTML = '<p>No D-Scan data analysed yet.</p>';
    const dScanAnalysisTitleEl = document.getElementById('dScanAnalysisTitle');
    if (dScanAnalysisTitleEl) dScanAnalysisTitleEl.textContent = 'D-Scan Threat Analysis';
    if (dscanOriginInput) dscanOriginInput.value = ""; // Clear D-Scan origin field
    // dscanRangeInput.value = "14.3"; // Optionally reset D-Scan range input to default

    currentSystemCelestials = []; 
    scannerPosMarkerCounter = 0; customMarkerCounter = 0;
    plottedMarkerData = {}; parsedProbeSignatures = [];
    selectedReferencePoints = []; knownPointsFromCurrentScan = []; 
    currentClassSummaryData = {}; currentShipSummaryData = []; currentUnlistedEntriesData = {}; // Reset threat data
    
    if (typeof updateSelectionCountAndButton === 'function') updateSelectionCountAndButton();
    isLinkingProbeSignature = false; signatureToLink = null; 
    isAddingCustomMarkerMode = false; isSettingDScanOrigin = false; currentActiveDScanOriginMarkerId = null;

    if (customMarkerControlsDiv && customMarkerControlsDiv.style) customMarkerControlsDiv.style.display = 'none';
    
    // Reset button states
    if (parseScanButton) parseScanButton.disabled = false;
    if (trilaterateSelectedButton) trilaterateSelectedButton.disabled = true; 
    if (parseProbeDataButton) parseProbeDataButton.disabled = false;
    if (prepareCustomMarkerButton) prepareCustomMarkerButton.disabled = false;
    if (setDscanOriginButton) { setDscanOriginButton.disabled = false; setDscanOriginButton.textContent = "Set Origin"; }
    if (toggleSignatureZonesButton) toggleSignatureZonesButton.textContent = "Show Signature Zones";
    if (signatureZonesGroup && signatureZonesGroup.style) signatureZonesGroup.style.display = 'none'; else if (signatureZonesGroup) signatureZonesGroup.innerHTML = '';
    if (dscanRangeCirclesGroup) { 
        while (dscanRangeCirclesGroup.firstChild) dscanRangeCirclesGroup.removeChild(dscanRangeCirclesGroup.firstChild);
        dscanRangeCirclesGroup.style.display = 'none';
    }
    if (toggleDScanRangeRingsButton) toggleDScanRangeRingsButton.textContent = "Show D-Scan Rings";

    console.log("All previous system state and UI fully cleared/reset for new system load.");
    // --- END FULL RESET ---

    // --- Update currentLoadedSystemName at the START of the fetch attempt ---
    // We use what was passed in. If PHP returns a slightly different canonical name, we'll update it later.
    currentLoadedSystemName = systemIdentifier.toUpperCase(); 
    console.log(`Set currentLoadedSystemName (tentative) to: ${currentLoadedSystemName}`);

    // ... (UI clearing logic as in your working version) ...
    if (svgElement) { svgElement.innerHTML = ''; }
    if (plottedMarkersTableBody) plottedMarkersTableBody.innerHTML = "";
    // ... etc. for all resets ...

    try {
        const response = await fetch('../db_test.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', },
            body: `systemID=${encodeURIComponent(systemIdentifier)}` // PHP uses this as systemName
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("PHP Error Response Text for system", systemIdentifier, ":", errorText);
            throw new Error(`Network response was not ok: ${response.status} for ${systemIdentifier}`);
        }

        const data = await response.json(); // Expecting { systemInfo: {...}, celestials: [...] }

        // --- Process systemInfo AND UPDATE currentLoadedSystemName DEFINITIVELY ---
        if (data && data.systemInfo && data.systemInfo.systemName) {
            const si = data.systemInfo;
            // Update currentLoadedSystemName with the name returned by the backend, as it's canonical
            currentLoadedSystemName = si.systemName.toUpperCase(); 
            console.log(`Set currentLoadedSystemName (confirmed from backend) to: ${currentLoadedSystemName}`);

            const appTitleH1 = document.getElementById('currentSystemTitleHeader');
            if (appTitleH1) appTitleH1.textContent = `System Information - ${currentLoadedSystemName}`;
            document.title = `EVE System Mapper - ${currentLoadedSystemName}`;

            // Populate header details
            if(hdrSysClassEl) hdrSysClassEl.textContent = si.class || 'N/A';
            if(hdrSysEffectEl) hdrSysEffectEl.textContent = si.effect || 'None';
            let staticsCombined = "";
            if (si.static1_type) staticsCombined += `${si.static1_type}${si.static1_leadsTo ? ' ('+si.static1_leadsTo+')' : ''}`;
            if (si.static2_type) staticsCombined += `${staticsCombined ? ' / ' : ''}${si.static2_type}${si.static2_leadsTo ? ' ('+si.static2_leadsTo+')' : ''}`;
            if(hdrSysStaticsEl) hdrSysStaticsEl.textContent = staticsCombined || 'None';

            // Populate main system info box
            if(sysClassEl) sysClassEl.textContent = si.class || 'N/A';
            if(sysEffectEl) sysEffectEl.textContent = si.effect || 'None';
            if(sysStatic1El) sysStatic1El.textContent = `${si.static1_type || 'N/A'}${si.static1_leadsTo ? ' -> ' + si.static1_leadsTo : ''}`;
            if(sysStatic2El) sysStatic2El.textContent = `${si.static2_type || 'N/A'}${si.static2_leadsTo ? ' -> ' + si.static2_leadsTo : ''}`;
        } else {
            console.warn("No systemInfo object received from backend for system:", systemIdentifier, ". Using passed identifier for title.");
            // Fallback for title if systemInfo object is missing but a name was passed
            const appTitleH1 = document.getElementById('currentSystemTitleHeader');
            if (appTitleH1) appTitleH1.textContent = `System Information - ${currentLoadedSystemName} (Details N/A)`;
            document.title = `EVE System Mapper - ${currentLoadedSystemName}`;
            // Clear other info fields
            if(hdrSysClassEl) hdrSysClassEl.textContent = 'N/A'; /* ... and others ... */
            if(sysClassEl) sysClassEl.textContent = 'N/A'; /* ... and others ... */
        }

        // --- Process celestials ---
        let celestialsToRender = [];
        if (data && data.celestials && data.celestials.length > 0) {
            celestialsToRender = data.celestials;
        } else if (data && Array.isArray(data) && data.length > 0 && !data.systemInfo) { // Fallback if PHP sent only array
            celestialsToRender = data;
             console.warn("Received only celestial array, no systemInfo object from backend for:", systemIdentifier);
        }
        
        currentSystemCelestials = celestialsToRender; // Assign to global

        if (currentSystemCelestials.length > 0) {
            if (typeof renderSystemSVG === 'function') {
                renderSystemSVG(currentSystemCelestials); 
            } else { console.error("renderSystemSVG is not defined!"); }
        } else {
            if (svgElement) svgElement.innerHTML = ''; // Clear map if no celestials
            console.error('No celestial data in response for system:', systemIdentifier);
            alert(`No celestial data found for system: ${systemIdentifier}. Map cannot be drawn.`);
        }

    } catch (error) { 
        console.error(`Error fetching/processing system data for ${systemIdentifier}:`, error); 
        alert(`Error loading system ${systemIdentifier}: ${error.message}`);
        const appTitleH1 = document.getElementById('currentSystemTitleHeader');
        if (appTitleH1) appTitleH1.textContent = `System Information - Error Loading ${systemIdentifier}`;
        currentSystemCelestials = []; // Ensure celestials are cleared on error
        if (svgElement) svgElement.innerHTML = ''; // Clear map on error
    }
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

    console.log(
      "renderSystemSVG: Called with data length:",
      celestialDataForSystem ? celestialDataForSystem.length : "undefined"
    );
    if (!svgElement) {
      console.error("renderSystemSVG: svgElement not found!");
      return;
    }
    // svgElement.innerHTML = ''; // This is now done in fetchAndRenderSystem BEFORE this is called

    if (!celestialDataForSystem || celestialDataForSystem.length === 0) {
      console.error(
        "renderSystemSVG called with no celestial data. Map cannot be drawn."
      );
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

    svgElement.innerHTML = "";

    // --- RECREATE ALL SVG GROUPS ---
    baseOrbitsGroup = document.createElementNS(SVG_NS, "g");
    baseOrbitsGroup.setAttribute("id", "baseOrbitsGroup");
    svgElement.appendChild(baseOrbitsGroup); // Layer 1 (Bottom)

    signatureZonesGroup = document.createElementNS(SVG_NS, "g");
    signatureZonesGroup.setAttribute("id", "signatureZonesGroup");
    signatureZonesGroup.style.display = "none";
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

        // -- Rotate Celestials text by 180 degrees
        // --- ADD COUNTER-ROTATION FOR CELESTIAL LABELS ---

        //labelTextElement.setAttribute("transform", `rotate(180, ${labelPlotX}, ${labelPlotY})`);

        // --- END COUNTER-ROTATION ---

        // -- END

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
    const val = safeParseFloat(distanceStr); // safeParseFloat removes commas and parses
    if (isNaN(val)) return NaN;

    if (distanceStr.toLowerCase().includes("au")) {
      distanceKmValue = val * AU_KM;
    } else if (distanceStr.toLowerCase().includes("km")) {
      distanceKmValue = val;
    } else if (
      distanceStr.toLowerCase().includes("m") &&
      !distanceStr.toLowerCase().includes("km")
    ) {
      // Explicitly check for 'm' but not 'km'
      distanceKmValue = val / 1000;
    } else {
      // NO unit specified, assume AU by default
      distanceKmValue = val * AU_KM;
      console.log(
        `No unit in "${distanceStr}", assuming AU -> ${distanceKmValue.toExponential(
          2
        )} km`
      );
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
    if (
      !modalSelectableCelestialsList ||
      !selectRefsModal ||
      !modalTitleCountSpan
    ) {
      console.error("displaySelectableCelestials: Modal UI elements missing.");
      return;
    }
    console.log(
      "displaySelectableCelestials (MODAL): Clearing and resetting selections."
    );
    modalSelectableCelestialsList.innerHTML = "";
    selectedReferencePoints = []; // CRITICAL: Reset this global array
    updateSelectionCountAndButton(); // Update to (0/3) and disable button

    if (
      !knownPointsFromCurrentScan ||
      knownPointsFromCurrentScan.length === 0
    ) {
      modalSelectableCelestialsList.innerHTML =
        "<p style='color: #888;'>No known celestials with distances found in scan data.</p>";
      if (selectRefsModal) selectRefsModal.style.display = "flex";
      return;
    }
    if (knownPointsFromCurrentScan.length < 3) {
      modalSelectableCelestialsList.innerHTML = `<p style='color: #ff8888;'>Need at least 3 known celestials for trilateration. Found ${knownPointsFromCurrentScan.length}.</p>`;
      // Still list them, but they won't be fully functional for selection
      knownPointsFromCurrentScan.forEach((point) => {
        const itemDiv = document.createElement("div");
        itemDiv.classList.add("celestial-item"); // Keep class for consistent styling
        itemDiv.style.cursor = "default"; // Indicate not selectable for trilateration
        itemDiv.style.opacity = "0.7";
        itemDiv.textContent = `${point.name} (${(point.d / AU_KM).toFixed(
          2
        )} AU)`;
        modalSelectableCelestialsList.appendChild(itemDiv);
      });
      if (selectRefsModal) selectRefsModal.style.display = "flex";
      return;
    }

    console.log(
      "displaySelectableCelestials (MODAL): Populating list with selectable items."
    );
    knownPointsFromCurrentScan.forEach((point) => {
      // Removed 'index' as dataset.pointIndex isn't crucial if 'point' is used
      const itemDiv = document.createElement("div");
      itemDiv.classList.add("celestial-item");
      itemDiv.textContent = `${point.name} (${(point.d / AU_KM).toFixed(
        2
      )} AU)`;
      // itemDiv.dataset.pointName = point.name; // Store name for easier removal if needed

      itemDiv.addEventListener("click", function () {
        console.log("MODAL Celestial item CLICKED:", this.textContent);

        // 'point' is the actual object from knownPointsFromCurrentScan for this itemDiv
        const isCurrentlySelected = selectedReferencePoints.includes(point);

        if (isCurrentlySelected) {
          this.classList.remove("selected");
          selectedReferencePoints = selectedReferencePoints.filter(
            (p) => p !== point
          );
          console.log(
            `Deselected ${point.name}. New selection count: ${selectedReferencePoints.length}`
          );
        } else {
          if (selectedReferencePoints.length < 3) {
            this.classList.add("selected");
            selectedReferencePoints.push(point);
            console.log(
              `Selected ${point.name}. New selection count: ${selectedReferencePoints.length}`
            );
          } else {
            alert("You can only select up to 3 reference points.");
          }
        }
        // console.log("Selected points array:", selectedReferencePoints.map(p => p.name)); // For debugging
        updateSelectionCountAndButton();
      });
      modalSelectableCelestialsList.appendChild(itemDiv);
    });
    if (selectRefsModal) selectRefsModal.style.display = "flex";
    console.log(
      "displaySelectableCelestials (MODAL): List populated and modal shown."
    );
  }

  // This function now updates the MODAL's counter and trilaterate button
  function updateSelectionCountAndButton() {
    if (!modalTitleCountSpan || !modalTrilaterateButton) {
      console.warn(
        "updateSelectionCountAndButton: Modal UI elements for count/button not found. Cannot update."
      );
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

    if (
      !scanDataInput ||
      !selectRefsModal ||
      !modalTrilaterateButton ||
      !modalSelectableCelestialsList ||
      !modalTitleCountSpan
    ) {
      console.error(
        "UI elements for D-Scan selection MODAL missing in handleParseScanAndPrepareSelection."
      );
      alert(
        "Error: UI components for D-Scan processing (modal) are not ready."
      );
      return;
    }
    const scanText = scanDataInput.value;

    // Clear previous selection UI state
    if (selectableCelestialsContainer)
      selectableCelestialsContainer.style.display = "none"; // Old UI
    if (selectRefsModal) selectRefsModal.style.display = "none"; // New Modal UI
    if (trilaterateSelectedButton)
      trilaterateSelectedButton.style.display = "none";

    if (!scanText.trim()) {
      alert("Paste D-Scan data into the text area.");
      knownPointsFromCurrentScan = [];
      selectedReferencePoints = [];
      if (typeof updateSelectionCountAndButton === "function")
        updateSelectionCountAndButton();
      return;
    }

    knownPointsFromCurrentScan = parseScanLinesForTrilateration(scanText);
    console.log(
      "Parsed known points for trilateration list:",
      knownPointsFromCurrentScan
    );

    // DO NOT CALL drawAllScannedRangeCircles here anymore.
    // The toggle button is solely responsible for that.

    if (typeof displaySelectableCelestials === "function") {
      // This populates and shows the selection list/modal
      displaySelectableCelestials();
    } else {
      console.error("displaySelectableCelestials function is not defined!");
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

      label.addEventListener("click", (e) =>
        handleMarkerLabelClick(e, markerGroupId, initialLabelText)
      );

      // --- ADD COUNTER-ROTATION FOR S-MARKER LABELS ---
      // The rotation point is the label's own (x,y) within its parent markerGroup
      //label.setAttribute("transform", `rotate(180, ${labelOffsetX}, ${labelOffsetY})`);
      // --- END COUNTER-ROTATION ---

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
    if (scanMarkersGroup) {
      // For S-markers and Custom Markers
      while (scanMarkersGroup.firstChild) {
        scanMarkersGroup.removeChild(scanMarkersGroup.firstChild);
      }
    }

    if (dscanRangeCirclesGroup) {
      while (dscanRangeCirclesGroup.firstChild) {
        dscanRangeCirclesGroup.removeChild(dscanRangeCirclesGroup.firstChild);
      }
      dscanRangeCirclesGroup.style.display = "none";
    }
    if (toggleDScanRangeRingsButton) {
      toggleDScanRangeRingsButton.textContent = "Show D-Scan Rings";
    }
    // Note: signatureZonesGroup is handled by its own toggle function.

    if (plottedMarkersTableBody) plottedMarkersTableBody.innerHTML = "";

    /*  --- Clear D-Scan Tables -- */
    // --- NEW: Clear D-Scan Threat Analysis Tables & Info ---
    const classSummaryTableBody = document.getElementById(
      "classSummaryTableBody"
    );
    const shipSummaryTableBody = document.getElementById(
      "shipSummaryTableBody"
    );
    const unlistedEntriesTableBody = document.getElementById(
      "unlistedEntriesTableBody"
    );
    const malformedLinesInfoThreat = document.getElementById(
      "malformedLinesInfoThreat"
    );
    const dscanTimeLabel = document.getElementById("dscanTimeLabel"); // For the time in threat panel

    if (classSummaryTableBody) classSummaryTableBody.innerHTML = "";
    if (shipSummaryTableBody) shipSummaryTableBody.innerHTML = "";
    if (unlistedEntriesTableBody) unlistedEntriesTableBody.innerHTML = "";
    if (malformedLinesInfoThreat)
      malformedLinesInfoThreat.innerHTML =
        "<p>No D-Scan data analysed yet.</p>"; // Reset message
    if (dscanTimeLabel) dscanTimeLabel.textContent = "N/A"; // Reset time

    const dScanAnalysisTitleEl = document.getElementById("dScanAnalysisTitle");
    if (dScanAnalysisTitleEl)
      dScanAnalysisTitleEl.textContent = "D-Scan Threat Analysis"; // Reset to default
    if (dscanTimeLabel) dscanTimeLabel.textContent = "N/A";

    // --- END NEW ---

    /* -- End --- */

    if (probeScanTableBody) probeScanTableBody.innerHTML = "";

    scannerPosMarkerCounter = 0;
    customMarkerCounter = 0;
    plottedMarkerData = {};
    parsedProbeSignatures = [];

    if (selectableCelestialsContainer)
      selectableCelestialsContainer.style.display = "none";
    if (trilaterateSelectedButton)
      trilaterateSelectedButton.style.display = "none";
    selectedReferencePoints = [];
    knownPointsFromCurrentScan = [];

    if (
      selectionCountSpan &&
      typeof updateSelectionCountAndButton === "function"
    )
      updateSelectionCountAndButton();
    isLinkingProbeSignature = false;
    signatureToLink = null;
    isAddingCustomMarkerMode = false;
    if (customMarkerControlsDiv) customMarkerControlsDiv.style.display = "none";

    // Reset button states
    if (parseScanButton) parseScanButton.disabled = false;
    if (trilaterateSelectedButton) trilaterateSelectedButton.disabled = true;
    if (parseProbeDataButton) parseProbeDataButton.disabled = false;

    if (selectRefsModal) selectRefsModal.style.display = "none"; // Hide modal

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

// SolarSystem.js - createAndPlotCustomMarker (CORRECTED LOGIC)

function createAndPlotCustomMarker(
    id,
    labelText,
    shapeType,
    color,
    svgX,
    svgY,
    specificRangeAU = null // Optional parameter for loading from state
) {
    console.log(`--- createAndPlotCustomMarker START ---`);
    console.log(`  ID: ${id}, Label: ${labelText}, Shape: ${shapeType}, Color: ${color}`);
    console.log(`  SVG Coords: X=${svgX.toFixed(1)}, Y=${svgY.toFixed(1)}`);
    console.log(`  Received specificRangeAU: ${specificRangeAU}`); 

    if (!scanMarkersGroup) { 
        console.error("CRITICAL createAndPlotCustomMarker: scanMarkersGroup is not initialized!"); return;
    }
    if (typeof currentSystemScaleFactor !== 'number' || currentSystemScaleFactor === 0 || isNaN(currentSystemScaleFactor)) {
         console.warn("CRITICAL createAndPlotCustomMarker: currentSystemScaleFactor is invalid. KM coords may be off.");
    }

    const markerGroup = document.createElementNS(SVG_NS, "g");
    markerGroup.setAttribute("id", id);
    markerGroup.setAttribute("transform", `translate(${svgX}, ${svgY})`);
    
    let shapeElementToDrag; 
    const baseSize = 6; 
    const strokeWidthCustom = 1.5;

    if (shapeType === "dscan_area" || shapeType === "dscan_area_input" || shapeType === "dscan_area_fixed") {
        console.log(`  Marker is a D-Scan Area type. ShapeType is: "${shapeType}"`);
        let rangeAU;

        // --- THIS IS THE CRITICAL IF/ELSE IF/ELSE CHAIN ---
        if (specificRangeAU !== null && !isNaN(parseFloat(specificRangeAU))) {
            // HIGHEST PRIORITY: Use the range passed in (e.g., for restoring state)
            rangeAU = parseFloat(specificRangeAU);
            console.log(`    >>> Using specificRangeAU (from loaded state or direct call): ${rangeAU} AU`);
        } else if (shapeType === "dscan_area_fixed") {
            // NEXT PRIORITY: If placing a NEW fixed type marker
            rangeAU = 14.3;
            console.log(`    >>> Using FIXED range for new "dscan_area_fixed" marker: ${rangeAU} AU`);
        } else { 
            // LAST PRIORITY: If placing a NEW input-based D-Scan area marker ("dscan_area" or "dscan_area_input")
            const dscanRangeInputEl = document.getElementById('dscanRangeInput');
            let inputValue = dscanRangeInputEl ? dscanRangeInputEl.value : "14.3"; // Default if input not found
            rangeAU = parseFloat(inputValue) || 14.3; // Default if parsing fails
            console.log(`    >>> Reading from dscanRangeInput.value for new marker: "${inputValue}", Parsed as: ${rangeAU} AU`);
        }
        // --- END OF CRITICAL IF/ELSE IF/ELSE CHAIN ---
        
        console.log(`  FINAL rangeAU to be used for D-Scan circle: ${rangeAU}`); 

        const radiusKm = rangeAU * AU_KM;
        let radiusSVG = (currentSystemScaleFactor && currentSystemScaleFactor !== 0) ? (radiusKm * currentSystemScaleFactor) : 0;
        console.log(`    Calculated radiusKm: ${radiusKm.toExponential(2)}, radiusSVG: ${radiusSVG.toFixed(2)}`);
        
        const rangeCircle = document.createElementNS(SVG_NS, "circle");
        rangeCircle.setAttribute("cx", "0"); rangeCircle.setAttribute("cy", "0");
        rangeCircle.setAttribute("r", radiusSVG.toString());
        rangeCircle.setAttribute("class", "dscan-range-visualization-circle");
        rangeCircle.style.pointerEvents = "none";
        markerGroup.appendChild(rangeCircle);

        shapeElementToDrag = document.createElementNS(SVG_NS, "g");
        const dL1 = document.createElementNS(SVG_NS, "line");
        dL1.setAttribute("x1", (-baseSize).toString()); dL1.setAttribute("y1", "0");
        dL1.setAttribute("x2", baseSize.toString());    dL1.setAttribute("y2", "0");
        dL1.setAttribute("stroke", color); dL1.setAttribute("stroke-width", strokeWidthCustom.toString());
        shapeElementToDrag.appendChild(dL1);
        const dL2 = document.createElementNS(SVG_NS, "line");
        dL2.setAttribute("x1", "0"); dL2.setAttribute("y1", (-baseSize).toString());
        dL2.setAttribute("x2", "0"); dL2.setAttribute("y2", baseSize.toString());
        dL2.setAttribute("stroke", color); dL2.setAttribute("stroke-width", strokeWidthCustom.toString());
        shapeElementToDrag.appendChild(dL2);
        
    } else {
        // --- HANDLE ALL OTHER STANDARD SHAPE TYPES ---
        switch (shapeType) {
            case "cross": {
                shapeElementToDrag = document.createElementNS(SVG_NS, "g");
                const crossL1 = document.createElementNS(SVG_NS, "line");
                crossL1.setAttribute("x1", (-baseSize).toString()); crossL1.setAttribute("y1", "0");
                crossL1.setAttribute("x2", baseSize.toString());    crossL1.setAttribute("y2", "0");
                crossL1.setAttribute("stroke", color); crossL1.setAttribute("stroke-width", strokeWidthCustom.toString());
                shapeElementToDrag.appendChild(crossL1);
                const crossL2 = document.createElementNS(SVG_NS, "line");
                crossL2.setAttribute("x1", "0"); crossL2.setAttribute("y1", (-baseSize).toString());
                crossL2.setAttribute("x2", "0"); crossL2.setAttribute("y2", baseSize.toString());
                crossL2.setAttribute("stroke", color); crossL2.setAttribute("stroke-width", strokeWidthCustom.toString());
                shapeElementToDrag.appendChild(crossL2);
                break;
            }
            case "square": {
                shapeElementToDrag = document.createElementNS(SVG_NS, "rect");
                shapeElementToDrag.setAttribute("x", (-baseSize / 2).toString());
                shapeElementToDrag.setAttribute("y", (-baseSize / 2).toString());
                shapeElementToDrag.setAttribute("width", baseSize.toString());
                shapeElementToDrag.setAttribute("height", baseSize.toString());
                shapeElementToDrag.setAttribute("fill", color);
                break;
            }
            case "diamond": {
                shapeElementToDrag = document.createElementNS(SVG_NS, "polygon");
                shapeElementToDrag.setAttribute("points", `0,${-baseSize} ${baseSize},0 0,${baseSize} ${-baseSize},0`);
                shapeElementToDrag.setAttribute("fill", color);
                break;
            }
            case "triangle_up": {
                shapeElementToDrag = document.createElementNS(SVG_NS, "polygon");
                const triH = baseSize * (Math.sqrt(3)/2); 
                shapeElementToDrag.setAttribute("points", `0,${-triH*0.66} ${baseSize*0.5},${triH*0.33} ${-baseSize*0.5},${triH*0.33}`);
                shapeElementToDrag.setAttribute("fill", color);
                break;
            }
            case "circle": // Fallthrough for default
            default: {
                shapeElementToDrag = document.createElementNS(SVG_NS, "circle");
                shapeElementToDrag.setAttribute("cx", "0");
                shapeElementToDrag.setAttribute("cy", "0");
                shapeElementToDrag.setAttribute("r", (baseSize / 1.8).toString()); 
                shapeElementToDrag.setAttribute("fill", color);
                break;
            }
        }
    }

    if (!shapeElementToDrag) {
        console.error(`CRITICAL: shapeElementToDrag is still undefined after processing shapeType: "${shapeType}". Marker not fully created.`);
        // markerGroup.remove(); // Optional: remove partially created markerGroup from DOM if it was added
        return; 
    }
    shapeElementToDrag.classList.add("custom-marker-shape"); 
    markerGroup.appendChild(shapeElementToDrag); 

    const label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("x", (baseSize + 3).toString()); 
    label.setAttribute("y", "0");    
    label.classList.add("custom-marker-label"); 
    label.textContent = labelText;
    label.style.fill = "#E0E0E0"; 
    label.style.cursor = "pointer";
    label.addEventListener('click', (e) => handleMarkerLabelClick(e, id, labelText)); 
    markerGroup.appendChild(label);

    scanMarkersGroup.appendChild(markerGroup);
    if (typeof makeMarkerDraggable === 'function') {
       makeMarkerDraggable(shapeElementToDrag, markerGroup); 
    } else { console.error("makeMarkerDraggable function is not defined!"); }
    console.log(`--- createAndPlotCustomMarker END for ${id} ---`);
}

  // --- NEW Reusable Function for Label Interaction ---
  function handleMarkerLabelClick(
    event,
    markerGroupIdFromEvent,
    initialDefaultLabel
  ) {
    event.stopPropagation(); // Good to keep this to prevent other clicks if needed

    console.log("--- handleMarkerLabelClick ---"); // Log 1

    const mapMarkerLabelElement = event.currentTarget; // The <text> element that was clicked
    const currentMapLabelText = mapMarkerLabelElement.textContent;

    console.log("  Marker Label Clicked:", currentMapLabelText); // Log 2
    console.log("  Received markerGroupIdFromEvent:", markerGroupIdFromEvent); // Log 3
    console.log("  Received initialDefaultLabel:", initialDefaultLabel); // Log 4
    console.log(
      "  Current isLinkingProbeSignature state:",
      isLinkingProbeSignature
    ); // Log 5
    if (isLinkingProbeSignature) {
      console.log("  SignatureToLink object:", signatureToLink); // Log 6
    }

    // Ensure markerGroupIdFromEvent is valid
    if (!markerGroupIdFromEvent || !markerGroupIdFromEvent.startsWith) {
      // Check if it's a string and starts with
      console.error(
        "  handleMarkerLabelClick: markerGroupIdFromEvent is invalid or missing:",
        markerGroupIdFromEvent
      );
      // Fallback attempt to find it by traversing up from the label (event.currentTarget)
      let parentGroup = mapMarkerLabelElement.parentNode;
      while (
        parentGroup &&
        !(
          parentGroup.id &&
          (parentGroup.id.startsWith("scannerMarkerGroup_") ||
            parentGroup.id.startsWith("customMarker_"))
        )
      ) {
        parentGroup = parentGroup.parentNode;
      }
      markerGroupIdFromEvent = parentGroup ? parentGroup.id : null;
      console.log(
        "  Fallback markerGroupIdFromEvent from parent traversal:",
        markerGroupIdFromEvent
      ); // Log 7
      if (!markerGroupIdFromEvent) {
        console.error(
          "  CRITICAL: Could not determine marker group ID for label click even after traversal."
        );
        return;
      }
    }

    const markerData = plottedMarkerData[markerGroupIdFromEvent];
    if (!markerData) {
      console.error(
        "  No data found in plottedMarkerData for markerId:",
        markerGroupIdFromEvent,
        "plottedMarkerData content:",
        plottedMarkerData
      ); // Log 8
      return;
    }
    console.log("  Found markerData:", markerData); // Log 9

    if (isLinkingProbeSignature && signatureToLink) {
      console.log(
        `  Attempting to link signature ${signatureToLink.id} to map marker ${currentMapLabelText} (ID: ${markerGroupIdFromEvent})`
      ); // Log 10

      // Unlink from any previous marker this signature was linked to
      const previouslyLinkedMarkerId = signatureToLink.mapMarkerId;
      if (
        previouslyLinkedMarkerId &&
        previouslyLinkedMarkerId !== markerGroupIdFromEvent
      ) {
        if (plottedMarkerData[previouslyLinkedMarkerId]) {
          plottedMarkerData[previouslyLinkedMarkerId].linkedSignatureId = null;
          // Decide if notes should be cleared upon unlinking
          // plottedMarkerData[previouslyLinkedMarkerId].notes = plottedMarkerData[previouslyLinkedMarkerId].notes.replace(`${signatureToLink.id} (...)`, '').trim();
          updateMarkerInTable(previouslyLinkedMarkerId, {
            notes: plottedMarkerData[previouslyLinkedMarkerId].notes,
            linkedSignatureId: null, // This assumes you have a column for this in S-marker table
          });
        }
      }
      // Unlink any signature previously linked to THIS map marker, IF it's a different signature
      if (
        markerData.linkedSignatureId &&
        markerData.linkedSignatureId !== signatureToLink.id
      ) {
        const oldSigToUnlink = parsedProbeSignatures.find(
          (s) => s.id === markerData.linkedSignatureId
        );
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
      if (
        !markerData.notes ||
        (markerData.isCustom &&
          defaultCustomNotesPattern.test(markerData.notes))
      ) {
        markerData.notes = `${signatureToLink.id} (${
          signatureToLink.specificName || signatureToLink.name
        })`;
      } else if (!markerData.notes.includes(signatureToLink.id)) {
        // Append if not already there
        markerData.notes +=
          (markerData.notes ? "; " : "") +
          `${signatureToLink.id} (${
            signatureToLink.specificName || signatureToLink.name
          })`;
      }

      if (typeof displayParsedProbeSignatures === "function")
        displayParsedProbeSignatures();
      updateMarkerInTable(markerGroupIdFromEvent, {
        notes: markerData.notes,
        linkedSignatureId: signatureToLink.id,
      });
      alert(
        `Signature ${signatureToLink.id} linked to map marker ${markerData.label}.`
      );

      isLinkingProbeSignature = false;
      signatureToLink = null;
      if (parseScanButton) parseScanButton.disabled = false;
      if (trilaterateSelectedButton && selectedReferencePoints)
        trilaterateSelectedButton.disabled =
          selectedReferencePoints.length !== 3;
      else if (trilaterateSelectedButton)
        trilaterateSelectedButton.disabled = true;
      if (parseProbeDataButton) parseProbeDataButton.disabled = false;
      console.log("  Linking complete. Exited linking mode."); // Log 11
    } else {
      // Normal label editing
      console.log("  Proceeding to label edit for:", currentMapLabelText); // Log 12
      let promptDefault = currentMapLabelText;
      if (
        currentMapLabelText.match(/^S\d+$/) ||
        (markerData.isCustom && currentMapLabelText === initialDefaultLabel)
      ) {
        promptDefault = "";
      }

      const newLabelText = prompt(
        `Enter new label for marker (was "${currentMapLabelText}"):`,
        promptDefault
      );
      if (newLabelText !== null) {
        const trimmedNewLabel = newLabelText.trim();
        if (trimmedNewLabel !== "") {
          mapMarkerLabelElement.textContent = trimmedNewLabel;
          markerData.label = trimmedNewLabel; // Update data store
          updateMarkerInTable(markerGroupIdFromEvent, {
            label: trimmedNewLabel,
          });

          const linkedSig = parsedProbeSignatures.find(
            (sig) => sig.mapMarkerId === markerGroupIdFromEvent
          );
          if (linkedSig) {
            linkedSig.linkedMapMarkerLabel = trimmedNewLabel;
            if (typeof displayParsedProbeSignatures === "function")
              displayParsedProbeSignatures();
          }
          console.log(
            `  Label for ${markerGroupIdFromEvent} updated to: ${trimmedNewLabel}`
          ); // Log 13
        } else {
          if (
            !currentMapLabelText.match(/^S\d+$/) &&
            !(
              markerData.isCustom && currentMapLabelText === initialDefaultLabel
            )
          ) {
            mapMarkerLabelElement.textContent = initialDefaultLabel;
            markerData.label = initialDefaultLabel; // Revert in data store
            updateMarkerInTable(markerGroupIdFromEvent, {
              label: initialDefaultLabel,
            });
            const linkedSig = parsedProbeSignatures.find(
              (sig) => sig.mapMarkerId === markerGroupIdFromEvent
            );
            if (linkedSig) {
              linkedSig.linkedMapMarkerLabel = initialDefaultLabel;
              if (typeof displayParsedProbeSignatures === "function")
                displayParsedProbeSignatures();
            }
            alert("Label cannot be empty. Reverted to default.");
            console.log(
              `  Label for ${markerGroupIdFromEvent} reverted to: ${initialDefaultLabel}`
            ); // Log 14
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

  function parseScanDataForRangeCircleInfo() {
    if (!scanDataInput) {
      console.error(
        "parseScanDataForRangeCircleInfo: scanDataInput element not found!"
      );
      return [];
    }
    const scanText = scanDataInput.value;
    if (!scanText.trim()) {
      return [];
    }
    return parseScanLinesForTrilateration(scanText); // Reuses the same parsing logic
  }

  function drawAllScannedRangeCircles(pointsData) {
    if (!dscanRangeCirclesGroup) {
      console.error(
        "drawAllScannedRangeCircles: dscanRangeCirclesGroup is not ready."
      );
      return;
    }
    while (dscanRangeCirclesGroup.firstChild) {
      dscanRangeCirclesGroup.removeChild(dscanRangeCirclesGroup.firstChild);
    }

    if (!pointsData || pointsData.length === 0) {
      console.log(
        "drawAllScannedRangeCircles: No pointsData to draw circles for."
      );
      return;
    }
    if (
      typeof currentSystemScaleFactor !== "number" ||
      currentSystemScaleFactor === 0 ||
      isNaN(currentSystemScaleFactor)
    ) {
      console.error(
        "drawAllScannedRangeCircles: Invalid currentSystemScaleFactor:",
        currentSystemScaleFactor
      );
      return;
    }

    let circlesDrawn = 0;
    pointsData.forEach((point) => {
      if (isNaN(point.x) || isNaN(point.y) || isNaN(point.d) || point.d <= 0)
        return;

      const centerX_svg = point.x * currentSystemScaleFactor;
      const centerY_svg = point.y * currentSystemScaleFactor;
      const radius_svg = point.d * currentSystemScaleFactor;

      if (radius_svg <= 0) return;

      const circle = document.createElementNS(SVG_NS, "circle");
      circle.setAttribute("cx", centerX_svg.toString());
      circle.setAttribute("cy", centerY_svg.toString());
      circle.setAttribute("r", radius_svg.toString());
      // CSS class #dscanRangeCirclesGroup circle will style it

      circle.dataset.celestialName = point.name; // For highlighting selected refs later
      dscanRangeCirclesGroup.appendChild(circle);
      circlesDrawn++;
    });
    console.log(`Drew ${circlesDrawn} D-Scan range circles.`);
  }
  // --- Display Selectable Celestials in MODAL --- //

  function displaySelectableCelestials() {
    if (
      !modalSelectableCelestialsList ||
      !selectRefsModal ||
      !modalTitleCountSpan
    ) {
      console.error("displaySelectableCelestials: Modal UI elements missing.");
      return;
    }
    // console.log("displaySelectableCelestials (MODAL): Clearing and resetting selections."); // Already confirmed
    modalSelectableCelestialsList.innerHTML = "";
    selectedReferencePoints = [];
    updateSelectionCountAndButton();

    if (
      !knownPointsFromCurrentScan ||
      knownPointsFromCurrentScan.length === 0
    ) {
      /* ... empty message ... */ return;
    }
    if (knownPointsFromCurrentScan.length < 3) {
      /* ... need more points message + list non-selectable items ... */ return;
    }

    // console.log("displaySelectableCelestials (MODAL): Populating list with selectable items."); // Already confirmed
    knownPointsFromCurrentScan.forEach((point) => {
      const itemDiv = document.createElement("div");
      itemDiv.classList.add("celestial-item");
      itemDiv.textContent = `${point.name} (${(point.d / AU_KM).toFixed(
        2
      )} AU)`;

      itemDiv.addEventListener("click", function () {
        console.log("--- itemDiv Click Listener START ---"); // Log A
        console.log("Clicked item text:", this.textContent);
        console.log("Associated point object:", point); // 'point' is from the forEach closure

        const isCurrentlySelected = selectedReferencePoints.includes(point);
        console.log("Is currently selected:", isCurrentlySelected); // Log B

        if (isCurrentlySelected) {
          this.classList.remove("selected");
          console.log("Removed .selected class from:", this.textContent); // Log C
          selectedReferencePoints = selectedReferencePoints.filter(
            (p) => p !== point
          );
          console.log(
            `Deselected ${point.name}. Current selectedReferencePoints:`,
            selectedReferencePoints.map((p) => p.name)
          ); // Log D
        } else {
          console.log(
            "Not currently selected. Selected points length:",
            selectedReferencePoints.length
          ); // Log E
          if (selectedReferencePoints.length < 3) {
            this.classList.add("selected");
            console.log("Added .selected class to:", this.textContent); // Log F
            selectedReferencePoints.push(point);
            console.log(
              `Selected ${point.name}. Current selectedReferencePoints:`,
              selectedReferencePoints.map((p) => p.name)
            ); // Log G
          } else {
            alert("You can only select up to 3 reference points.");
            console.log("Attempted to select more than 3; limit reached."); // Log H
          }
        }
        console.log(
          "Calling updateSelectionCountAndButton from itemDiv click."
        ); // Log I
        updateSelectionCountAndButton();
        // highlightSelectedReferenceCircles(); // Still keep commented
        console.log("--- itemDiv Click Listener END ---"); // Log J
      });
      modalSelectableCelestialsList.appendChild(itemDiv);
    });
    if (selectRefsModal) selectRefsModal.style.display = "flex";
    // console.log("displaySelectableCelestials (MODAL): List populated and modal shown."); // Already confirmed
  }

  //--Now uodates the modal's title count span

  function updateSelectionCountAndButton() {
    console.log("--- updateSelectionCountAndButton START ---"); // Log K
    if (!modalTitleCountSpan || !modalTrilaterateButton) {
      console.warn(
        "updateSelectionCountAndButton: Modal count span or trilaterate button not found. Cannot update."
      );
      console.log("modalTitleCountSpan:", modalTitleCountSpan);
      console.log("modalTrilaterateButton:", modalTrilaterateButton);
      return;
    }

    const count = selectedReferencePoints.length;
    console.log("  Current selectedReferencePoints count:", count); // Log L

    modalTitleCountSpan.textContent = `(${count}/3)`;
    console.log(
      "  Updated modal selection count display to:",
      modalTitleCountSpan.textContent
    ); // Log M

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
    if (typeof handleTrilaterateSelected === "function") {
      handleTrilaterateSelected(); // Call the existing main trilateration function
    } else {
      console.error("handleTrilaterateSelected function is not defined!");
    }
    // Hide the modal after attempting trilateration
    if (selectRefsModal) {
      selectRefsModal.style.display = "none";
    }
  }

  function handleModalCancel() {
    console.log("Modal 'Cancel Selection' button clicked.");
    if (selectRefsModal) selectRefsModal.style.display = "none";
    selectedReferencePoints = [];
    if (
      typeof dscanRangeCirclesGroup !== "undefined" &&
      dscanRangeCirclesGroup
    ) {
      dscanRangeCirclesGroup
        .querySelectorAll("circle.reference-selected")
        .forEach((circ) => circ.classList.remove("reference-selected"));
    }
    if (typeof updateSelectionCountAndButton === "function")
      updateSelectionCountAndButton();
  }

  function toggleDScanRangeRings() {
    console.log("toggleDScanRangeRings: Called.");
    if (!dscanRangeCirclesGroup) {
      // ... (defensive creation as before) ...
      // Ensure it's initially hidden after creation if it wasn't there
      if (dscanRangeCirclesGroup) dscanRangeCirclesGroup.style.display = "none";
    }
    if (!dscanRangeCirclesGroup) {
      /* Should not happen if creation worked */ return;
    }

    // Check if rings should be drawn/redrawn or just toggled
    // Condition: currently hidden OR (visible BUT no children, meaning data changed or cleared)
    if (
      dscanRangeCirclesGroup.style.display === "none" ||
      dscanRangeCirclesGroup.childNodes.length === 0
    ) {
      console.log(
        "toggleDScanRangeRings: Rings hidden or group empty, attempting to parse and show."
      );
      const pointsForCircles = parseScanDataForRangeCircleInfo();

      if (!pointsForCircles || pointsForCircles.length === 0) {
        alert(
          "No known celestials with distances found in the D-Scan input to draw range rings."
        );
        while (dscanRangeCirclesGroup.firstChild) {
          dscanRangeCirclesGroup.removeChild(dscanRangeCirclesGroup.firstChild);
        }
        dscanRangeCirclesGroup.style.display = "none";
        if (toggleDScanRangeRingsButton)
          toggleDScanRangeRingsButton.textContent = "Show D-Scan Rings";
        return;
      }

      drawAllScannedRangeCircles(pointsForCircles); // Clears old and draws new
      if (pointsForCircles.length > 0) {
        // Only show if circles were actually drawn
        dscanRangeCirclesGroup.style.display = "";
        if (toggleDScanRangeRingsButton)
          toggleDScanRangeRingsButton.textContent = "Hide D-Scan Rings";
      } else {
        // No circles drawn (e.g. all points invalid)
        dscanRangeCirclesGroup.style.display = "none";
        if (toggleDScanRangeRingsButton)
          toggleDScanRangeRingsButton.textContent = "Show D-Scan Rings";
      }
    } else {
      // Rings are currently visible and populated, so just hide them
      dscanRangeCirclesGroup.style.display = "none";
      if (toggleDScanRangeRingsButton)
        toggleDScanRangeRingsButton.textContent = "Show D-Scan Rings";
      console.log("toggleDScanRangeRings: Rings were visible, now hidden.");
    }
  }

  /* --- D-Scan Analysis Section ----*/
  // SolarSystem.js - SECTION 2

  function determineShipIdentity(rawColumn3Text) {
    const trimmedOriginalInput = rawColumn3Text.trim();
    const lowerTrimmedOriginalInput = trimmedOriginalInput.toLowerCase();
    // const lowerRawColumn3Text = rawColumn3Text.toLowerCase(); // Not strictly needed if using lowerTrimmedOriginalInput

    if (!shipDatabase || shipDatabase.length === 0) {
      // Check the global shipDatabase
      // console.warn("determineShipIdentity: shipDatabase is empty or not loaded.");
      return { foundShip: null, effectiveName: trimmedOriginalInput };
    }

    // Exact match first (case-insensitive)
    let found = shipDatabase.find(
      (dbShip) =>
        dbShip.Ship && dbShip.Ship.toLowerCase() === lowerTrimmedOriginalInput
    );
    if (found) {
      return { foundShip: found, effectiveName: found.Ship };
    }

    // Then, partial match (since shipsData is sorted by length descending, longer names get checked first)
    // This helps avoid "Probe" matching "Sisters Core Scanner Probe" incorrectly if "Probe" comes first in an unsorted list.
    for (const dbShip of shipDatabase) {
      // Use the global shipDatabase
      if (
        dbShip.Ship &&
        dbShip.Ship.trim() !== "" &&
        lowerTrimmedOriginalInput.includes(dbShip.Ship.toLowerCase())
      ) {
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
    const parts = lineText.split("\t");
    if (parts.length < 2) return null; // Need at least ID and Col2 (which might be ship name if distance is very short in col3)

    const idStr = parts[0].trim();
    let col2 = parts[1].trim();
    let col3 = parts.length > 2 ? parts[2].trim() : null;
    let distanceStr =
      parts.length > 3
        ? parts[3].trim()
        : parts.length === 3 && parseDistanceToKm(col3, true) !== null
        ? col3
        : null; // Check if col3 is distance

    let potentialShipName;
    let potentialPilotName = null; // Default to no pilot name

    // Heuristic refinement for EVE D-Scan:
    // 1. ID --- Name/Type --- Distance (common for structures, anomalies, sometimes NPCs)
    // 2. ID --- Pilot/Corp --- Ship Type --- Distance (common for player ships)
    // 3. ID --- Ship Type --- --- Distance (NPCs without distinct pilot names)
    // 4. ID --- Pilot/Corp --- Ship Type --- "-" (On grid player ships)
    // 5. ID --- Name/Type --- --- "-" (On grid NPCs/structures)

    if (distanceStr !== null) {
      // Distance is in the expected 4th column (or 3rd if only 3 columns)
      potentialShipName = col3 !== "-" && col3 !== null ? col3 : col2; // If col3 is "-", use col2 as name
      if (col2 !== potentialShipName && col2 !== "-") {
        potentialPilotName = col2;
      }
    } else if (
      col3 !== null &&
      (parseDistanceToKm(col3, true) !== null || col3 === "-")
    ) {
      // col3 is distance or "-"
      distanceStr = col3;
      potentialShipName = col2;
    } else if (col3 !== null) {
      // col3 is likely ship name, col2 is pilot/corp
      potentialShipName = col3;
      if (col2 !== "-") potentialPilotName = col2;
      distanceStr = "-"; // Assume on grid if no explicit distance
    } else {
      // Only col2 exists after ID, assume it's the item name
      potentialShipName = col2;
      distanceStr = "-"; // Assume on grid
    }

    // If potentialShipName is still one of the generic group names from probe scan, try to use previous column
    // This part might need more specific examples from your actual D-Scan if issues persist
    const genericGroups = [
      "cosmic signature",
      "cosmic anomaly",
      "combat site",
      "relic site",
      "data site",
      "wormhole",
      "gas site",
    ];
    if (
      genericGroups.includes(potentialShipName.toLowerCase()) &&
      potentialPilotName &&
      !genericGroups.includes(potentialPilotName.toLowerCase())
    ) {
      // If col3 was "Cosmic Signature" and col2 was "Unstable Wormhole", use col2.
      // This is trying to get the more specific name if col3 was too generic.
      // This heuristic is complex because D-Scan output isn't perfectly consistent for all item types.
      // For now, let's prioritize col3 as potentialShipName if distance is in col4.
      // If col3 is a distance or "-", then col2 is the shipName.
    }

    let distanceKm;
    let isDistanceValid = false;
    if (distanceStr === "-") {
      distanceKm = 0; // Represent "-" as 0 km (on grid) or a special marker
      isDistanceValid = true; // It's a valid "on grid" distance
    } else {
      distanceKm = parseDistanceToKm(distanceStr); // Uses your existing helper
      if (!isNaN(distanceKm)) {
        isDistanceValid = true;
      }
    }

    if (!isDistanceValid && parts.length < 3) {
      // If it's truly malformed and no distance clearly identifiable
      // console.warn(`parseDScanLineForEntities: Not enough parts or unparseable distance for line: "${lineText}"`);
      return null;
    }
    // If distance is still NaN but we have a potential ship name, we can proceed for threat analysis
    // but range-based features (like trilateration circles) won't work well for this item.
    // For threat analysis, we mainly need the ship type.
    if (potentialShipName) {
      const lowerPotentialShipName = potentialShipName.toLowerCase();
      // Check against specific keywords common for celestials in D-Scan
      if (
        lowerPotentialShipName.includes("planet") ||
        lowerPotentialShipName.includes("moon") ||
        lowerPotentialShipName.includes("sun") || // Could be "J121116 Sun"
        lowerPotentialShipName.includes("star (") || // E.g. "Star (K0V type)"
        celestialKeywords.some((keyword) =>
          lowerPotentialShipName.includes(keyword.toLowerCase())
        )
      ) {
        // Add more if needed
        // console.log("Skipping celestial for threat analysis:", potentialShipName);
        return null; // Skip planets, moons, and stars
      }
    } else {
      return null; // If no potential name could be extracted
    }

    const identity = determineShipIdentity(potentialShipName); // Uses global shipDatabase

    // Always return an entity if we have a potential ship name, even if distance is just "-"
    if (potentialShipName && potentialShipName !== "-") {
      return {
        rawLine: lineText,
        id: idStr,
        isShip: identity.foundShip !== null, // True if found in shipDatabase
        itemName: identity.effectiveName, // Matched name from shipDatabase or original input
        pilotName:
          potentialPilotName && potentialPilotName !== identity.effectiveName
            ? potentialPilotName
            : null,
        shipDetails: identity.foundShip, // Full object from shipDatabase or null
        distanceKm: !isNaN(distanceKm) ? distanceKm : null, // Store null if distance was truly unparseable beyond "-"
        distanceOriginalStr: distanceStr || "-", // Store original distance string
      };
    }

    // console.warn(`parseDScanLineForEntities: Could not extract a meaningful entity from line: "${lineText}"`);
    return null;
  }

  // Modify parseDistanceToKm slightly to have an optional flag for "just check if parsable"
  function parseDistanceToKm(distanceStr, checkOnly = false) {
    if (distanceStr === "-" || !distanceStr || distanceStr.trim() === "") {
      return checkOnly ? 0 : NaN; // If just checking, "-" is like a valid 0 distance entry
    }
    let distanceKmValue;
    const val = safeParseFloat(distanceStr);
    if (isNaN(val)) return checkOnly ? null : NaN; // If not a number at all

    if (distanceStr.toLowerCase().includes("au")) {
      distanceKmValue = val * AU_KM;
    } else if (distanceStr.toLowerCase().includes("km")) {
      distanceKmValue = val;
    } else if (
      distanceStr.toLowerCase().includes("m") &&
      !distanceStr.toLowerCase().includes("km")
    ) {
      distanceKmValue = val / 1000;
    } else {
      // No unit, assume AU
      distanceKmValue = val * AU_KM;
    }
    return isNaN(distanceKmValue) ? (checkOnly ? null : NaN) : distanceKmValue;
  }

  function assessThreat(shipDetails, pilotName) {
    // Placeholder - your logic from standalone tool will go here
    if (!shipDetails)
      return { category: "Unknown", score: 0, color: "#888888" };

    // Example basic logic (replace with your advanced logic)
    if (
      shipDetails.Class &&
      shipDetails.Class.toLowerCase().includes("capital")
    )
      return { category: "Capital", score: 10, color: "red" };
    if (
      shipDetails.Faction &&
      shipDetails.Faction.toLowerCase().includes("pirate")
    )
      return { category: "Pirate NPC", score: 5, color: "orange" };
    // ... more rules ...
    return { category: "Standard", score: 1, color: "#CCCCCC" };
  }

  function displayThreatClassSummary(classSummaryData) {
    console.log(
      "displayThreatClassSummary: Called with data:",
      classSummaryData
    ); // Log 1
    if (!window.classSummaryTableBody) {
      console.error(
        "displayThreatClassSummary: classSummaryTableBody element not found!"
      );
      return;
    }
    classSummaryTableBody.innerHTML = ""; // Clear previous

    if (Object.keys(classSummaryData).length === 0) {
      const row = classSummaryTableBody.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 2; // Assuming 2 columns: Class, Count
      cell.textContent = "No ship classes identified.";
      cell.style.textAlign = "center";
      return;
    }

    Object.keys(classSummaryData)
      .sort()
      .forEach((className) => {
        const row = classSummaryTableBody.insertRow();
        console.log(
          "displayThreatClassSummary: Adding row for class:",
          className,
          "Count:",
          classSummaryData[className]
        ); // Log 2
        row.insertCell().textContent = className;
        row.insertCell().textContent = classSummaryData[className];
      });
    console.log(
      "displayThreatClassSummary: Finished populating class summary table."
    ); // Log 3
  }

  function displayThreatShipSummary(shipSummaryData) {
    console.log(
      "displayThreatShipSummary: Called with data (first 3 shown):",
      JSON.parse(JSON.stringify(shipSummaryData.slice(0, 3)))
    ); // Log 4

    if (!window.shipSummaryTableBody) {
      console.error(
        "displayThreatShipSummary: shipSummaryTableBody element not found!"
      );
      return;
    }

    shipSummaryTableBody.innerHTML = "";

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

    shipSummaryData.forEach((ship) => {
      const key = `${ship.ship}-${ship.pilotNotes || "N/A"}`; // Aggregate by ship and pilot/notes
      if (!aggregatedShips[key]) {
        aggregatedShips[key] = { ...ship, count: 0 };
      }
      aggregatedShips[key].count++;
    });

    Object.values(aggregatedShips).forEach((ship) => {
      // Iterate over aggregated ships
      const row = shipSummaryTableBody.insertRow();
      console.log(
        "displayThreatShipSummary: Adding row for ship:",
        ship.ship,
        "Count:",
        ship.count
      ); // Log 5

      // Apply threat color to row or specific cells
      if (ship.threatColor) {
        // Example: row.style.color = ship.threatColor; // Or apply to specific cells
      }

      row.insertCell().textContent = ship.count;
      const shipCell = row.insertCell();
      if (ship.shipDetails && ship.shipDetails.URL) {
        shipCell.innerHTML = `<a href="${escapeHtml(
          ship.shipDetails.URL
        )}" target="_blank">${escapeHtml(ship.ship)}</a>`;
      } else {
        shipCell.textContent = escapeHtml(ship.ship);
      }
      row.insertCell().textContent = escapeHtml(ship.shipClass);
      row.insertCell().textContent = escapeHtml(ship.faction);

      const sensorCell = row.insertCell();
      const sensorText = escapeHtml(ship.ecmSensor) || "Unknown"; // Default to "Unknown"
      sensorCell.textContent = sensorText;

      // --- APPLY SENSOR CLASS FOR BACKGROUND COLOR ---
      sensorCell.classList.remove(
        "sensor-radar",
        "sensor-gravimetric",
        "sensor-magnetometric",
        "sensor-ladar",
        "sensor-multisensor",
        "sensor-unknown"
      ); // Clear old
      if (sensorText.toLowerCase().includes("radar")) {
        sensorCell.classList.add("sensor-radar");
      } else if (sensorText.toLowerCase().includes("gravimetric")) {
        sensorCell.classList.add("sensor-gravimetric");
      } else if (sensorText.toLowerCase().includes("magnetometric")) {
        sensorCell.classList.add("sensor-magnetometric");
      } else if (sensorText.toLowerCase().includes("ladar")) {
        sensorCell.classList.add("sensor-ladar");
      } else if (sensorText.toLowerCase().includes("multi")) {
        // For "Multi Sensor"
        sensorCell.classList.add("sensor-multisensor");
      } else {
        sensorCell.classList.add("sensor-unknown");
      }
      // --- END OF SENSOR CLASS ---

      row.insertCell().textContent = escapeHtml(ship.tank);
      row.insertCell().textContent = escapeHtml(ship.dps);
    });

    console.log(
      "displayThreatShipSummary: Finished populating ship summary table."
    ); // Log 6
  }

  function displayUnlistedDScanEntries(unlistedEntriesData) {
    console.log(
      "displayUnlistedDScanEntries: Called with data:",
      unlistedEntriesData
    ); // Log 7
    if (!window.unlistedEntriesTableBody) {
      console.error(
        "displayUnlistedDScanEntries: unlistedEntriesTableBody element not found!"
      );
      return;
    }
    unlistedEntriesTableBody.innerHTML = "";

    if (Object.keys(unlistedEntriesData).length === 0) {
      const row = unlistedEntriesTableBody.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 2; // Assuming 2 columns: Count, Item Name
      cell.textContent = "No unlisted entries found.";
      cell.style.textAlign = "center";
      return;
    }

    Object.keys(unlistedEntriesData)
      .sort()
      .forEach((itemName) => {
        const row = unlistedEntriesTableBody.insertRow();
        console.log(
          "displayUnlistedDScanEntries: Adding row for item:",
          itemName,
          "Count:",
          unlistedEntriesData[itemName]
        ); // Log 8
        row.insertCell().textContent = unlistedEntriesData[itemName];
        row.insertCell().textContent = escapeHtml(itemName);
      });
    console.log(
      "displayUnlistedDScanEntries: Finished populating unlisted entries table."
    ); // Log 9
  }

  // Inside SolarSystem.js

  function handleAnalyseDScanThreats() {
    console.log("--- handleAnalyseDScanThreats START ---");

    const localUnlistedEntries = {};

    if (!scanDataInput) {
      /* ... error check ... */ return;
    }
    if (shipDatabase.length === 0) {
      /* ... error check ... */ return;
    }

    const scanText = scanDataInput.value;
    const reconShipsText = document.getElementById("reconShipsText")
      ? document.getElementById("reconShipsText").value
      : "";

    // Clear previous threat tables
    if (window.classSummaryTableBody) classSummaryTableBody.innerHTML = "";
    if (window.shipSummaryTableBody) shipSummaryTableBody.innerHTML = "";

    

    if (window.unlistedEntriesTableBody)
      unlistedEntriesTableBody.innerHTML = "";
    if (window.malformedLinesInfoThreat)
      malformedLinesInfoThreat.innerHTML = "";

    const dscanEntities = [];
    const unlistedEntries = {};
    let malformedCount = 0;

    const lines = scanText.split("\n");
    lines.forEach((line) => {
      // Process D-Scan lines
      if (line.trim() === "") return;
      const entity = parseDScanLineForEntities(line);
      if (entity) {
        dscanEntities.push(entity);
        if (!entity.shipDetails) {
          unlistedEntries[entity.itemName] =
            (unlistedEntries[entity.itemName] || 0) + 1;
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
      { name: "Huginn", count: parseInt(huginnCountInput?.value) || 0 },
    ];

    reconShipsToAdd.forEach((reconShip) => {
      if (reconShip.count > 0) {
        const identity = determineShipIdentity(reconShip.name); // Uses shipDatabase
        if (identity.foundShip) {
          for (let i = 0; i < reconShip.count; i++) {
            dscanEntities.push({
              rawLine: `OFF-SCAN RECON: ${reconShip.name}`, // Indicate source
              id: `RECON_${reconShip.name}_${i + 1}`, // Create a dummy ID
              isShip: true,
              itemName: identity.effectiveName,
              pilotName: "Recon Force", // Generic pilot for these
              shipDetails: identity.foundShip,
              distanceKm: 0, // No actual distance from D-Scan
              distanceOriginalStr: "Off-Scan",
            });
          }
          console.log(
            `Added ${reconShip.count} x ${reconShip.name} from recon inputs.`
          );
        } else {
          // This recon ship name isn't in shipDatabase, add to unlisted
          unlistedEntries[reconShip.name] =
            (unlistedEntries[reconShip.name] || 0) + reconShip.count;
          console.warn(
            `Recon ship type "${reconShip.name}" not found in shipDatabase.`
          );
        }
      }
    });
    // --- END OF NEW RECON SHIP PROCESSING ---
    const localClassSummary = {}; // Use a local name
    // --- AGGREGATE SHIP SUMMARY DATA ---
    const classSummary = {};
    const aggregatedShipData = {}; // Use an object for easier aggregation by a unique key

    

    dscanEntities.forEach((entity) => {
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
            faction: entity.shipDetails["Faction Icon"] || "N/A",
            ecmSensor: entity.shipDetails.Sensor || "N/A",
            tank: entity.shipDetails.Tank || "N/A",
            dps: entity.shipDetails.DPS || "N/A",
            // Pilot/Notes: Use the parsed pilot name if available, otherwise from ship DB notes.
            // The original D-Scan line's column 2 might also be relevant if not a ship type.
            // pilotNotes: entity.pilotName || entity.shipDetails.Notes || (entity.rawLine.split('\t')[1] !== entity.itemName && entity.rawLine.split('\t')[1].trim() !== "-" ? entity.rawLine.split('\t')[1].trim() : ''),
            threatCategory: threat.category,
            threatColor: threat.color,
            shipDetails: entity.shipDetails, // Keep for URL link
          };
        }
        aggregatedShipData[aggregationKey].count++;
      }
    });
    const localShipSummaryForTable = Object.values(aggregatedShipData); 

    const finalShipSummaryForTable = Object.values(aggregatedShipData);
    // --- END OF AGGREGATION ---

       // NOW ASSIGN TO GLOBALS FOR SAVING STATE
    currentClassSummaryData = classSummary;
    currentShipSummaryData = finalShipSummaryForTable;
    currentUnlistedEntriesData = unlistedEntries;

    console.log("handleAnalyseDScanThreats: Populated global currentClassSummaryData:", currentClassSummaryData);
    console.log("handleAnalyseDScanThreats: Populated global currentShipSummaryData (first 3):", JSON.parse(JSON.stringify(currentShipSummaryData.slice(0,3))));
    console.log("handleAnalyseDScanThreats: Populated global currentUnlistedEntriesData:", currentUnlistedEntriesData);

    console.log("handleAnalyseDScanThreats: classSummary data:", classSummary);
    console.log(
      "handleAnalyseDScanThreats: aggregatedShipData for table (first 5):",
      JSON.parse(JSON.stringify(finalShipSummaryForTable.slice(0, 5)))
    );

    console.log("handleAnalyseDScanThreats: unlistedEntries data:", localUnlistedEntries); // << CORRECT

    if (typeof displayThreatClassSummary === 'function') displayThreatClassSummary(localClassSummary);
    if (typeof displayThreatShipSummary === 'function') displayThreatShipSummary(localShipSummaryForTable);
    if (typeof displayUnlistedDScanEntries === 'function') displayUnlistedDScanEntries(localUnlistedEntries);

    // Call display functions
    if (typeof displayThreatClassSummary === "function")
      displayThreatClassSummary(classSummary);
    if (typeof displayThreatShipSummary === "function")
      displayThreatShipSummary(finalShipSummaryForTable); // Pass aggregated data
    if (typeof displayUnlistedDScanEntries === "function")
      displayUnlistedDScanEntries(unlistedEntries);

    if (window.malformedLinesInfoThreat && malformedCount > 0) {
      malformedLinesInfoThreat.textContent = `Could not fully parse ${malformedCount} D-Scan lines.`;
    } else if (window.malformedLinesInfoThreat) {
      malformedLinesInfoThreat.textContent =
        malformedCount === 0
          ? "All D-Scan lines parsed without structural errors."
          : "";
    }

    // --- NEW: Update D-Scan Analysis Title with Time ---
    const dScanAnalysisTitleEl = document.getElementById("dScanAnalysisTitle");
    const now = new Date();
    const timeString = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const dateString = now.toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }); // e.g., 12 Jun 2025

    if (dScanAnalysisTitleEl) {
      dScanAnalysisTitleEl.textContent = `D-Scan Threat Analysis - ${timeString} ${dateString}`;
    }
    // Also update the separate time label if you still have it within the panel
    const dscanTimeLabel = document.getElementById("dscanTimeLabel"); // If this element exists for just time
    if (dscanTimeLabel)
      dscanTimeLabel.textContent = `${timeString} ${dateString}`;
    // --- END NEW ---

    // ... (rest of the function: malformed lines info, dscan time label) ...
    console.log("--- handleAnalyseDScanThreats END ---");
  }

  /* --- End of D-Scan Analysis Section ----/

  /* --- End of Custom Marker Function --- */

  /* -- Manually Enter D-Scan Ranges --- */

  function openManualRangeEntryModal() {
    if (
      !manualRangeModal ||
      !manualRangeCelestialsList ||
      !currentSystemCelestials
    )
      return;

    manualRangeCelestialsList.innerHTML = ""; // Clear previous entries
    if (currentSystemCelestials.length === 0) {
      manualRangeCelestialsList.innerHTML =
        "<p>No system data loaded. Load a system first.</p>";
      manualRangeModal.style.display = "flex";
      return;
    }

    currentSystemCelestials.forEach((cel) => {
      if (cel.itemName.includes(" - Moon ")) return; /* -- Skip Moons ---*/

      // Skip the star for manual range entry, or include if desired
      // if (cel.itemName.includes(" - Star")) return;

      const entryDiv = document.createElement("div");
      entryDiv.className = "celestial-range-entry";

      const nameLabel = document.createElement("label");
      nameLabel.htmlFor = `range-input-${cel.Id}`; // Use cel.Id for unique ID
      nameLabel.textContent = cel.itemName;
      nameLabel.title = cel.itemName; // Show full name on hover

      const rangeInput = document.createElement("input");
      rangeInput.type = "text"; // Use text to allow "10 AU" or "15000 km"
      rangeInput.id = `range-input-${cel.Id}`;
      rangeInput.placeholder = "e.g., 10 AU or 15000 km";
      rangeInput.dataset.celestialName = cel.itemName; // Store for retrieval

      entryDiv.appendChild(nameLabel);
      entryDiv.appendChild(rangeInput);
      // Optionally, add a select for units (AU/km/m) if you don't want users to type units
      manualRangeCelestialsList.appendChild(entryDiv);
    });
    manualRangeModal.style.display = "flex";
  }

  function handleGenerateDScanFromManualRanges() {
    if (!manualRangeCelestialsList || !scanDataInput) return;

    let generatedDScanText = "";
    const entries = manualRangeCelestialsList.querySelectorAll(
      '.celestial-range-entry input[type="text"]'
    );
    let validEntriesCount = 0;

    entries.forEach((input) => {
      const celestialName = input.dataset.celestialName;
      const rangeValue = input.value.trim();

      if (celestialName && rangeValue !== "") {
        const celestialDetails = currentSystemCelestials.find(
          (c) => c.itemName === celestialName
        );

        let typeForDScanLine = "Unknown Type";
        if (celestialDetails && celestialDetails.Represenatation) {
          // Check if celestialDetails and Represenatation exist
          // We don't need the color string, just a general type for the D-Scan line.
          // Let's try to get a more generic type from itemName or a mapping if needed.
          // For now, using Represenatation might be okay for a dummy line.
          typeForDScanLine = celestialDetails.Represenatation.replace(
            " Circle",
            ""
          ); // e.g., "Yellow", "Pale Grey"
          // Or, if you have a 'typeName' from your PHP output in currentSystemCelestials:
          // typeForDScanLine = celestialDetails.typeName || "Unknown Type";
        } else if (celestialDetails) {
          // If Represenatation is missing, try to infer from itemName
          if (celestialDetails.itemName.includes("Planet"))
            typeForDScanLine = "Planet";
          else if (celestialDetails.itemName.includes("Moon"))
            typeForDScanLine = "Moon";
          else if (celestialDetails.itemName.includes("Star"))
            typeForDScanLine = "Star";
        }

        // Construct a D-Scan like line: ID (dummy) \t Name \t Type \t Distance
        // The ID field in D-Scan often relates to itemID or typeID, not groupID
        // For simplicity, using a placeholder. The critical parts are Name and Distance.
        const dummyId = celestialDetails ? celestialDetails.Id : "xxxx"; // Use actual ID if available
        generatedDScanText += `${dummyId}\t${celestialName}\t${typeForDScanLine}\t${rangeValue}\n`;
        validEntriesCount++;
      }
    });

    // ... (rest of the function: check validEntriesCount, populate scanDataInput, click parseScanButton) ...
    if (validEntriesCount < 3 && validEntriesCount > 0) {
      // Allow proceeding even with <3 if user wants to see rings
      alert(
        "Warning: Fewer than 3 ranges entered. Trilateration will not be possible, but D-Scan rings might show if toggled after parsing."
      );
    } else if (validEntriesCount === 0) {
      alert("Please enter ranges for some celestials.");
      return;
    }

    scanDataInput.value = generatedDScanText;
    if (manualRangeModal) manualRangeModal.style.display = "none";

    // Automatically trigger the D-Scan parsing and reference selection process
    /* ----
    if (parseScanButton) {
      console.log(
        "Automatically clicking 'Parse D-Scan & Select Refs' button."
      );
      parseScanButton.click();
    }
    -- */
    alert(
      "D-Scan text area has been populated with your manually entered ranges. You can now use 'Parse D-Scan & Select Refs' or 'Toggle D-Scan Rings'."
    );
    console.log(
      "Generated D-Scan text from manual ranges and populated textarea."
    );
    console.log(
      "Generated D-Scan text from manual ranges and initiated parsing."
    );
  }

  // --- Helper functions to reset modes and UI states ---
  function resetGeneralCustomMarkerMode() {
    isAddingCustomMarkerMode = false;
    if (customMarkerControlsDiv) customMarkerControlsDiv.style.display = "none";
    if (customMarkerInstructions)
      customMarkerInstructions.textContent =
        "Select shape & color, then CLICK ON MAP to place.";

    // Re-enable other buttons
    if (parseScanButton) parseScanButton.disabled = false;
    if (trilaterateSelectedButton && selectedReferencePoints)
      trilaterateSelectedButton.disabled = selectedReferencePoints.length !== 3;
    else if (trilaterateSelectedButton)
      trilaterateSelectedButton.disabled = true;
    if (parseProbeDataButton) parseProbeDataButton.disabled = false;
    if (setDscanOriginButton) setDscanOriginButton.disabled = false; // Re-enable this too
    console.log("Exited general custom marker placement mode.");
  }

  function resetDScanOriginMode() {
    isSettingDScanOrigin = false;
    if (setDscanOriginButton) {
      setDscanOriginButton.textContent = "Set Origin";
      setDscanOriginButton.disabled = false;
    }
    // Re-enable other main buttons that might have been disabled by "Set Origin" mode
    if (parseScanButton) parseScanButton.disabled = false;
    if (trilaterateSelectedButton && selectedReferencePoints)
      trilaterateSelectedButton.disabled = selectedReferencePoints.length !== 3;
    else if (trilaterateSelectedButton)
      trilaterateSelectedButton.disabled = true;
    if (parseProbeDataButton) parseProbeDataButton.disabled = false;
    if (prepareCustomMarkerButton) prepareCustomMarkerButton.disabled = false;
    // if (customMarkerInstructions) customMarkerInstructions.textContent = "Select shape & color, then CLICK ON MAP to place.";
    console.log("Exited 'Set D-Scan Origin' mode.");
  }

  // SolarSystem.js - SECTION 2 (Function Definitions)

  function resetAllPlacementModes() {
    console.log("Resetting all placement modes...");
    isAddingCustomMarkerMode = false;
    isSettingDScanOrigin = false;

    // Hide UI specific to these modes
    if (customMarkerControlsDiv) {
      customMarkerControlsDiv.style.display = "none";
    }
    if (customMarkerInstructions) {
      customMarkerInstructions.textContent =
        "Select shape & color, then CLICK ON MAP to place."; // Reset
    }

    // Reset "Set Origin" button state
    if (setDscanOriginButton) {
      setDscanOriginButton.textContent = "Set Origin";
      setDscanOriginButton.disabled = false;
    }

    // Re-enable main action buttons
    if (prepareCustomMarkerButton) {
      // The button to INITIATE custom marker mode
      prepareCustomMarkerButton.disabled = false;
    }
    if (parseScanButton) {
      parseScanButton.disabled = false;
    }
    if (trilaterateSelectedButton) {
      // Only enable if 3 D-Scan refs are still selected
      trilaterateSelectedButton.disabled = !(
        selectedReferencePoints && selectedReferencePoints.length === 3
      );
    }
    if (parseProbeDataButton) {
      parseProbeDataButton.disabled = false;
    }
    console.log("All placement modes reset. UI and button states updated.");
  }

function robustBase64Encode(str) {
    try {
        // Prevent issues with UTF-8 characters during btoa
        return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
        console.warn("UTF-8 to Base64 encoding (unescape/encodeURIComponent) failed, falling back to direct btoa:", e);
        return btoa(str); // Fallback, might not handle all UTF-8 chars correctly in all btoa implementations
    }
}


  // --- NEW FUNCTION (in SECTION 2) ---
async function saveAppStateToUrl() { // Made async because of fetch
    console.log("Attempting to save app state via server...");

    let systemNameForSave = currentLoadedSystemName;
    if (!systemNameForSave && currentSystemCelestials && currentSystemCelestials.length > 0) {
        const starObj = currentSystemCelestials.find(c => c.itemName.toUpperCase().includes(" - STAR"));
        if (starObj) systemNameForSave = starObj.itemName.split(" - Star")[0].trim().toUpperCase();
    }
    if (!systemNameForSave) {
        alert("Current system name is unknown. Cannot save state.");
        console.error("saveAppStateToUrl: currentLoadedSystemName is not set or derivable.");
        return;
    }
    console.log("Saving state for system:", systemNameForSave);

    const stateToSave = {
        version: 1,
        systemName: systemNameForSave, // Already uppercased if derived
        plottedMarkers: plottedMarkerData,
        probeSignatures: parsedProbeSignatures.map(sig => ({
            id: sig.id, group: sig.group, name: sig.name,
            specificName: sig.specificName, resolution: sig.resolution,
            rangeOriginalStr: sig.rangeOriginalStr, 
            mapMarkerId: sig.mapMarkerId 
        })),
        ui: {
            dscanOriginLabel: dscanOriginInput?.value || null,
            dscanRangeAU: parseFloat(dscanRangeInput?.value) || 14.3,
        },
        threatAnalysis: { 
            classSummaryData: currentClassSummaryData || {}, 
            shipSummaryData: currentShipSummaryData || [],   
            unlistedEntriesData: currentUnlistedEntriesData || {} 
        }
    };

    // Log the object that will be stringified
    console.log("saveAppStateToUrl: stateToSave object (JavaScript object):", JSON.parse(JSON.stringify(stateToSave))); // Deep copy for logging

    try {
        const jsonStringPayload = JSON.stringify(stateToSave);
        console.log("saveAppStateToUrl: JSON string to save (payload for PHP - sample):", jsonStringPayload.substring(0, 300) + "..."); // <<< YOUR LOG

        // --- FETCH CALL TO PHP SCRIPT TO SAVE THE STATE ---
        // Adjust URL to your save_mapper_state.php script
        const response = await fetch('save_mapper_state.php', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', // We are sending JSON in the body
            },
            body: jsonStringPayload // Send the full JSON string as the body
        });

        if (!response.ok) {
            // Try to get more specific error message from PHP if it sent one
            const errorData = await response.json().catch(() => ({ message: `Server error: ${response.status} ${response.statusText}` }));
            throw new Error(errorData.message || `Server error: ${response.status}`);
        }

        const result = await response.json(); // Expecting { success: true, id: "...", url: "..." }

        if (result.success && result.url && result.id) {
            const shortUrl = result.url; 
            console.log("App state saved to server. Shareable short URL:", shortUrl);

            // Update browser history with the short URL
            if (history.pushState) {
                history.pushState({ map_id: result.id }, `EVE System Mapper - ${stateToSave.systemName} (ID: ${result.id})`, shortUrl);
                document.title = `EVE System Mapper - ${stateToSave.systemName} (ID: ${result.id})`;
            } else {
                // Fallback for older browsers - this will cause a reload with the new URL
                // window.location.href = shortUrl; 
                // A less disruptive fallback might be to just show the URL and not change current location.
                // Or, if your load logic also checks hash, you could update hash to ?scan_id=...
                console.warn("history.pushState not supported, URL not updated cleanly in address bar.");
            }

            // Attempt to copy to clipboard
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(shortUrl).then(() => {
                    alert("Shareable short link copied to clipboard!\n\n" + shortUrl);
                }).catch(err => {
                    console.error("Failed to copy short URL to clipboard (API available but failed):", err);
                    prompt("Shareable link created! Please copy this link (Ctrl+C / Cmd+C):", shortUrl);
                });
            } else {
                console.warn("Navigator.clipboard.writeText API not available. Using prompt for manual copy.");
                prompt("Shareable link created! Please copy this link (Ctrl+C / Cmd+C):", shortUrl);
            }
        } else {
            throw new Error(result.message || "Failed to get valid save confirmation from server.");
        }

    } catch (error) {
        console.error("Error in saveAppStateToUrl (saving state via server):", error);
        alert("Could not save state to server: " + error.message);
    }
}
// Remember the utf8EncodedString helper if btoa(unescape(encodeURIComponent(str))) isn't used
// function utf8EncodedString(str) { return btoa(unescape(encodeURIComponent(str))); }


// --- NEW FUNCTION (in SECTION 2) ---
// loadAppStateFromUrl: Handles the OLD #state= HASH method
function loadAppStateFromUrl() {
    console.log("Checking for app state in URL HASH (#state=)...");
    if (window.location.hash && window.location.hash.startsWith("#state=")) {
        const encodedData = window.location.hash.substring("#state=".length);
        // ... (your existing robust decoding for base64 from hash) ...
        try {
            const base64Encoded = decodeURIComponent(encodedData);
            const jsonString = atob(base64Encoded);
            if (jsonString === "undefined" || typeof jsonString !== 'string' || jsonString.trim() === "") {
                throw new Error("Decoded hash state is invalid string.");
            }
            const loadedState = JSON.parse(jsonString);
            if (!loadedState || typeof loadedState !== 'object' || loadedState.version !== 1) {
                throw new Error("Parsed hash state is invalid or wrong version.");
            }
            window.pendingLoadedState = loadedState; // Set for applyPendingLoadedState
            console.log("State successfully decoded from URL HASH.");
            return true; // Indicate state found and is pending application
        } catch (error) {
            console.error("Error loading state from URL HASH:", error);
            alert("Could not load saved state from URL hash. It might be corrupted.");
            if (history.replaceState) {
                history.replaceState(null, '', window.location.pathname + window.location.search);
            } else { window.location.hash = ''; }
            return false;
        }
    }
    return false; // No #state= hash found
}

// fetchAndApplyStateFromServer: Handles NEW ?map_id= SHORT URL method
async function fetchAndApplyStateFromServer(mapId) {
    console.log(`Attempting to load state from server for map_id: ${mapId}`);
    try {
        // Ensure path to load_mapper_state.php is correct
        const response = await fetch(`../load_mapper_state.php?map_id=${encodeURIComponent(mapId)}`); 
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `Failed to load map state ${mapId}. Server error: ${response.status}` }));
            throw new Error(errorData.message);
        }
        const serverResult = await response.json();
        if (serverResult.success && serverResult.data_payload) {
            const stateJsonString = serverResult.data_payload;
            const loadedState = JSON.parse(stateJsonString); // Parse the payload string

            if (!loadedState || typeof loadedState !== 'object' || loadedState.version !== 1) {
                throw new Error("Loaded state from server is invalid or wrong version.");
            }
            window.pendingLoadedState = loadedState; // Set for applyPendingLoadedState
            console.log(`State for map_id ${mapId} successfully loaded from server.`);
            return true; // Indicate state found and is pending application
        } else {
            throw new Error(serverResult.message || "Failed to retrieve valid data_payload for map_id.");
        }
    } catch (error) {
        console.error(`Error loading state from server (map_id: ${mapId}):`, error);
        alert(`Could not load shared map state: ${error.message}`);
        // Clear bad query param to prevent re-attempt on refresh
        if (history.replaceState) {
            const url = new URL(window.location);
            url.searchParams.delete('map_id');
            history.replaceState(null, '', url.pathname + url.search + url.hash);
        }
        return false;
    }
}

// --- NEW FUNCTION (in SECTION 2) ---
// This function will be called AFTER the base map for the loaded system has rendered.
// SolarSystem.js - SECTION 2

function applyPendingLoadedState() {

    if (window.pendingLoadedState) {
   
      const loadedState = window.pendingLoadedState;
   
      console.log("Applying pending loaded state for system:", loadedState.systemName);
      console.log("Loaded State for Threat Analysis Check:", JSON.parse(JSON.stringify(loadedState.threatAnalysis)));

      if (!window.classSummaryTableBody) console.error("applyPendingLoadedState: classSummaryTableBody IS NULL");

        // PRIORITY 1: Restore UI input values
        const uiStateSrc = loadedState.ui || loadedState.threatAnalysis; 
        if (uiStateSrc) { 
            if (dscanOriginInput && uiStateSrc.dscanOriginLabel) {
                dscanOriginInput.value = uiStateSrc.dscanOriginLabel;
            }
            if (dscanRangeInput && uiStateSrc.dscanRangeAU) {
                dscanRangeInput.value = uiStateSrc.dscanRangeAU;
            }
        }
        
        // PRIORITY 2: Plotted Markers
        plottedMarkerData = {}; 
        scannerPosMarkerCounter = 0; 
        customMarkerCounter = 0;
        if (plottedMarkersTableBody) plottedMarkersTableBody.innerHTML = ''; 
        if (scanMarkersGroup) scanMarkersGroup.innerHTML = ''; 

        if (loadedState.plottedMarkers) {
            for (const markerId in loadedState.plottedMarkers) {
                const marker = loadedState.plottedMarkers[markerId];
                plottedMarkerData[markerId] = { ...marker }; 

                let svgX, svgZ;
                if (currentSystemScaleFactor && typeof currentSystemScaleFactor === 'number' && currentSystemScaleFactor !== 0) {
                    svgX = marker.x_km * currentSystemScaleFactor;
                    svgZ = marker.z_km * currentSystemScaleFactor;
                } else { 
                    console.warn("Invalid scale factor for marker:", markerId);
                    continue; 
                }
                
               if (marker.isDScanOrigin || (marker.isCustom && (marker.shape === 'dscan_area' || marker.shape === 'dscan_area_input' || marker.shape === 'dscan_area_fixed'))) { 
                // For any D-Scan area type marker, pass its saved range
                createAndPlotCustomMarker(markerId, marker.label, marker.shape, marker.color, svgX, svgZ, marker.dscanRangeAU); // <<< PASS SAVED RANGE
                if (marker.isDScanOrigin) {
                    currentActiveDScanOriginMarkerId = markerId; 
                    // Also ensure the main dscanOriginInput and dscanRangeInput UI fields are set 
                    // if this is the primary D-Scan origin being restored.
                    // This might need to happen after all markers are plotted, picking the last DSO.
                    if (dscanOriginInput) dscanOriginInput.value = marker.label;
                    if (dscanRangeInput && marker.dscanRangeAU) dscanRangeInput.value = marker.dscanRangeAU;
                }
            } else if (marker.isCustom && marker.shape) { 
                createAndPlotCustomMarker(markerId, marker.label, marker.shape, marker.color, svgX, svgZ); // No specific range for other custom types
            } else { // S-Marker (Trilaterated)
                plotSMarkerFromData(markerId, marker.label, svgX, svgZ);
            }
                addMarkerToTable(markerId, marker.label, marker.x_km, marker.z_km); // Ensure this is always called

                if (markerId.startsWith("scannerMarkerGroup_")) {
                    const num = parseInt(markerId.split("_")[1]);
                    if (!isNaN(num) && num > scannerPosMarkerCounter) scannerPosMarkerCounter = num;
                } else if (markerId.startsWith("customMarker_") || markerId.startsWith("dscanOriginMarker_")) {
                    const num = parseInt(markerId.split("_")[1]);
                    if (!isNaN(num) && num > customMarkerCounter) customMarkerCounter = num;
                }
            } // End for loop
        } // End if (loadedState.plottedMarkers)

        // PRIORITY 3: Probe Signatures and Links
        if (loadedState.probeSignatures) {
            parsedProbeSignatures = loadedState.probeSignatures.map(savedSig => {
                let linkedLabel = null;
                if (savedSig.mapMarkerId && plottedMarkerData[savedSig.mapMarkerId]) {
                    linkedLabel = plottedMarkerData[savedSig.mapMarkerId].label;
                }
                return {
                    ...savedSig, 
                    rangeKm: parseDistanceToKm(savedSig.rangeOriginalStr),
                    linkedMapMarkerLabel: linkedLabel 
                };
            }); // End map
            if (typeof displayParsedProbeSignatures === 'function') displayParsedProbeSignatures();
        } // End if (loadedState.probeSignatures)

        // PRIORITY 4: Restore Threat Analysis Display Data
         if (loadedState.threatAnalysis && loadedState.threatAnalysis.shipSummaryData) { 
            currentClassSummaryData = loadedState.threatAnalysis.classSummaryData || {};
            currentShipSummaryData = loadedState.threatAnalysis.shipSummaryData || [];
            currentUnlistedEntriesData = loadedState.threatAnalysis.unlistedEntriesData || {};

            console.log("Restored currentClassSummaryData:", currentClassSummaryData);
console.log("Restored currentShipSummaryData (first 3):", JSON.parse(JSON.stringify(currentShipSummaryData.slice(0,3))));
console.log("Restored currentUnlistedEntriesData:", currentUnlistedEntriesData);

            if (typeof displayThreatClassSummary === 'function') displayThreatClassSummary(currentClassSummaryData);
            if (typeof displayThreatShipSummary === 'function') displayThreatShipSummary(currentShipSummaryData);
            if (typeof displayUnlistedDScanEntries === 'function') displayUnlistedDScanEntries(localUnlistedEntries); // << CORRECT
            
            const dScanAnalysisTitleEl = document.getElementById('dScanAnalysisTitle');
            if(dScanAnalysisTitleEl && (Object.keys(currentClassSummaryData).length > 0 || currentShipSummaryData.length > 0)) {
                dScanAnalysisTitleEl.textContent = "D-Scan Threat Analysis (Restored)";
            }
        } // End if (loadedState.threatAnalysis)

        delete window.pendingLoadedState; 
        console.log("Pending loaded state applied.");

        if (history.replaceState) {
            history.replaceState(null, '', window.location.pathname + window.location.search);
        } else {
            window.location.hash = '';
        }
    } // End if (window.pendingLoadedState)
} // End of applyPendingLoadedState function



// Helper function to plot S-markers (extracted from handleTrilaterateSelected)
function plotSMarkerFromData(markerId, labelText, svgX, svgZ) {
    console.log(`Plotting S-Marker from data: ${markerId}, Label: ${labelText}`);
    const markerSizeViewBox = 7; // Should match what's in handleTrilaterateSelected

    const markerGroup = document.createElementNS(SVG_NS, "g");
    markerGroup.setAttribute("id", markerId);
    
    const cross = document.createElementNS(SVG_NS, "g"); 
    cross.classList.add("scanner-marker-cross");
    const line1 = document.createElementNS(SVG_NS, "line");
    line1.setAttribute("x1", (-markerSizeViewBox).toString()); line1.setAttribute("y1", "0");
    line1.setAttribute("x2", markerSizeViewBox.toString());  line1.setAttribute("y2", "0");
    cross.appendChild(line1);
    const line2 = document.createElementNS(SVG_NS, "line");
    line2.setAttribute("x1", "0"); line2.setAttribute("y1", (-markerSizeViewBox).toString());
    line2.setAttribute("x2", "0"); line2.setAttribute("y2", markerSizeViewBox.toString());
    cross.appendChild(line2);
    
    const label = document.createElementNS(SVG_NS, "text");
    const labelOffsetX = markerSizeViewBox + 5;
    const labelOffsetY = 0;
    label.setAttribute("x", labelOffsetX.toString()); 
    label.setAttribute("y", labelOffsetY.toString());    
    label.classList.add("scanner-marker-label"); 
    label.textContent = labelText;
    label.style.cursor = "pointer";
    // The initialDefaultLabel for S-markers when loading from state is simply labelText
    label.addEventListener('click', (e) => handleMarkerLabelClick(e, markerId, labelText)); 
    // Add counter-rotation if needed:
    // if (mapRotationAngle === 180) label.setAttribute("transform", `rotate(180, ${labelOffsetX}, ${labelOffsetY})`);
    
    markerGroup.appendChild(cross); 
    markerGroup.appendChild(label);
    markerGroup.setAttribute('transform', `translate(${svgX}, ${svgZ})`);

    if (scanMarkersGroup) {
        scanMarkersGroup.appendChild(markerGroup);
    } else {
        console.error("plotSMarkerFromData: scanMarkersGroup not found when trying to append S-marker.");
        return; // Cannot proceed if this critical group is missing
    }
    
    if (typeof makeMarkerDraggable === 'function') {
       makeMarkerDraggable(cross, markerGroup); 
    } else {
        console.error("plotSMarkerFromData: makeMarkerDraggable function not defined.");
    }
}

  // --- SECTION 3: Event Listener Attachments ---

  if (svgElement) {
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
      selectedDragTarget.setAttribute(
        "transform",
        `translate(${newX}, ${newY})`
      );
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
        "--- SVG CLICK --- AddCustom:",
        isAddingCustomMarkerMode,
        "SetDScanOrigin:",
        isSettingDScanOrigin,
        "Target:",
        e.target.tagName
      );

      // Helper to check if click was on an existing interactive marker part
      function isClickOnExistingInteractiveMarker(targetElement) {
        return (
          targetElement.closest(".celestial-body-svg") ||
          targetElement.closest(".scanner-marker-cross") ||
          targetElement.closest(".scanner-marker-label") ||
          targetElement.closest(".custom-marker-shape") ||
          targetElement.closest(".custom-marker-label")
        );
      }

      // --- HANDLE "SET D-SCAN ORIGIN" MODE ---
      if (isSettingDScanOrigin) {
        console.log("SVG Click: In 'Set D-Scan Origin' mode.");

        // Prevent placing on an existing interactive element
        if (
          e.target !== svgElement &&
          e.target.tagName !== "svg" &&
          isClickOnExistingInteractiveMarker(e.target)
        ) {
          console.log(
            "D-Scan Origin Placement: Click was on an existing interactive element, not placing."
          );
          // Do not reset mode here, let user try clicking elsewhere or cancel via a button if one is added for this mode
          return;
        }

        const CTM = svgElement.getScreenCTM()?.inverse();
        if (!CTM) {
          console.error("SVG CTM not available for D-Scan origin.");
          resetAllPlacementModes(); // Exit mode if CTM fails
          return;
        }
        const svgPoint = svgElement.createSVGPoint();
        svgPoint.x = e.clientX;
        svgPoint.y = e.clientY;
        const mapClickCoords = svgPoint.matrixTransform(CTM);

        const dscanOriginLabel = prompt(
          "Enter label for this D-Scan Origin (e.g., Perch Alpha):",
          `DSO-${customMarkerCounter + 1}`
        );

        if (dscanOriginLabel !== null) {
          // User clicked OK
          // Remove previous D-Scan Origin marker if it exists
          if (currentActiveDScanOriginMarkerId) {
            const oldMarkerEl = document.getElementById(
              currentActiveDScanOriginMarkerId
            );
            if (oldMarkerEl) oldMarkerEl.remove();
            if (plottedMarkerData[currentActiveDScanOriginMarkerId]) {
              const oldRow = plottedMarkersTableBody.querySelector(
                `tr[data-marker-id="${currentActiveDScanOriginMarkerId}"]`
              );
              if (oldRow) oldRow.remove();
              delete plottedMarkerData[currentActiveDScanOriginMarkerId];
            }
          }

          customMarkerCounter++; // Use the general custom marker counter
          const markerId = `dscanOriginMarker_${customMarkerCounter}`; // Specific prefix
          currentActiveDScanOriginMarkerId = markerId;

          if (
            typeof currentSystemScaleFactor !== "number" ||
            currentSystemScaleFactor === 0 ||
            isNaN(currentSystemScaleFactor)
          ) {
            alert("Map scale factor error. Cannot place D-Scan origin marker.");
            currentActiveDScanOriginMarkerId = null; // Clear if placement failed
            resetAllPlacementModes();
            return;
          }
          const kmX = mapClickCoords.x / currentSystemScaleFactor;
          const kmZ = mapClickCoords.y / currentSystemScaleFactor;
          const dscanRangeAUVal = parseFloat(dscanRangeInput?.value) || 14.3;
                   

          plottedMarkerData[markerId] = {
            label: dscanOriginLabel.trim() || `DSO-${customMarkerCounter}`,
            x_km: kmX,
            z_km: kmZ,
            notes: `D-Scan Origin, Range: ${dscanRangeAUVal.toFixed(1)} AU`,
            isCustom: true,
            isDScanOrigin: true,
            shape: "dscan_area",
            color: "orange",
            dscanRangeAU: dscanRangeAUVal // Predefined for D-Scan origin
          };

          createAndPlotCustomMarker(
            markerId,
            plottedMarkerData[markerId].label,
            "dscan_area",
            "orange",
            mapClickCoords.x,
            mapClickCoords.y
          );
          addMarkerToTable(
            markerId,
            plottedMarkerData[markerId].label,
            kmX,
            kmZ
          );
          if (dscanOriginInput)
            dscanOriginInput.value = plottedMarkerData[markerId].label;
          console.log(
            `D-Scan Origin marker "${plottedMarkerData[markerId].label}" placed.`
          );
        } else {
          console.log("D-Scan Origin label prompt cancelled by user.");
        }
        resetAllPlacementModes(); // Exit "Set D-Scan Origin" mode after one placement attempt (OK or Cancel on prompt)

        // --- HANDLE GENERAL "ADD CUSTOM MARKER" MODE ---
      } else if (isAddingCustomMarkerMode) {
        console.log("SVG Click: In general 'Add Custom Marker' mode.");
        if (
          e.target !== svgElement &&
          e.target.tagName !== "svg" &&
          isClickOnExistingInteractiveMarker(e.target)
        ) {
          console.log(
            "General Custom Marker: Clicked on an existing interactive element, not placing."
          );
          // Do not reset mode here, let user try clicking elsewhere or use the cancel button
          return;
        }

        const CTM = svgElement.getScreenCTM()?.inverse();
        if (!CTM) {
          console.error("SVG CTM not available for custom marker.");
          resetAllPlacementModes();
          return;
        }
        const svgPoint = svgElement.createSVGPoint();
        svgPoint.x = e.clientX;
        svgPoint.y = e.clientY;
        const mapClickCoords = svgPoint.matrixTransform(CTM);

        const selectedShape = markerShapeSelect
          ? markerShapeSelect.value
          : "circle";
        const selectedColor = markerColorSelect
          ? markerColorSelect.value
          : "red";
        const markerLabelText = prompt(
          `Enter label for this ${selectedShape} marker:`,
          `Custom ${customMarkerCounter + 1}`
        );

        if (markerLabelText !== null) {
          // User clicked OK
          customMarkerCounter++;
          const markerId = `customMarker_${customMarkerCounter}`;
          if (
            typeof currentSystemScaleFactor !== "number" ||
            currentSystemScaleFactor === 0 ||
            isNaN(currentSystemScaleFactor)
          ) {
            alert("Map scale factor error. Cannot place custom marker.");
            customMarkerCounter--; // Decrement as placement failed
            resetAllPlacementModes();
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
            isDScanOrigin: false, // Mark as not a D-Scan origin
            dscanRangeAU: (selectedShape === "dscan_area" || selectedShape === "dscan_area_fixed") ? 
                      (selectedShape === "dscan_area_fixed" ? 14.3 : (parseFloat(dscanRangeInput?.value) || 14.3)) 
                      : undefined // <<< SAVE ITS SPECIFIC RANGE
          };

          createAndPlotCustomMarker(
            markerId,
            plottedMarkerData[markerId].label,
            selectedShape,
            selectedColor,
            mapClickCoords.x,
            mapClickCoords.y
          );
          addMarkerToTable(
            markerId,
            plottedMarkerData[markerId].label,
            kmX,
            kmZ
          );
          console.log(
            `General Custom marker "${plottedMarkerData[markerId].label}" placed.`
          );
        } else {
          console.log("General Custom marker label prompt cancelled by user.");
        }
        resetAllPlacementModes(); // Exit general "Add Custom Marker" mode after one placement attempt
      }
      // No other global click actions if not in a placement mode
    });
  } else {
    console.error(
      "CRITICAL: svgElement not found, global click listener for marker placement cannot be attached."
    );
  }

  /* --- Save State Event Listener ---- */
if (saveStateToUrlButton && typeof saveAppStateToUrl === 'function') {
    saveStateToUrlButton.addEventListener('click', saveAppStateToUrl);
} else {
    console.error("saveStateToUrlButton or its handler not found/defined.");
}
  


  console.log("Event listeners attached.");

  // Lets create a event listener for Analyse Current D-Scan Button

  // --- SECTION 3: Event Listener Attachments ---
  // ... (your existing listeners for loadSystemButton, parseScanButton, etc.) ...

  const analyseThreatButton = document.getElementById("analyseThreatButton");
  if (analyseThreatButton && typeof handleAnalyseDScanThreats === "function") {
    analyseThreatButton.addEventListener("click", handleAnalyseDScanThreats);
  } else {
    if (!analyseThreatButton)
      console.error(
        "analyseThreatButton element not found for event listener."
      );
    if (typeof handleAnalyseDScanThreats !== "function")
      console.error(
        "handleAnalyseDScanThreats function is not defined for event listener."
      );
  }

  // -------- End of Event Listeners -----
  console.log("Attaching event listeners...");
  // System Load
  if (loadSystemButton) {
    loadSystemButton.addEventListener("click", () => {
      const systemIdentifier = systemIdInput
        ? systemIdInput.value.trim()
        : null;
      if (systemIdentifier && typeof fetchAndRenderSystem === "function") {
        fetchAndRenderSystem(systemIdentifier);
      } else if (!systemIdentifier) {
        alert("Please enter a System Name or ID.");
      } else {
        console.error("fetchAndRenderSystem is not defined.");
      }
    });
  } else {
    console.error("loadSystemButton not found");
  }

  // D-Scan Trilateration Flow
  if (
    parseScanButton &&
    typeof handleParseScanAndPrepareSelection === "function"
  ) {
    parseScanButton.addEventListener(
      "click",
      handleParseScanAndPrepareSelection
    );
  } else {
    console.error("parseScanButton or its handler not found/defined");
  }

  if (
    trilaterateSelectedButton &&
    typeof handleTrilaterateSelected === "function"
  ) {
    trilaterateSelectedButton.addEventListener(
      "click",
      handleTrilaterateSelected
    );
  } else {
    console.error("trilaterateSelectedButton or its handler not found/defined");
  }

  // Event Listener Attachments (add for new modal buttons)

  if (modalTrilaterateButton)
    modalTrilaterateButton.addEventListener("click", handleModalTrilaterate);
  if (modalCancelButton)
    modalCancelButton.addEventListener("click", handleModalCancel);

  // Probe Scan Flow
  if (parseProbeDataButton && typeof handleParseProbeData === "function") {
    parseProbeDataButton.addEventListener("click", handleParseProbeData);
  } else {
    console.error("parseProbeDataButton or its handler not found/defined");
  }

  // Other Controls
  if (
    toggleSignatureZonesButton &&
    typeof toggleSignatureZones === "function"
  ) {
    toggleSignatureZonesButton.addEventListener("click", toggleSignatureZones);
  } else {
    console.error(
      "toggleSignatureZonesButton or its handler not found/defined"
    );
  }

  if (clearScanDataButton && typeof handleClearScanText === "function") {
    clearScanDataButton.addEventListener("click", handleClearScanText);
  } else {
    console.error("clearScanDataButton or its handler not found/defined");
  }

  if (clearMarkersButton && typeof handleClearMarkers === "function") {
    clearMarkersButton.addEventListener("click", handleClearMarkers);
  } else {
    console.error("clearMarkersButton or its handler not found/defined");
  }

  // Custom Marker Controls Event Listeners
  if (prepareCustomMarkerButton && customMarkerControlsDiv) {
    prepareCustomMarkerButton.addEventListener("click", () => {
      isAddingCustomMarkerMode = true; // Enter general custom marker mode
      isSettingDScanOrigin = false; // Ensure NOT in D-Scan origin mode
      console.log(
        "Prepare Custom Marker: isAddingCustomMarkerMode=true, isSettingDScanOrigin=false"
      );

      customMarkerControlsDiv.style.display = "flex";
      if (markerShapeSelect && markerShapeSelect.value === "dscan_area") {
        // If dscan_area is still selected
        markerShapeSelect.value = "circle"; // Default to circle for general custom markers
        console.log(
          "Shape selector defaulted to 'circle' for general custom marker."
        );
      } else if (markerShapeSelect && !markerShapeSelect.value) {
        // If nothing selected (e.g. placeholder)
        markerShapeSelect.value = "circle";
        console.log("Shape selector defaulted to 'circle' (was empty).");
      }

      if (customMarkerInstructions)
        customMarkerInstructions.textContent =
          "Select shape & color, then CLICK ON MAP to place. You'll be prompted for a label.";

      // Disable other major action buttons
      if (parseScanButton) parseScanButton.disabled = true;
      if (trilaterateSelectedButton) trilaterateSelectedButton.disabled = true;
      if (parseProbeDataButton) parseProbeDataButton.disabled = true;
      if (setDscanOriginButton) setDscanOriginButton.disabled = true; // Can't set origin while adding general marker
    });
  } else {
    console.error(
      "prepareCustomMarkerButton or customMarkerControlsDiv not found/defined for custom markers."
    );
  }

  if (cancelCustomMarkerButton && customMarkerControlsDiv) {
    cancelCustomMarkerButton.addEventListener("click", () => {
      isAddingCustomMarkerMode = false;
      console.log(
        "cancelCustomMarkerButton clicked: isAddingCustomMarkerMode set to false"
      );
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
    });
  } else {
    console.error(
      "cancelCustomMarkerButton or customMarkerControlsDiv not found/defined for custom markers."
    );
  }

  // In SECTION 3: Event Listener Attachments
  if (
    toggleDScanRangeRingsButton &&
    typeof toggleDScanRangeRings === "function"
  ) {
    toggleDScanRangeRingsButton.addEventListener(
      "click",
      toggleDScanRangeRings
    );
  } else {
    console.error(
      "toggleDScanRangeRingsButton or its handler not found/defined."
    );
  }

  if (manualRangeEntryButton) {
    manualRangeEntryButton.addEventListener("click", openManualRangeEntryModal);
  }
  if (generateDScanFromManualRangesButton) {
    generateDScanFromManualRangesButton.addEventListener(
      "click",
      handleGenerateDScanFromManualRanges
    );
  }
  if (cancelManualRangeButton) {
    cancelManualRangeButton.addEventListener("click", () => {
      if (manualRangeModal) manualRangeModal.style.display = "none";
    });
  }

  /* --- Set D-Scan Origin Button --- -*/
  if (setDscanOriginButton) {
    setDscanOriginButton.addEventListener("click", () => {
      isSettingDScanOrigin = true;
      isAddingCustomMarkerMode = false; // Ensure not in general custom marker mode
      // Optionally disable other buttons
      if (parseScanButton) parseScanButton.disabled = true;
      if (trilaterateSelectedButton) trilaterateSelectedButton.disabled = true;
      if (parseProbeDataButton) parseProbeDataButton.disabled = true;
      if (prepareCustomMarkerButton) prepareCustomMarkerButton.disabled = true;

      // Update UI to indicate mode
      setDscanOriginButton.textContent = "Click Map to Place Origin...";
      setDscanOriginButton.disabled = true; // Disable until placement or cancel
      if (customMarkerInstructions)
        customMarkerInstructions.textContent =
          "Click on the map to set D-Scan origin."; // If using this element
      console.log("Entered 'Set D-Scan Origin' mode.");
    });
  }

  if (cancelCustomMarkerButton && customMarkerControlsDiv) {
    cancelCustomMarkerButton.addEventListener("click", () => {
      console.log("Cancel Custom Marker button clicked.");
      resetAllPlacementModes(); // Use the central reset function
    });
  }

  console.log("Event listeners attached.");

  // --- SECTION 4: Initial Render Call ---
  // --- INITIAL RENDER CALL ---
// --- SECTION 4: Initial Application Initialization ---
async function initializeApp() {
    console.log("Initializing application...");
    await loadShipData(); 
    console.log("Ship data loading attempted.");

    let systemNameToLoad = "J121116"; // Default system
    let stateSuccessfullyPrepared = false; 
    window.pendingLoadedState = null; // Ensure it's null initially

    const urlParams = new URLSearchParams(window.location.search);
    const mapIdFromQuery = urlParams.get('map_id');

    if (mapIdFromQuery) {
        // Priority 1: Try to load from short URL (map_id)
        stateSuccessfullyPrepared = await fetchAndApplyStateFromServer(mapIdFromQuery);
        if (stateSuccessfullyPrepared && window.pendingLoadedState && window.pendingLoadedState.systemName) {
            systemNameToLoad = window.pendingLoadedState.systemName;
            console.log(`State from ?map_id=${mapIdFromQuery} will be applied for system: ${systemNameToLoad}`);
        } else {
            console.warn(`Failed to load state for ?map_id=${mapIdFromQuery}. Will try #state hash or default.`);
            // Clear the bad map_id from URL so it doesn't retry on refresh
             if (history.replaceState) {
                const url = new URL(window.location);
                url.searchParams.delete('map_id');
                history.replaceState(null, '', url.pathname + url.search + url.hash);
            }
        }
    }
    
    // Priority 2: If no map_id or it failed, try loading from old #state= hash
    if (!stateSuccessfullyPrepared) { 
        stateSuccessfullyPrepared = loadAppStateFromUrl(); // This sets window.pendingLoadedState
        if (stateSuccessfullyPrepared && window.pendingLoadedState && window.pendingLoadedState.systemName) {
            systemNameToLoad = window.pendingLoadedState.systemName;
            console.log(`State from #state hash will be applied for system: ${systemNameToLoad}`);
        }
    }

    if (!stateSuccessfullyPrepared) {
        console.log("No valid state found in URL. Loading default system:", systemNameToLoad);
    }
    
    // Fetch and render the determined system
    if (typeof fetchAndRenderSystem === 'function') {
        await fetchAndRenderSystem(systemNameToLoad.toUpperCase()); // Ensure system name is consistent case
        console.log(`Base map for ${systemNameToLoad} should be rendered.`);

        // If state was prepared (from either short URL or hash), apply it now
        if (stateSuccessfullyPrepared && window.pendingLoadedState && typeof applyPendingLoadedState === 'function') {
            applyPendingLoadedState();
        } else if (stateSuccessfullyPrepared) {
            console.error("applyPendingLoadedState function is not defined. Cannot apply saved state.");
        }
    } else { 
        console.error("fetchAndRenderSystem function is not defined! Initial map cannot be drawn.");
    }
    
    console.log("Application initialization sequence complete.");
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

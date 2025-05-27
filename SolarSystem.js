// SolarSystem.js
document.addEventListener('DOMContentLoaded', () => {

    // --- SECTION 1: Data, Constants, and Global Variables ---
    const rawSystemData = [
        { Id: 40433639, itemName: "J121116 - Star", X: 0, Y: 0, Z: 0, Orbits: null, Represenatation: "Yellow Circle" },
        { Id: 40433640, itemName: "J121116 I", X: -30855600, Y: -364501, Z: 27658700, Orbits: 40433639, Represenatation: "Brown Circle" },
        { Id: 40433641, itemName: "J121116 II", X: -95573100, Y: -30699800, Z: 22094000, Orbits: 40433639, Represenatation: "Red Circle" },
        { Id: 40433642, itemName: "J121116 III", X: 70706800, Y: 1950020, Z: -147544000, Orbits: 40433639, Represenatation: "Brown Circle" },
        { Id: 40433643, itemName: "J121116 IV", X: 206007000, Y: 12686400, Z: -23773100, Orbits: 40433639, Represenatation: "Brown Circle" },
        { Id: 40433644, itemName: "J121116 V", X: -215713000, Y: -592163, Z: -175902000, Orbits: 40433639, Represenatation: "Dark Grey Circle" },
        { Id: 40433645, itemName: "J121116 VI", X: -419769000, Y: -5545450, Z: 264383000, Orbits: 40433639, Represenatation: "Olive Circle" },
        { Id: 40433646, itemName: "J121116 VI - Moon 1", X: -420473000, Y: -5545460, Z: 263532000, Orbits: 40433645, Represenatation: "Pale Grey Circle" },
        { Id: 40433647, itemName: "J121116 VII", X: 331404000, Y: 581067, Z: 791201000, Orbits: 40433639, Represenatation: "Olive Circle" },
        { Id: 40433648, itemName: "J121116 VII - Moon 1", X: 331068000, Y: 581065, Z: 791187000, Orbits: 40433647, Represenatation: "Pale Grey Circle" },
        { Id: 40433649, itemName: "J121116 VII - Moon 2", X: 332080000, Y: 581067, Z: 791459000, Orbits: 40433647, Represenatation: "Pale Grey Circle" },
        { Id: 40433650, itemName: "J121116 VIII", X: -1213930000, Y: -27593100, Z: -89328500, Orbits: 40433639, Represenatation: "Blue Circle" },
        { Id: 40433651, itemName: "J121116 VIII - Moon 1", X: -1214110000, Y: -27593100, Z: -89619300, Orbits: 40433650, Represenatation: "Pale Grey Circle" },
        { Id: 40433652, itemName: "J121116 VIII - Moon 2", X: -1212040000, Y: -27593100, Z: -89730700, Orbits: 40433650, Represenatation: "Pale Grey Circle" },
    ];

    const SVG_NS = "http://www.w3.org/2000/svg";
    const AU_KM = 149597870.7;
    const CEL_RADIUS_FACTOR = 0.05 * 0.25;
    const ORBIT_WIDTH_FACTOR = 0.0015;

    const svgElement = document.getElementById('solarSystemSVG');
    const infoBox = document.getElementById('infoBox');
    const scanDataInput = document.getElementById('scanDataInput'); // THE ONE Textarea
    const parseScanButton = document.getElementById('parseScanButton');
    const trilaterateSelectedButton = document.getElementById('trilaterateSelectedButton');
    const parseProbeDataButton = document.getElementById('parseProbeDataButton'); // Button for probe data
    const toggleSignatureZonesButton = document.getElementById('toggleSignatureZonesButton');
    const clearScanDataButton = document.getElementById('clearScanDataButton');
    const clearMarkersButton = document.getElementById('clearMarkersButton');
    const plottedMarkersTableBody = document.getElementById('plottedMarkersTableBody');
    const probeScanTableBody = document.getElementById('probeScanTableBody'); // <<< ENSURE THIS IS CORRECTLY REFERENCED
    const selectableCelestialsContainer = document.getElementById('selectableCelestialsContainer');
    const selectableCelestialsList = document.getElementById('selectableCelestialsList');
    const selectionCountSpan = document.getElementById('selectionCount');
    
    let baseOrbitsGroup, signatureZonesGroup, celestialBodiesGroup, scanMarkersGroup;
    let currentSystemScaleFactor = 1;
    let scannerPosMarkerCounter = 0;
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

    console.log("Script Start: DOM loaded, constants and DOM elements defined.");
    if (!probeScanTableBody) console.error("CRITICAL ERROR: probeScanTableBody element not found on script start!");


    // --- SECTION 2: ALL FUNCTION DEFINITIONS --- (Ensure all are complete)

    function safeParseFloat(value) {
        if (value === "None" || value === null || value === undefined || typeof value === 'string' && value.trim() === "") return NaN;
        const num = parseFloat(String(value).replace(/,/g, ''));
        return isNaN(num) ? NaN : num;
    }

    function transformRawDataToSystemFormat(data) {
        const cels = data.map(body => {
            let groupID;
            if (body.itemName.includes("Star")) groupID = 6;
            else if (body.itemName.includes("Moon")) groupID = 8;
            else if (body.Represenatation === "Structure") groupID = 10;
            else groupID = 7;
            let typeColor;
            switch (body.Represenatation) {
                case "Yellow Circle": typeColor = "#FFFF33"; break;
                case "Brown Circle": typeColor = "#A55A2A"; break;
                case "Red Circle": typeColor = "#FF4444"; break;
                case "Dark Grey Circle": typeColor = "#888888"; break;
                case "Olive Circle": typeColor = "#808030"; break;
                case "Pale Grey Circle": typeColor = "#CCCCCC"; break;
                case "Blue Circle": typeColor = "#6666FF"; break;
                case "Structure": typeColor = "#33FF33"; break;
                default: typeColor = "#FFFFFF";
            }
            const xVal = (typeof body.X === 'number') ? body.X : 0;
            const yVal = (typeof body.Y === 'number') ? body.Y : 0;
            const zVal = (typeof body.Z === 'number') ? body.Z : 0;
            return { itemName: body.itemName, groupID: groupID, typeColor: typeColor, map_x: xVal, map_y: zVal, originalData: body };
        });
        return { solarSystemName: "J121116", cels: cels };
    }
                    
    function calculateOrbitalProperties(objects) {
         objects.forEach(obj => {
            obj.map_x = obj.map_x !== undefined ? obj.map_x : (obj.originalData ? obj.originalData.X : 0);
            obj.map_y = obj.map_y !== undefined ? obj.map_y : (obj.originalData ? obj.originalData.Z : 0);
        });
    }

    function renderSystemSVG() {
        console.log("renderSystemSVG: Called");
        const systemObject = transformRawDataToSystemFormat(rawSystemData);
        calculateOrbitalProperties(systemObject.cels); 

        svgElement.innerHTML = ''; 

        baseOrbitsGroup = document.createElementNS(SVG_NS, "g"); 
        baseOrbitsGroup.setAttribute("id", "baseOrbitsGroup");
        svgElement.appendChild(baseOrbitsGroup);

        signatureZonesGroup = document.createElementNS(SVG_NS, "g"); 
        signatureZonesGroup.setAttribute("id", "signatureZonesGroup");
        signatureZonesGroup.style.display = 'none'; 
        svgElement.appendChild(signatureZonesGroup);

        celestialBodiesGroup = document.createElementNS(SVG_NS, "g"); 
        celestialBodiesGroup.setAttribute("id", "celestialBodiesGroup");
        svgElement.appendChild(celestialBodiesGroup);

        scanMarkersGroup = document.createElementNS(SVG_NS, "g"); 
        scanMarkersGroup.setAttribute("id", "scanMarkersGroup");
        svgElement.appendChild(scanMarkersGroup); 
        
        const viewSize = 600; const halfViewSize = viewSize / 2;
        svgElement.setAttribute("viewBox", `${-halfViewSize} ${-halfViewSize} ${viewSize} ${viewSize}`);
        let maxdist = 0;
        systemObject.cels.forEach(cel => { 
            if (cel.groupID === 7 || cel.groupID === 8 || cel.groupID === 10) { 
                const distSq = cel.map_x * cel.map_x + cel.map_y * cel.map_y; 
                if (distSq > maxdist) maxdist = distSq; 
            }
        });
        maxdist = Math.sqrt(maxdist); 
        if (maxdist === 0) {
            maxdist = AU_KM * (systemObject.cels.some(c => c.groupID === 6 && systemObject.cels.length === 1) ? 1 : 10);
        }

        currentSystemScaleFactor = (halfViewSize * (1 - (CEL_RADIUS_FACTOR * 3.0))) / maxdist; 
        const orbitStrokeWidthViewBox = ORBIT_WIDTH_FACTOR * viewSize; 
        
        const orbitsToDraw = []; const bodiesAndStructures = []; const stars = [];
        systemObject.cels.forEach(cel => { 
            if (cel.groupID === 7) { orbitsToDraw.push(cel); bodiesAndStructures.push(cel); } 
            else if (cel.groupID === 8 || cel.groupID === 10) { bodiesAndStructures.push(cel); } 
            else if (cel.groupID === 6) { stars.push(cel); } 
        });

        orbitsToDraw.forEach(cel => { 
            const orbit = document.createElementNS(SVG_NS, "circle"); 
            const orbitRadiusKm = Math.sqrt(cel.map_x * cel.map_x + cel.map_y * cel.map_y); 
            const orbitRadiusSVG = orbitRadiusKm * currentSystemScaleFactor;
            if (orbitRadiusSVG > 0) { 
                orbit.setAttribute("cx", "0"); orbit.setAttribute("cy", "0"); 
                orbit.setAttribute("r", orbitRadiusSVG.toString()); 
                orbit.setAttribute("fill", "none"); orbit.setAttribute("stroke", "rgba(255, 255, 255, 0.2)"); 
                orbit.setAttribute("stroke-width", orbitStrokeWidthViewBox.toString());
                baseOrbitsGroup.appendChild(orbit); 
            }
        });

        const sortedCelestialsToDraw = [...stars, ...bodiesAndStructures];
        sortedCelestialsToDraw.forEach(cel => {
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
            bodyShape.celestialData = cel; bodyShape.originalRadius = currentCelRadiusScaled;
            bodyShape.addEventListener("mouseover", handleBodyMouseOverSVG); 
            bodyShape.addEventListener("mouseout", handleBodyMouseOutSVG);
            celestialBodiesGroup.appendChild(bodyShape); 

            if (cel.groupID !== 6) { 
                const labelTextElement = document.createElementNS(SVG_NS, "text");
                let labelName = cel.itemName; 
                const nameParts = cel.itemName.split(' ');
                if (nameParts.length > 1) {
                    const lastPart = nameParts[nameParts.length - 1];
                    const secondLastPart = nameParts.length > 2 ? nameParts[nameParts.length - 2].toLowerCase() : "";
                    if (["I", "II", "III", "IV", "V", "VI", "VII", "VIII"].includes(lastPart.toUpperCase())) {
                        labelName = lastPart; 
                    } else if (secondLastPart === "moon" && !isNaN(parseInt(lastPart))) {
                        labelName = "M" + lastPart; 
                    } else if (!isNaN(parseInt(lastPart)) && cel.itemName.includes("Moon")) { 
                         labelName = "M" + lastPart;
                    }
                }
                const labelPlotX = bodyPlotX + currentCelRadiusScaled + (halfViewSize * 0.01);
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
    
    function formatDistanceKmToAu(km) { if (km === undefined) return "N/A"; if (km === 0) return "0 AU"; return (km / AU_KM).toFixed(2) + " AU"; }
    function formatNumber(num) { if (num === undefined) return "N/A"; if (num === 0) return "0"; const absNum = Math.abs(num); const sign = num < 0 ? "-" : ""; if (absNum >= 1e12) return sign + (absNum / 1e12).toFixed(1) + " Tkm"; if (absNum >= 1e9) return sign + (absNum / 1e9).toFixed(1) + " Bkm"; if (absNum >= 1e6) return sign + (absNum / 1e6).toFixed(1) + " Mkm"; if (absNum >= 1e3) return sign + (absNum / 1e3).toFixed(0) + " kkm"; return sign + absNum.toFixed(0) + " km"; }
    
    function handleBodyMouseOverSVG(event) {
        const celData = event.target.celestialData; if (!celData) return; const original = celData.originalData;
        let distKm;
        if (celData.groupID === 6) { distKm = 0; }
        else { distKm = Math.sqrt(celData.map_x * celData.map_x + celData.map_y * celData.map_y); }
        infoBox.innerHTML = `<strong>${celData.itemName}</strong><br>Dist (X-Z): ${formatDistanceKmToAu(distKm)}<br>Map X (orig X): ${formatNumber(celData.map_x)}<br>Map Y (orig Z): ${formatNumber(celData.map_y)}<br>Original Y-coord: ${formatNumber(original.Y)}`;
        infoBox.classList.add("visible"); event.target.setAttribute("r", (event.target.originalRadius * 1.5).toString());
    }
    function handleBodyMouseMoveSVG(event) { /* This function is not currently used due to fixed infobox */ }
    function handleBodyMouseOutSVG(event) { infoBox.classList.remove("visible"); event.target.setAttribute("r", event.target.originalRadius.toString()); }

    function parseDistanceToKm(distanceStr) {
        if (distanceStr === "-" || !distanceStr) return NaN;
        let distanceKmValue;
        const val = safeParseFloat(distanceStr);
        if (isNaN(val)) return NaN;
        if (distanceStr.toLowerCase().includes("au")) { distanceKmValue = val * AU_KM; }
        else if (distanceStr.toLowerCase().includes("km")) { distanceKmValue = val; }
        else { distanceKmValue = val / 1000; }
        return isNaN(distanceKmValue) ? NaN : distanceKmValue;
    }

    function parseScanLinesForTrilateration(scanText) {
        const lines = scanText.split('\n'); const knownPoints = [];
        lines.forEach(line => {
            const parts = line.split('\t'); if (parts.length < 4) return;
            const itemName = parts[1].trim(); const distanceStr = parts[3].trim();
            const distanceKm = parseDistanceToKm(distanceStr);
            if (itemName && !isNaN(distanceKm)) {
                const celestial = rawSystemData.find(c => c.itemName === itemName);
                if (celestial) {
                    knownPoints.push({ x: celestial.X, y: celestial.Z, d: distanceKm, name: celestial.itemName });
                }
            }
        });
        return knownPoints;
    }

    function trilaterate2D(p1, p2, p3) {
        let ex_x = p2.x - p1.x; let ex_y = p2.y - p1.y;
        const d_12 = Math.sqrt(ex_x * ex_x + ex_y * ex_y);
        if (d_12 === 0) { console.error("Trilateration Error: P1 and P2 are coincident."); return null; }
        ex_x /= d_12; ex_y /= d_12;
        const i_vec_x = p3.x - p1.x; const i_vec_y = p3.y - p1.y;
        const i = ex_x * i_vec_x + ex_y * i_vec_y;
        let ey_x = i_vec_x - i * ex_x; let ey_y = i_vec_y - i * ex_y;
        const d_13_projection_onto_ey = Math.sqrt(ey_x * ey_x + ey_y * ey_y);
        if (Math.abs(d_13_projection_onto_ey) < 1e-6) {
            console.error("Trilateration Error: P1,P2,P3 appear to be collinear or P3 is too close to the P1-P2 line.");
            return null;
        }
        ey_x /= d_13_projection_onto_ey; ey_y /= d_13_projection_onto_ey;
        const j = ey_x * i_vec_x + ey_y * i_vec_y;
        if (Math.abs(j) < 1e-6) {
            console.error("Trilateration Error: Calculated j is zero, indicates collinearity or problem with ey vector (P3 might be on line P1-P2).");
            return null;
        }
        const x_prime = (p1.d * p1.d - p2.d * p2.d + d_12 * d_12) / (2 * d_12);
        const y_prime = (p1.d * p1.d - p3.d * p3.d + i * i + j * j - 2 * i * x_prime) / (2 * j);
        const final_scanner_x = p1.x + x_prime * ex_x + y_prime * ey_x;
        const final_scanner_z = p1.y + x_prime * ex_y + y_prime * ey_y;
        return { x: final_scanner_x, z: final_scanner_z };
    }

    function makeMarkerDraggable(elementToDrag, groupToActuallyTransform) {
        elementToDrag.style.cursor = 'move';
        elementToDrag.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            let target = e.target;
            while (target && target !== svgElement) {
                if (target.classList && target.classList.contains('scanner-marker-label')) { return; }
                target = target.parentNode;
            }
            selectedDragTarget = groupToActuallyTransform;
            dragInitiator = elementToDrag;
            isDraggingMarker = true;
            const existingTransform = selectedDragTarget.transform.baseVal.consolidate();
            let initialTranslateX = 0; let initialTranslateY = 0;
            if (existingTransform) { initialTranslateX = existingTransform.matrix.e; initialTranslateY = existingTransform.matrix.f; }
            const CTM = svgElement.getScreenCTM();
            const svgPoint = svgElement.createSVGPoint();
            svgPoint.x = e.clientX; svgPoint.y = e.clientY;
            const svgClickCoords = svgPoint.matrixTransform(CTM.inverse());
            offset.x = svgClickCoords.x - initialTranslateX;
            offset.y = svgClickCoords.y - initialTranslateY;
            e.preventDefault();
        });
    }

    svgElement.addEventListener('mousemove', (e) => {
        if (!isDraggingMarker || !selectedDragTarget) return;
        e.preventDefault();
        const CTM = svgElement.getScreenCTM();
        const svgPoint = svgElement.createSVGPoint();
        svgPoint.x = e.clientX; svgPoint.y = e.clientY;
        const svgDragCoords = svgPoint.matrixTransform(CTM.inverse());
        let newX = svgDragCoords.x - offset.x;
        let newY = svgDragCoords.y - offset.y;
        selectedDragTarget.setAttribute('transform', `translate(${newX}, ${newY})`);
        const markerId = selectedDragTarget.id;
        if (plottedMarkerData[markerId] && currentSystemScaleFactor !== 0 && typeof currentSystemScaleFactor === 'number') {
            const newKmX = newX / currentSystemScaleFactor;
            const newKmZ = newY / currentSystemScaleFactor;
            plottedMarkerData[markerId].x_km = newKmX;
            plottedMarkerData[markerId].z_km = newKmZ;
            updateMarkerInTable(markerId, { x_km: newKmX, z_km: newKmZ });
        }
    });
    svgElement.addEventListener('mouseup', (e) => {
        if (isDraggingMarker) { isDraggingMarker = false; selectedDragTarget = null; dragInitiator = null; }
    });
    svgElement.addEventListener('mouseleave', (e) => {
        if (isDraggingMarker) { isDraggingMarker = false; selectedDragTarget = null; dragInitiator = null; }
    });

    function addMarkerToTable(markerId, labelText, posX_km, posZ_km) {
        if (!plottedMarkersTableBody) { console.error("addMarkerToTable: plottedMarkersTableBody is null"); return; }
        const row = plottedMarkersTableBody.insertRow();
        row.setAttribute('data-marker-id', markerId);

        const cellLabel = row.insertCell();
        cellLabel.textContent = labelText;

        const cellNotes = row.insertCell();
        const notesInput = document.createElement('input');
        notesInput.type = 'text';
        notesInput.placeholder = 'Enter notes...';
        notesInput.className = 'notes-input';
        notesInput.value = plottedMarkerData[markerId]?.notes || '';
        notesInput.addEventListener('change', (e) => {
            if (plottedMarkerData[markerId]) {
                plottedMarkerData[markerId].notes = e.target.value;
            }
        });
        cellNotes.appendChild(notesInput);

        const cellX = row.insertCell();
        cellX.textContent = (posX_km / AU_KM).toFixed(2);

        const cellZ = row.insertCell();
        cellZ.textContent = (posZ_km / AU_KM).toFixed(2);

        const cellActions = row.insertCell();
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Del';
        deleteButton.className = 'delete-marker-button';
        deleteButton.onclick = function() {
            const markerOnMap = document.getElementById(markerId);
            if (markerOnMap) markerOnMap.remove();
            row.remove();
            delete plottedMarkerData[markerId];
            const probeSigIndex = parsedProbeSignatures.findIndex(sig => sig.mapMarkerId === markerId);
            if (probeSigIndex > -1) {
                parsedProbeSignatures[probeSigIndex].linkedMapMarkerLabel = null;
                parsedProbeSignatures[probeSigIndex].mapMarkerId = null;
                displayParsedProbeSignatures();
            }
        };
        cellActions.appendChild(deleteButton);
    }

    function updateMarkerInTable(markerId, updates) {
        if (!plottedMarkersTableBody) { console.error("updateMarkerInTable: plottedMarkersTableBody is null"); return;}
        const row = plottedMarkersTableBody.querySelector(`tr[data-marker-id="${markerId}"]`);
        if (!row) return;
        if (updates.label !== undefined) { row.cells[0].textContent = updates.label; }
        if (updates.notes !== undefined && row.cells[1].firstChild && row.cells[1].firstChild.value !== updates.notes) {
            row.cells[1].firstChild.value = updates.notes;
        }
        if (updates.x_km !== undefined) { row.cells[2].textContent = (updates.x_km / AU_KM).toFixed(2); }
        if (updates.z_km !== undefined) { row.cells[3].textContent = (updates.z_km / AU_KM).toFixed(2); }
    }
    
    function displaySelectableCelestials() {
        if (!selectableCelestialsList || !selectableCelestialsContainer || !selectionCountSpan) return;
        selectableCelestialsList.innerHTML = '';
        selectedReferencePoints = [];
        updateSelectionCountAndButton();

        if (!knownPointsFromCurrentScan || knownPointsFromCurrentScan.length === 0) {
            selectableCelestialsList.innerHTML = "<p style='color: #888;'>No known celestials with distances found in scan data.</p>";
            selectableCelestialsContainer.style.display = 'block';
            return;
        }
        if (knownPointsFromCurrentScan.length < 3) {
            selectableCelestialsList.innerHTML = `<p style='color: #ff8888;'>Need at least 3 known celestials with distances for trilateration. Found ${knownPointsFromCurrentScan.length}.</p>`;
            selectableCelestialsContainer.style.display = 'block';
            return;
        }
        knownPointsFromCurrentScan.forEach((point, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('celestial-item');
            itemDiv.textContent = `${point.name} (${(point.d / AU_KM).toFixed(2)} AU)`;
            itemDiv.dataset.pointIndex = index.toString();

            itemDiv.addEventListener('click', () => {
                const alreadySelected = itemDiv.classList.contains('selected');
                if (alreadySelected) {
                    itemDiv.classList.remove('selected');
                    selectedReferencePoints = selectedReferencePoints.filter(p => p.name !== point.name);
                } else {
                    if (selectedReferencePoints.length < 3) {
                        itemDiv.classList.add('selected');
                        selectedReferencePoints.push(point);
                    } else { alert("You can only select up to 3 reference points."); }
                }
                updateSelectionCountAndButton();
            });
            selectableCelestialsList.appendChild(itemDiv);
        });
        selectableCelestialsContainer.style.display = 'block';
    }

    function updateSelectionCountAndButton() {
        if (!selectionCountSpan || !trilaterateSelectedButton) return;
        const count = selectedReferencePoints.length;
        selectionCountSpan.textContent = `(${count}/3)`;
        if (count === 3) {
            trilaterateSelectedButton.style.display = 'block';
            trilaterateSelectedButton.disabled = false;
        } else {
            trilaterateSelectedButton.style.display = 'none';
            trilaterateSelectedButton.disabled = true;
        }
    }

    function handleParseScanAndPrepareSelection() {
        console.log("handleParseScanAndPrepareSelection called");
        if (!scanDataInput || !selectableCelestialsContainer || !trilaterateSelectedButton) {
            console.error("Required UI elements for parsing D-scan selection not found."); return;
        }
        const scanText = scanDataInput.value;
        if (!scanText.trim()) {
            alert("Paste D-Scan data into the text area.");
            selectableCelestialsContainer.style.display = 'none';
            trilaterateSelectedButton.style.display = 'none';
            return;
        }
        knownPointsFromCurrentScan = parseScanLinesForTrilateration(scanText);
        displaySelectableCelestials();
    }
    
    function handleTrilaterateSelected() {
        if (selectedReferencePoints.length !== 3) {
            alert("Please select exactly 3 reference points from the list."); return;
        }
        console.log("Using user-selected points for trilateration:", selectedReferencePoints);
        const p1 = selectedReferencePoints[0]; const p2 = selectedReferencePoints[1]; const p3 = selectedReferencePoints[2];
        if ( (Math.abs(p1.x - p2.x) < 1e-3 && Math.abs(p1.y - p2.y) < 1e-3) ||
             (Math.abs(p1.x - p3.x) < 1e-3 && Math.abs(p1.y - p3.y) < 1e-3) ||
             (Math.abs(p2.x - p3.x) < 1e-3 && Math.abs(p2.y - p3.y) < 1e-3) ) {
            alert("Trilateration requires three distinct reference points..."); return;
        }
        const scannerPosKm = trilaterate2D(p1, p2, p3);
        if (scannerPosKm && typeof scannerPosKm.x === 'number' && typeof scannerPosKm.z === 'number' && !isNaN(scannerPosKm.x) && !isNaN(scannerPosKm.z)) {
            scannerPosMarkerCounter++;
            const markerGroupId = `scannerMarkerGroup_${scannerPosMarkerCounter}`;
            const initialLabelText = `S${scannerPosMarkerCounter}`;
            plottedMarkerData[markerGroupId] = { label: initialLabelText, x_km: scannerPosKm.x, z_km: scannerPosKm.z, notes: '', linkedSignatureId: null };
            
            const plotX_svg = scannerPosKm.x * currentSystemScaleFactor;
            const plotZ_svg = scannerPosKm.z * currentSystemScaleFactor;
            const markerSizeViewBox = 7;
            const markerGroup = document.createElementNS(SVG_NS, "g");
            markerGroup.setAttribute("id", markerGroupId);
            markerGroup.dataset.originalPlotX = plotX_svg; markerGroup.dataset.originalPlotY = plotZ_svg;
            const cross = document.createElementNS(SVG_NS, "g");
            cross.classList.add("scanner-marker-cross");
            const line1 = document.createElementNS(SVG_NS, "line");
            line1.setAttribute("x1", (-markerSizeViewBox).toString()); line1.setAttribute("y1", (0).toString());
            line1.setAttribute("x2", (markerSizeViewBox).toString()); line1.setAttribute("y2", (0).toString());
            const line2 = document.createElementNS(SVG_NS, "line");
            line2.setAttribute("x1", (0).toString()); line2.setAttribute("y1", (-markerSizeViewBox).toString());
            line2.setAttribute("x2", (0).toString()); line2.setAttribute("y2", (markerSizeViewBox).toString());
            cross.appendChild(line1); cross.appendChild(line2);
            
            const label = document.createElementNS(SVG_NS, "text");
            const labelOffsetX = markerSizeViewBox + 5; const labelOffsetY = 0;
            label.setAttribute("x", labelOffsetX.toString());
            label.setAttribute("y", labelOffsetY.toString());
            label.classList.add("scanner-marker-label");
            label.textContent = initialLabelText;
            label.style.cursor = "pointer";
            label.addEventListener('click', (e) => {
                e.stopPropagation();
                const mapMarkerLabelElement = e.currentTarget;
                const currentMapLabelText = mapMarkerLabelElement.textContent;
                // Find markerGroupId by traversing up from the label to the markerGroup
                let parentGroup = mapMarkerLabelElement.parentNode;
                while(parentGroup && !parentGroup.id.startsWith('scannerMarkerGroup_')) {
                    parentGroup = parentGroup.parentNode;
                }
                const clickedMarkerGroupId = parentGroup ? parentGroup.id : null;

                if (!clickedMarkerGroupId) {
                    console.error("Could not determine marker group ID for label click.");
                    return;
                }

                if (isLinkingProbeSignature && signatureToLink) {
                    console.log(`Linking signature ${signatureToLink.id} to map marker ${currentMapLabelText} (ID: ${clickedMarkerGroupId})`);
                    signatureToLink.linkedMapMarkerLabel = currentMapLabelText;
                    signatureToLink.mapMarkerId = clickedMarkerGroupId;
                    if (plottedMarkerData[clickedMarkerGroupId]) {
                        plottedMarkerData[clickedMarkerGroupId].linkedSignatureId = signatureToLink.id;
                        if (!plottedMarkerData[clickedMarkerGroupId].notes) {
                            plottedMarkerData[clickedMarkerGroupId].notes = `${signatureToLink.id} (${signatureToLink.specificName || signatureToLink.name})`;
                        }
                    }
                    displayParsedProbeSignatures();
                    updateMarkerInTable(clickedMarkerGroupId, { notes: plottedMarkerData[clickedMarkerGroupId]?.notes });
                    alert(`Signature ${signatureToLink.id} linked to map marker ${currentMapLabelText}.`);
                    isLinkingProbeSignature = false; signatureToLink = null;
                    if(parseScanButton) parseScanButton.disabled = false;
                    if(trilaterateSelectedButton) trilaterateSelectedButton.disabled = (selectedReferencePoints.length !== 3);
                } else {
                    let promptDefault = currentMapLabelText.match(/^S\d+$/) ? "" : currentMapLabelText;
                    const newLabelText = prompt(`Enter new label for marker (was "${currentMapLabelText}"):`, promptDefault);
                    if (newLabelText !== null) {
                        const trimmedNewLabel = newLabelText.trim();
                        if (trimmedNewLabel !== "") {
                            mapMarkerLabelElement.textContent = trimmedNewLabel;
                            if (plottedMarkerData[clickedMarkerGroupId]) plottedMarkerData[clickedMarkerGroupId].label = trimmedNewLabel;
                            updateMarkerInTable(clickedMarkerGroupId, { label: trimmedNewLabel });
                            const linkedSig = parsedProbeSignatures.find(sig => sig.mapMarkerId === clickedMarkerGroupId);
                            if (linkedSig) { linkedSig.linkedMapMarkerLabel = trimmedNewLabel; displayParsedProbeSignatures(); }
                        } else { if (!currentMapLabelText.match(/^S\d+$/)) { const defaultSxLabel = plottedMarkerData[clickedMarkerGroupId] ? plottedMarkerData[clickedMarkerGroupId].label : `S${clickedMarkerGroupId.split('_')[1] || scannerPosMarkerCounter}`; mapMarkerLabelElement.textContent = defaultSxLabel; if (plottedMarkerData[clickedMarkerGroupId]) plottedMarkerData[clickedMarkerGroupId].label = defaultSxLabel; updateMarkerInTable(clickedMarkerGroupId, { label: defaultSxLabel }); if (parsedProbeSignatures.find(sig => sig.mapMarkerId === clickedMarkerGroupId)) { parsedProbeSignatures.find(sig => sig.mapMarkerId === clickedMarkerGroupId).linkedMapMarkerLabel = defaultSxLabel; displayParsedProbeSignatures(); } alert("Label cannot be empty. Reverted."); } }
                    }
                }
            });
            markerGroup.appendChild(cross); markerGroup.appendChild(label);
            markerGroup.setAttribute('transform', `translate(${plotX_svg}, ${plotZ_svg})`);
            scanMarkersGroup.appendChild(markerGroup);
            makeMarkerDraggable(cross, markerGroup);
            addMarkerToTable(markerGroupId, initialLabelText, scannerPosKm.x, scannerPosKm.z);
        } else {
            alert("Could not determine scanner position..."); console.error("Trilateration result was null or invalid:", scannerPosKm);
        }
    }

    function handleClearScanText() { if (scanDataInput) scanDataInput.value = ""; }
    function handleClearMarkers() {
        if (scanMarkersGroup) { while (scanMarkersGroup.firstChild) { scanMarkersGroup.removeChild(scanMarkersGroup.firstChild); } }
        if (plottedMarkersTableBody) plottedMarkersTableBody.innerHTML = '';
        if (probeScanTableBody) probeScanTableBody.innerHTML = ''; 
        scannerPosMarkerCounter = 0; plottedMarkerData = {}; parsedProbeSignatures = [];
        if (selectableCelestialsContainer) selectableCelestialsContainer.style.display = 'none';
        if (trilaterateSelectedButton) trilaterateSelectedButton.style.display = 'none';
        selectedReferencePoints = [];
        if (selectionCountSpan && typeof updateSelectionCountAndButton === 'function') updateSelectionCountAndButton();
        isLinkingProbeSignature = false; signatureToLink = null;
        if (parseScanButton) parseScanButton.disabled = false;
        if (trilaterateSelectedButton && typeof selectedReferencePoints !== 'undefined' && selectedReferencePoints.length === 3) trilaterateSelectedButton.disabled = false;
        else if (trilaterateSelectedButton) trilaterateSelectedButton.disabled = true;
        console.log("All markers and all tables cleared. Linking state reset.");
    }

    function toggleSignatureZones() {
        if (!signatureZonesGroup || typeof currentSystemScaleFactor !== 'number' || currentSystemScaleFactor === 0 || !rawSystemData) {
            console.error("Cannot toggle zones: System not fully initialized or scale factor invalid.");
            if ( (typeof currentSystemScaleFactor === 'undefined' || currentSystemScaleFactor === 0) && typeof renderSystemSVG === 'function') { renderSystemSVG(); }
            if (typeof currentSystemScaleFactor !== 'number' || currentSystemScaleFactor === 0) { alert("Error: System scale factor is invalid."); return; }
        }
        const FOUR_AU_IN_KM = 4 * AU_KM;
        const four_au_svg_radius = FOUR_AU_IN_KM * currentSystemScaleFactor;
        const viewSizeForStrokeCalc = 600;
        const zoneStrokeWidth = (ORBIT_WIDTH_FACTOR * viewSizeForStrokeCalc) * 0.3;
        if (signatureZonesGroup.style.display === 'none') {
            while (signatureZonesGroup.firstChild) { signatureZonesGroup.removeChild(signatureZonesGroup.firstChild); }
            const system = transformRawDataToSystemFormat(rawSystemData);
            system.cels.forEach(cel => {
                const plotX_celestial = cel.map_x * currentSystemScaleFactor;
                const plotY_celestial = cel.map_y * currentSystemScaleFactor;
                const zoneCircle = document.createElementNS(SVG_NS, "circle");
                zoneCircle.setAttribute("cx", plotX_celestial.toString());
                zoneCircle.setAttribute("cy", plotY_celestial.toString());
                zoneCircle.setAttribute("r", four_au_svg_radius.toString());
                zoneCircle.setAttribute("class", "signature-zone-circle");
                zoneCircle.setAttribute("fill", "rgba(0, 255, 0, 0.01)");
                zoneCircle.setAttribute("stroke", "rgba(0, 200, 0, 0.05)");
                zoneCircle.setAttribute("stroke-width", zoneStrokeWidth.toString());
                signatureZonesGroup.appendChild(zoneCircle);
            });
            signatureZonesGroup.style.display = '';
            if (toggleSignatureZonesButton) toggleSignatureZonesButton.textContent = "Hide Signature Zones";
        } else {
            signatureZonesGroup.style.display = 'none';
            if (toggleSignatureZonesButton) toggleSignatureZonesButton.textContent = "Show Signature Zones";
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
            if (probeScanTableBody) probeScanTableBody.innerHTML = '';
            parsedProbeSignatures = [];
            return;
        }
        parsedProbeSignatures = [];
        const lines = scanText.split('\n');
        let parseErrors = 0;
        let successfullyParsedCount = 0;
        lines.forEach(line => {
            const parts = line.split('\t');
            if (parts.length >= 6) {
                const id = parts[0].trim(); const group = parts[1].trim();
                const name = parts[2].trim(); const specificName = parts[3].trim();
                const resolutionStr = parts[4].trim().replace('%', '');
                const rangeStr = parts[5].trim();
                const resolution = parseFloat(resolutionStr);
                const rangeKm = parseDistanceToKm(rangeStr);
                if (id && !isNaN(resolution) && !isNaN(rangeKm)) {
                    parsedProbeSignatures.push({ id, group, name, specificName, resolution, rangeKm, rangeOriginalStr: rangeStr, linkedMapMarkerLabel: null, mapMarkerId: null });
                    successfullyParsedCount++;
                } else { parseErrors++; }
            } else if (line.trim() !== "") { parseErrors++; }
        });
        if (parsedProbeSignatures.length === 0 && parseErrors > 0 && lines.length > 0) { alert("No valid probe scan entries parsed. Check format."); }
        else if (parseErrors > 0) { alert(`Parsed ${successfullyParsedCount} signatures, ${parseErrors} lines with errors.`); }
        else if (parsedProbeSignatures.length === 0 && lines.length > 0) { alert("No signatures found in text."); }
        displayParsedProbeSignatures();
    }

    function displayParsedProbeSignatures() {
        console.log("displayParsedProbeSignatures: Called with", parsedProbeSignatures.length, "signatures.");
        if (!probeScanTableBody) { console.error("displayParsedProbeSignatures: probeScanTableBody element is null!"); return; }
        probeScanTableBody.innerHTML = '';
        if (parsedProbeSignatures.length === 0) {
            const row = probeScanTableBody.insertRow(); const cell = row.insertCell();
            cell.colSpan = 8; cell.textContent = "No probe scan data parsed or list is empty.";
            cell.style.textAlign = "center"; cell.style.color = "#888"; return;
        }
        parsedProbeSignatures.forEach((sig) => {
            const row = probeScanTableBody.insertRow();
            row.classList.remove('res-green', 'res-yellow', 'res-red');
            if (sig.resolution === 100) row.classList.add('res-green');
            else if (sig.resolution >= 50) row.classList.add('res-yellow');
            else row.classList.add('res-red');
            row.insertCell().textContent = sig.id; row.insertCell().textContent = sig.group;
            row.insertCell().textContent = sig.name; row.insertCell().textContent = sig.specificName;
            row.insertCell().textContent = sig.resolution.toFixed(1) + '%';
            row.insertCell().textContent = sig.rangeOriginalStr;
            const linkedMarkerCell = row.insertCell();
            linkedMarkerCell.textContent = sig.linkedMapMarkerLabel || '---';
            linkedMarkerCell.id = `probe-link-cell-${sig.id.replace(/\W/g, '_')}`;
            const actionsCell = row.insertCell();
            const linkButton = document.createElement('button');
            linkButton.textContent = 'Link'; linkButton.className = 'link-marker-button';
            linkButton.onclick = () => startLinkingSignature(sig);
            actionsCell.appendChild(linkButton);
        });
    }

    function startLinkingSignature(signature) {
        if (isLinkingProbeSignature) { alert(`Already linking "${signatureToLink.id}". Click map marker or cancel.`); return; }
        isLinkingProbeSignature = true; signatureToLink = signature;
        if (trilaterateSelectedButton) trilaterateSelectedButton.disabled = true;
        if (parseScanButton) parseScanButton.disabled = true;
        alert(`LINKING MODE: Click label of an 'S' marker on map to link with ${signature.id}.`);
        console.log("Linking mode for sig:", signature);
    }

    // --- SECTION 3: Event Listener Attachments ---
    if (parseScanButton) parseScanButton.addEventListener('click', handleParseScanAndPrepareSelection);
    if (trilaterateSelectedButton) trilaterateSelectedButton.addEventListener('click', handleTrilaterateSelected);
    if (toggleSignatureZonesButton) toggleSignatureZonesButton.addEventListener('click', toggleSignatureZones);
    if (clearScanDataButton) clearScanDataButton.addEventListener('click', handleClearScanText);
    if (clearMarkersButton) clearMarkersButton.addEventListener('click', handleClearMarkers);
    if (parseProbeDataButton) parseProbeDataButton.addEventListener('click', handleParseProbeData);
    
    // --- SECTION 4: Initial Render Call ---
    if (typeof renderSystemSVG === 'function') {
        renderSystemSVG();
    } else {
        console.error("renderSystemSVG function is not defined! Map cannot be drawn.");
    }
    console.log("Script End (after DOMContentLoaded).");

}); // End of DOMContentLoaded listener
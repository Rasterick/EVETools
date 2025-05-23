
        let shipsData = [];
        const baseWikiUrl = "https://wiki.eveuniversity.org/";

        const inputTextElem = document.getElementById('inputText');
        const scanLocationInputElem = document.getElementById('scanLocationInput');
        const playersInStructuresInputElem = document.getElementById('playersInStructuresInput');
        
        const curseCountElem = document.getElementById('curseCount');
        const rookCountElem = document.getElementById('rookCount');
        const lachesisCountElem = document.getElementById('lachesisCount');
        const huginnCountElem = document.getElementById('huginnCount');

        const analyseButtonElem = document.getElementById('analyseButton');
        const cancelButtonElem = document.getElementById('cancelButton');
        const copyUrlButtonElem = document.getElementById('copyUrlButton');

        const systemInfoContainerElem = document.getElementById('systemInfoContainer');
        const classSummaryTableContainerElem = document.getElementById('classSummaryTableContainer');
        const shipSummaryTableContainerElem = document.getElementById('shipSummaryTableContainer');
        const unrecognizedEntriesTableContainerElem = document.getElementById('unrecognizedEntriesTableContainer');
        const malformedLinesInfoElem = document.getElementById('malformedLinesInfo');
        
        async function loadShipData() {
            try {
                const response = await fetch('../data/shipData.json'); 
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} while fetching shipData.json`);
                }
                const jsonData = await response.json();
                
                jsonData.forEach(ship => {
                    let url = ship.URL ? String(ship.URL).trim() : "";
                    if (!url || url.startsWith("<img") || (url.includes("_Shuttle") && !url.startsWith("https://wiki.eveuniversity.org/"))) { 
                        const shipNameForUrl = ship.Ship.replace(/ /g, '_');
                        ship.URL = `${baseWikiUrl}${encodeURIComponent(shipNameForUrl)}`;
                    } else {
                        ship.URL = url; 
                    }
                    ship["Faction Icon"] = ship["Faction Icon"] || ""; 
                    ship.Tank = ship.Tank || ""; 
                });

                shipsData = jsonData;
                shipsData.sort((a, b) => {
                    const lenA = a.Ship ? a.Ship.length : 0;
                    const lenB = b.Ship ? b.Ship.length : 0;
                    return lenB - lenA;
                });
                
                initializePage(); 

            } catch (e) {
                console.error("Error loading or parsing shipData.json:", e);
                alert("Error loading ship data. Analysis may not work correctly. Please check the console for details and ensure 'data/shipData.json' exists and is valid.");
                systemInfoContainerElem.innerHTML = `<p style="color:red;">Error loading ship database. Please try refreshing the page or contact support. (Check browser console for details)</p>`;
                initializePage(); 
            }
        }

        function initializePage() {
            // No iframe elements to initialize here anymore
            if (window.location.hash && window.location.hash.startsWith('#d=')) { 
                try {
                    const encodedData = window.location.hash.substring(3); 
                    const decodedJsonString = decodeURIComponent(atob(encodedData));
                    const urlDataObject = JSON.parse(decodedJsonString);
                    
                    if (urlDataObject.scanInput !== undefined) { 
                        inputTextElem.value = urlDataObject.scanInput;
                    }
                    if (urlDataObject.scanLocation !== undefined) {
                        scanLocationInputElem.value = urlDataObject.scanLocation;
                    }
                    if (urlDataObject.playersInStructures !== undefined) {
                        playersInStructuresInputElem.value = urlDataObject.playersInStructures;
                    }
                    curseCountElem.value = urlDataObject.reconCurse || 0;
                    rookCountElem.value = urlDataObject.reconRook || 0;
                    lachesisCountElem.value = urlDataObject.reconLachesis || 0;
                    huginnCountElem.value = urlDataObject.reconHuginn || 0;

                    if (shipsData.length > 0) { 
                        performAnalysis(); 
                    } else {
                        displayCurrentTimeDate("Analysis Time (Data loading...)", "", scanLocationInputElem.value, playersInStructuresInputElem.value);
                    }
                } catch (e) {
                    console.error("Error decoding data object from URL:", e);
                    history.pushState("", document.title, window.location.pathname + window.location.search);
                    displayCurrentTimeDate("Analysis Time"); 
                }
            } else {
                displayCurrentTimeDate("Analysis Time"); 
            }
        }


        function escapeHtml(unsafe) {
            if (unsafe === null || typeof unsafe === 'undefined') return '';
            return String(unsafe)
                 .replace(/&/g, "&amp;")
                 .replace(/</g, "&lt;")
                 .replace(/>/g, "&gt;")
                 .replace(/"/g, "&quot;")
                 .replace(/'/g, "&#039;");
        }

        function determineShipIdentity(rawColumn3Text) {
            const trimmedOriginalInput = rawColumn3Text.trim();
            const lowerTrimmedOriginalInput = trimmedOriginalInput.toLowerCase();
            const lowerRawColumn3Text = rawColumn3Text.toLowerCase();

            if (shipsData.length === 0) { 
                return { foundShip: null, effectiveName: trimmedOriginalInput };
            }

            let found = shipsData.find(dbShip => dbShip.Ship && dbShip.Ship.toLowerCase() === lowerTrimmedOriginalInput);
            if (found) {
                return { foundShip: found, effectiveName: found.Ship };
            }

            for (const dbShip of shipsData) {
                if (dbShip.Ship && dbShip.Ship.trim() !== "" && lowerRawColumn3Text.includes(dbShip.Ship.toLowerCase())) {
                    return { foundShip: dbShip, effectiveName: dbShip.Ship };
                }
            }
            
            return { foundShip: null, effectiveName: trimmedOriginalInput };
        }

        function appendReconShipsToTextarea() {
            let appendedText = "";
            const reconShips = [
                { name: "Curse", count: parseInt(curseCountElem.value) || 0 },
                { name: "Rook", count: parseInt(rookCountElem.value) || 0 },
                { name: "Lachesis", count: parseInt(lachesisCountElem.value) || 0 },
                { name: "Huginn", count: parseInt(huginnCountElem.value) || 0 }
            ];

            reconShips.forEach(ship => {
                for (let i = 0; i < ship.count; i++) {
                    appendedText += `11987\tUNK\t${ship.name}\t-\n`;
                }
            });

            if (appendedText) {
                const currentText = inputTextElem.value;
                inputTextElem.value += (currentText.trim() ? "\n" : "") + appendedText.trim();
            }
        }


        function performAnalysis() {
            appendReconShipsToTextarea(); 

            const rawInput = inputTextElem.value; 
            const scanLocation = scanLocationInputElem.value.trim();
            const playersInStructures = playersInStructuresInputElem.value;

            systemInfoContainerElem.innerHTML = '';
            classSummaryTableContainerElem.innerHTML = '<h2>Class Summary</h2>';
            shipSummaryTableContainerElem.innerHTML = '<h2>Ship Summary</h2>';
            unrecognizedEntriesTableContainerElem.innerHTML = '<h2>Unrecognized Entries</h2>';
            malformedLinesInfoElem.innerHTML = '';
            // No iframe logic here anymore

            if (shipsData.length === 0) {
                alert("Ship data is not loaded yet. Please wait a moment and try again, or refresh the page.");
                displayCurrentTimeDate("Analysis Time", "", scanLocation, playersInStructures);
                return;
            }

            if (!rawInput.trim()) {
                if (window.location.hash) { 
                    history.pushState("", document.title, window.location.pathname + window.location.search);
                }
                shipSummaryTableContainerElem.innerHTML += '<p style="text-align:center;">Input is empty.</p>';
                displayCurrentTimeDate("Analysis Time", "", scanLocation, playersInStructures);
                return;
            }
            
            try {
                const dataToEncode = {
                    scanInput: rawInput,
                    scanLocation: scanLocation,
                    playersInStructures: playersInStructures,
                    reconCurse: curseCountElem.value,
                    reconRook: rookCountElem.value,
                    reconLachesis: lachesisCountElem.value,
                    reconHuginn: huginnCountElem.value
                };
                const jsonStringToEncode = JSON.stringify(dataToEncode);
                const encodedData = btoa(encodeURIComponent(jsonStringToEncode));
                if (encodedData) {
                    window.location.hash = `d=${encodedData}`; 
                } else {
                     if (window.location.hash) {
                         history.pushState("", document.title, window.location.pathname + window.location.search);
                    }
                }
            } catch (e) {
                console.error("Error during encoding for URL hash:", e);
            }


            const lines = rawInput.split('\n').filter(line => line.trim() !== '');
            if (lines.length === 0) { 
                shipSummaryTableContainerElem.innerHTML += '<p style="text-align:center;">No valid lines to process.</p>';
                displayCurrentTimeDate("Analysis Time", "", scanLocation, playersInStructures);
                return;
            }

            const shipCounts = {};
            const firstShipDataForEffectiveName = {};
            const classCounts = {};
            const unrecognizedEntries = {}; 
            const malformedLineDetails = { count: 0, lines: [] };
            const detectedSystems = new Set();
            const systemRegex = /\b(J\d{6})\b/gi; 

            lines.forEach(line => {
                let match;
                while ((match = systemRegex.exec(line)) !== null) {
                    detectedSystems.add(match[1].toUpperCase()); 
                }
                systemRegex.lastIndex = 0; 

                const parts = line.split('\t');
                if (parts.length < 3) {
                    malformedLineDetails.count++;
                    malformedLineDetails.lines.push(line);
                } else {
                    const rawColumn3Text = parts[2]; 
                    const { foundShip, effectiveName } = determineShipIdentity(rawColumn3Text);
                    
                    shipCounts[effectiveName] = (shipCounts[effectiveName] || 0) + 1;

                    if (foundShip) {
                        if (!firstShipDataForEffectiveName[effectiveName]) {
                            firstShipDataForEffectiveName[effectiveName] = foundShip;
                        }
                        if (foundShip.Class && foundShip.Class.trim() !== "") {
                           classCounts[foundShip.Class] = (classCounts[foundShip.Class] || 0) + 1;
                        }
                    } else {
                        unrecognizedEntries[effectiveName] = (unrecognizedEntries[effectiveName] || 0) + 1;
                        if (!firstShipDataForEffectiveName[effectiveName]) { 
                            firstShipDataForEffectiveName[effectiveName] = null; 
                        }
                    }
                }
            });
            
            let systemInfoHtml = '';
            const systemArray = Array.from(detectedSystems).sort();
            let systemScanTitle = "Analysis Time";

            if (systemArray.length > 0) {
                if (systemArray.length === 1) {
                    const systemName = systemArray[0];
                    systemScanTitle = `Scan of System <a href="https://anoik.is/systems/${escapeHtml(systemName)}" target="_blank">${escapeHtml(systemName)}</a>`;
                } else {
                    systemScanTitle = "Detected Systems";
                    systemInfoHtml += '<table class="info-table"><thead><tr><th>System Link</th></tr></thead><tbody>';
                    systemArray.forEach(systemName => {
                        systemInfoHtml += `<tr><td><a href="https://anoik.is/systems/${escapeHtml(systemName)}" target="_blank">${escapeHtml(systemName)}</a></td></tr>`;
                    });
                    systemInfoHtml += '</tbody></table>';
                }
            }
            displayCurrentTimeDate(systemScanTitle, systemInfoHtml, scanLocation, playersInStructures);

            if (Object.keys(classCounts).length > 0) {
                let classTableHtml = `
                    <table>
                        <thead><tr><th>Class</th><th>Count</th></tr></thead>
                        <tbody>`;
                Object.keys(classCounts).sort((a,b) => a.localeCompare(b)).forEach(className => {
                    classTableHtml += `<tr><td>${escapeHtml(className)}</td><td>${classCounts[className]}</td></tr>`;
                });
                classTableHtml += `</tbody></table>`;
                classSummaryTableContainerElem.innerHTML += classTableHtml;
            } else {
                classSummaryTableContainerElem.innerHTML += '<p style="text-align:center;">No recognized ship classes found.</p>';
            }

            let shipTableHtml = `
                <table class="ship-summary-table">
                    <thead>
                        <tr><th>Count</th><th>Ship</th><th>Class</th><th>Faction Icon</th><th>ECM/Sensor</th><th>Tank</th><th>DPS</th><th>Notes</th></tr>
                    </thead>
                    <tbody>`;
            const sortedRecognizedEffectiveNames = Object.keys(shipCounts)
                .filter(name => firstShipDataForEffectiveName[name] !== null)
                .sort((a,b) => a.localeCompare(b));
            let recognizedShipsFound = false;
            sortedRecognizedEffectiveNames.forEach(effectiveName => {
                recognizedShipsFound = true;
                const count = shipCounts[effectiveName];
                const shipDetails = firstShipDataForEffectiveName[effectiveName];
                const shipLink = shipDetails.URL ? 
                                 `<a href="${escapeHtml(shipDetails.URL)}" target="_blank">${escapeHtml(shipDetails.Ship)}</a>` : 
                                 escapeHtml(shipDetails.Ship);
                
                const factionIconCellHtml = shipDetails["Faction Icon"] || ""; 
                const tankCellHtml = shipDetails.Tank || ""; 
                
                let sensorClass = 'sensor-unknown';
                if (shipDetails.Sensor) {
                    const sensorLower = String(shipDetails.Sensor).toLowerCase(); 
                    if (sensorLower.includes('radar')) sensorClass = 'sensor-radar';
                    else if (sensorLower.includes('gravimetric')) sensorClass = 'sensor-gravimetric';
                    else if (sensorLower.includes('magnetometric')) sensorClass = 'sensor-magnetometric';
                    else if (sensorLower.includes('ladar')) sensorClass = 'sensor-ladar';
                }

                shipTableHtml += `
                    <tr>
                        <td>${count}</td>
                        <td>${shipLink}</td>
                        <td>${escapeHtml(shipDetails.Class)}</td>
                        <td>${factionIconCellHtml}</td>
                        <td class="${sensorClass}">${escapeHtml(shipDetails.Sensor)}</td>
                        <td>${tankCellHtml}</td>       
                        <td>${escapeHtml(shipDetails.DPS)}</td>
                        <td>${escapeHtml(shipDetails.Notes)}</td>
                    </tr>`;
            });
             if (!recognizedShipsFound && Object.keys(unrecognizedEntries).length === 0 && malformedLineDetails.count === 0) { 
                 shipTableHtml += `<tr><td colspan="8" style="text-align:center;">No recognized ships found.</td></tr>`;
            }
            shipTableHtml += `</tbody></table>`;
            shipSummaryTableContainerElem.innerHTML += shipTableHtml;

            const sortedUnrecognizedNames = Object.keys(unrecognizedEntries).sort((a,b) => a.localeCompare(b));
            if (sortedUnrecognizedNames.length > 0) {
                let unrecognizedTableHtml = `
                    <table>
                        <thead><tr><th>Count</th><th>Unrecognized Name/Text</th></tr></thead>
                        <tbody>`;
                sortedUnrecognizedNames.forEach(name => {
                    unrecognizedTableHtml += `<tr><td>${unrecognizedEntries[name]}</td><td>${escapeHtml(name)}</td></tr>`;
                });
                unrecognizedTableHtml += `</tbody></table>`;
                unrecognizedEntriesTableContainerElem.innerHTML += unrecognizedTableHtml;
            } else {
                 unrecognizedEntriesTableContainerElem.innerHTML += '<p style="text-align:center;">No unrecognized entries.</p>';
            }
            
            if (malformedLineDetails.count > 0) {
                malformedLinesInfoElem.innerHTML = `<p><strong>Malformed Lines Detected:</strong> ${malformedLineDetails.count}. These lines had fewer than 3 tab-separated columns and were not fully processed.</p>`;
            } else {
                malformedLinesInfoElem.innerHTML = '<p>No malformed input lines detected.</p>';
            }
        }

        function displayCurrentTimeDate(title, existingSystemHtml = '', scanLocation = '', playersInStructures = '') {
            const now = new Date();
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
            const dateString = now.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });
            
            let infoTableHtml = `<h2>${title}</h2>`; 
            infoTableHtml += existingSystemHtml; 

            infoTableHtml += `<table class="info-table"><tbody>`;
            if (scanLocation) {
                infoTableHtml += `<tr><td>Scanned From:</td><td>${escapeHtml(scanLocation)}</td></tr>`;
            }
            if ((playersInStructures && String(playersInStructures).trim() !== "") || parseInt(playersInStructures) === 0) { 
                 infoTableHtml += `<tr><td>Players in Structures:</td><td>${escapeHtml(String(playersInStructures))}</td></tr>`;
            }
            infoTableHtml += `<tr><td>Time:</td><td>${timeString}</td></tr>
                              <tr><td>Date:</td><td>${dateString}</td></tr>
                             </tbody></table>`;
            systemInfoContainerElem.innerHTML = infoTableHtml;
        }

        function clearAll() {
            inputTextElem.value = '';
            scanLocationInputElem.value = ''; 
            playersInStructuresInputElem.value = '0'; 
            curseCountElem.value = '0';
            rookCountElem.value = '0';
            lachesisCountElem.value = '0';
            huginnCountElem.value = '0';

            systemInfoContainerElem.innerHTML = '';
            classSummaryTableContainerElem.innerHTML = '<h2>Class Summary</h2>';
            shipSummaryTableContainerElem.innerHTML = '<h2>Ship Summary</h2>';
            unrecognizedEntriesTableContainerElem.innerHTML = '<h2>Unrecognized Entries</h2>';
            malformedLinesInfoElem.innerHTML = '';
            
            // No iframe to clear here
            
            if (window.location.hash) { 
                 history.pushState("", document.title, window.location.pathname + window.location.search);
            }
            displayCurrentTimeDate("Analysis Time"); 
        }
        
        function copyUrlToClipboard() {
            navigator.clipboard.writeText(window.location.href).then(() => {
                const originalText = copyUrlButtonElem.textContent;
                copyUrlButtonElem.textContent = 'Copied!';
                copyUrlButtonElem.style.backgroundColor = '#50fa7b'; 
                copyUrlButtonElem.style.color = '#282a36'; 
                setTimeout(() => {
                    copyUrlButtonElem.textContent = originalText;
                    copyUrlButtonElem.style.backgroundColor = '#bd93f9'; 
                    copyUrlButtonElem.style.color = '#f8f8f2'; 
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy URL: ', err);
                alert('Failed to copy URL. Please copy it manually.');
            });
        }

        analyseButtonElem.addEventListener('click', performAnalysis);
        cancelButtonElem.addEventListener('click', clearAll);
        copyUrlButtonElem.addEventListener('click', copyUrlToClipboard);

        loadShipData();


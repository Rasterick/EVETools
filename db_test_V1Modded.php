<?php
# Fill our vars and run on cli
# $ php -f db-connect-test.php

if (!isset($_POST['systemID'])) {
    echo "No system ID provided.";
    exit;
}
else{   
    $solarSystem = $_POST['systemID'];
}

require 'config.php';
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>EVE System Mapper - J121116</title> 
    <link rel="stylesheet" href="style/SolarSystemMap.css">
    </head>
<body>
    
<?php


require 'config.php';

$conn = new PDO("mysql:host=$host;dbname=$db", $user, $password);

$sql = "SELECT  evemapdenormalise.itemName,
        evemapdenormalise.itemID,
        evemapdenormalise.posn_x,
        evemapdenormalise.posn_y,
        evemapdenormalise.posn_z,
        evemapdenormalise.orbitIndex,
        solarsystems.solarSystemName,
        constellations.constellationname,
        regions.regionName,
        wormholesystems.effect,
        wormholesystems.static1,
        wormholesystems.static2, 
        invtypes.typename
        FROM solarsystems
        INNER JOIN regions ON solarsystems.regionregionID = regions.regionID
        INNER JOIN constellations ON solarsystems.constellationID = constellations.constellationID
        INNER JOIN evemapdenormalise ON solarsystems.solarSystemID = evemapdenormalise.solarSystemID
        INNER JOIN wormholesystems ON solarsystems.solarSystemID = wormholesystems.solarsystemid
        INNER join invtypes ON evemapdenormalise.typeID = invtypes.typeid
        WHERE solarsystems.solarSystemName LIKE '".$solarSystem."%'
        ORDER BY solarsystems.solarSystemName;";
/*
echo "<h1>SOLAR SYSTEM INFORMATION - ".$solarSystem."</h1>"; 
echo "<table style='border: solid 1px black;'>";
echo "<tr><th>System Name</th><th>Constellation</th><th>Region Name</th></tr>";
*/

$result = $conn->prepare($sql);
$result->execute();

//echo "<br>";

$rows = $result->fetchAll(PDO::FETCH_ASSOC);


/* - Convert to a JSON object
*/
$jsonData = json_encode($rows);

if ($jsonData === false) {
    echo "Error encoding JSON: " . json_last_error_msg();
    exit;
}

/* - END Convert to a JSON object
*/
/*
echo "<tr>";
echo "<td>".$rows[0]['solarSystemName']."</td><td>".$rows[0]['constellationname']."</td><td>".$rows[0]['regionName']."</td></tr>";

echo "</table>";
echo "<br>";

echo "<table style='border: solid 1px black;'>";
echo "<tr><th>Wormhole Effect</th><th>Static 1</th><th>Static 2</th></tr>";
echo "<td>".$rows[0]['effect']."</td><td>".$rows[0]['static1']."</td><td>".$rows[0]['static2']."</td></tr>";

echo "</table>";
echo "<br>";

echo "<table style='border: solid 1px black;'>";
echo "<tr><th>Name</th><th>Position X</th><th>Position Y</th><th>Position Z</th></tr>";


foreach ($rows as $row) {
    echo "<tr>";
    foreach ($row as $key => $value) {
        
        
        if ($key == 'itemName') {
            echo "<td>".$value."</td>";
        } elseif ($key == 'posn_x' || $key == 'posn_y' || $key == 'posn_z') {
            echo "<td>".number_format($value, 2)."</td>";
        }   else {
            continue;
        }           

    }
}
echo "</table>";
*/

// Decode the JSON data back to an associative array 
$jsonData = json_decode($jsonData, true); 
//echo "<br>";
//echo "<h2>JSON Data Output</h2>";

//echo "</pre>";  

//echo "<br>";

echo "<SCRIPT>\n";
echo "document.addEventListener('DOMContentLoaded', () => {\n";
echo "const rawSystemData = [\n";


// Iterate over the data and print each row 
foreach ($jsonData as $row) { 
    echo "    {"; // Start of a new object
    foreach ($row as $key => $value) { 
        
        echo "$key: $value, "; // Print key-value pairs
    } 
    /* - Functionalty to add Colour information to JSON Array
    
    */
    $typename = $row['typename'];
    switch ($typename) {
    case 'Planet (Barren)':
        echo "Representation: \"Pale Grey Circle\"";
        break;
    case 'Planet (Lava)':
        echo "Representation: \"Light Blue Circle\"";
        break;
    case 'Planet (Storm)':
        echo "Representation: \"Green Circle\"";
        break;
    case 'Planet (Ice)':
        echo "Representation: \"Dark Grey Circle\"";
        break;
    case 'Planet (Gas)':
        echo "Representation: \"Yellow Circle\"";
        break;
    case 'Planet (Oceanic)':
        echo "Representation: \"Blue Circle\">";
        break;  
    case 'Planet (Plasma)':
        echo "Representation: \"Red Circle\"";
        break;      
    case 'Moon':
        echo "Representation: \"Grey Circle\"";
        break;  

}
    echo "    },\n"; // End of the object
} 
echo "];\n"; // End of the array
echo "</SCRIPT>\n";


// Close the database connection
$conn = null;
?>

    <header id="appHeader">
        <h1>System Information - J121116</h1>
    </header>

    <main id="appGridContainer">
        <div id="mapWindow" class="grid-item">
            <div id="svgContainer">
                <svg id="solarSystemSVG" preserveAspectRatio="xMidYMid meet">
                    
                </svg>
                <div id="infoBox"></div> 

            </div>
            
        </div>

        <div id="probeInputData" class="grid-item"> 
            <textarea id="scanDataInput" placeholder="Paste D-Scan or Probe Scan data..."></textarea>
        </div>

   
        <div id="buttonPanelGridItem" class="grid-item"> 
            <div id="buttonPanel"> 
                <button id="parseScanButton">Parse D-Scan & Select Refs</button>
                <button id="trilaterateSelectedButton" style="display:none;">Trilaterate Selected (3)</button>
                <button id="parseProbeDataButton">List Probe Scans</button>
                <button id="toggleSignatureZonesButton">Toggle Signature Zones</button>
                <button id="clearScanDataButton">Clear Scan Text</button>
                <button id="clearMarkersButton">Clear Markers & Lists</button>
            </div>
        </div>

        <div id="pointSelection" class="grid-item">
            <div id="selectableCelestialsContainer"> 
                <h4>Select 3 Refs: <span id="selectionCount">(0/3)</span></h4>
                <div id="selectableCelestialsList"></div>
            </div>
        </div>

        <div id="plottedLocations" class="grid-item">
            <h2>Plotted Locations</h2>
            <div id="plottedMarkersTableContainer">
                <table id="plottedMarkersTable">
                    <thead><tr><th>Label</th><th>Type / Notes</th><th>Est. X (AU)</th><th>Est. Z (AU)</th><th>Actions</th></tr></thead>
                    <tbody id="plottedMarkersTableBody"></tbody>
                </table>
            </div>
        </div>

        <div id="spareArea" class="grid-item">
            <div id="topRightButtonPanel">
                <button id="futureButton1">(Future) Save State</button>
                <button id="anotherFutureButton">(Future) Load State</button>
            </div>
            <p style="margin-top: auto; color: #555; align-self: center;">Spare Area</p> 
        </div>

        <div id="probeScanResults" class="grid-item"> 
            <h2>Probe Scan Results</h2>
            <div id="probeScanListContainer">
                <table id="probeScanTable">
                    <thead><tr><th>ID</th><th>Group</th><th>Name</th><th>Type Detail</th><th>Res %</th><th>Range</th><th>Linked</th><th>Actions</th></tr></thead>
                    <tbody id="probeScanTableBody"></tbody> 
                </table>
            </div>
        </div>

        <div id="lootEstimation" class="grid-item">
            <h2>Loot Estimation</h2>
            <p>(Future Feature)</p>
        </div>

        <div id="systemInformation" class="grid-item">
            <h2>System Information</h2>
            <p>(Future Feature)</p>
        </div>
    </main>
    
</body>
</html>

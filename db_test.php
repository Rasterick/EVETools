<?php
// error_reporting(E_ALL); // Uncomment for debugging
// ini_set('display_errors', 1); // Uncomment for debugging

require 'config.php'; // $host, $dbname, $username, $password

$systemIdentifier = null; 
if (isset($_POST['systemID'])) {
    $systemIdentifier = trim($_POST['systemID']); // This is the system NAME from JS
}

if (empty($systemIdentifier)) {
    http_response_code(400); 
    echo json_encode(["error" => "systemIdentifier (system name) not provided"]);
    exit;
}

$systemInfoOutput = null;
$celestialOutputData = [];
$pdo = null; // Define $pdo here to be accessible in finally block

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false); // Good practice

    // --- 1. Fetch System Specific Info ---
    // We need solarSystemID first to query wormholesystems and systemstatic
    $stmtSysId = $pdo->prepare("SELECT solarSystemID, regionName, constellationname 
                                FROM solarsystems s
                                JOIN regions r ON s.regionregionID = r.regionID
                                JOIN constellations c ON s.constellationID = c.constellationID
                                WHERE s.solarSystemName = :systemName LIMIT 1");
    $stmtSysId->bindParam(':systemName', $systemIdentifier, PDO::PARAM_STR);
    $stmtSysId->execute();
    $systemBaseInfo = $stmtSysId->fetch(PDO::FETCH_ASSOC);

    if ($systemBaseInfo) {
        $numericSystemID = $systemBaseInfo['solarSystemID'];

        $stmtWhInfo = $pdo->prepare("SELECT class, effect, static1, static2 
                                     FROM wormholesystems 
                                     WHERE solarsystemid = :numericSystemID LIMIT 1");
        $stmtWhInfo->bindParam(':numericSystemID', $numericSystemID, PDO::PARAM_INT);
        $stmtWhInfo->execute();
        $wormholeDetails = $stmtWhInfo->fetch(PDO::FETCH_ASSOC);

        // The 'static1' and 'static2' in wormholesystems might be IDs or names.
        // If they are IDs (e.g., from systemstatic.typeId), you'd need another join
        // to invtypes to get their 'typename' (like "K162").
        // For now, let's assume 'static1' and 'static2' from wormholesystems are descriptive enough
        // or are the typeIDs that you can map later or just display as is.
        // The systemstatic table seems to list ALL statics a system might have, not just the primary two.

        $systemInfoOutput = [
            "systemName"      => $systemIdentifier,
            "class"           => $wormholeDetails ? "C" . $wormholeDetails['class'] : 'N/A',
            "effect"          => $wormholeDetails ? ($wormholeDetails['effect'] ?: 'None') : 'N/A',
            "static1_type"    => $wormholeDetails ? ($wormholeDetails['static1'] ?: 'N/A') : 'N/A',
            "static1_leadsTo" => "", // Placeholder - SDE requires more complex joins for this
            "static2_type"    => $wormholeDetails ? ($wormholeDetails['static2'] ?: 'N/A') : 'N/A',
            "static2_leadsTo" => "", // Placeholder
            "regionName"      => $systemBaseInfo['regionName'],
            "constellationName" => $systemBaseInfo['constellationname']
        ];

        // To get "leadsTo" for statics, it's more involved.
        // The `systemstatic` table links `solarsystemId` to a `typeId` (of the wormhole type, e.g., K162).
        // You'd then need to look up that `typeId` in a table (often derived from SDE's `invWormholeTypes` or similar)
        // that specifies what class of space that wormhole type leads to.
        // For example, if `wormholesystems.static1` stores the TYPEID of the static (e.g., 29630 for a K162)
        // $stmtStatic1Info = $pdo->prepare("SELECT leadsToSecurityClass FROM invWormholeTypes WHERE typeID = :typeID_static1");
        // $stmtStatic1Info->bindParam... then fetch and set $systemInfoOutput['static1_leadsTo']
    }


    // --- 2. Fetch Celestials (your existing query, ensuring it uses the correct system identifier) ---
    $stmtCelestials = $pdo->prepare("SELECT 
                                evemapdenormalise.itemID AS Id,
                                evemapdenormalise.itemName,
                                evemapdenormalise.posn_x AS X,
                                evemapdenormalise.posn_y AS Y,
                                evemapdenormalise.posn_z AS Z,
                                invtypes.typeName
                           FROM solarsystems
                           INNER JOIN evemapdenormalise ON solarsystems.solarSystemID = evemapdenormalise.solarSystemID
                           INNER JOIN invtypes ON evemapdenormalise.typeID = invtypes.typeID
                           WHERE solarsystems.solarSystemName = :systemIdentifier");
    $stmtCelestials->bindParam(':systemIdentifier', $systemIdentifier, PDO::PARAM_STR);
    $stmtCelestials->execute();
    $celestialResults = $stmtCelestials->fetchAll(PDO::FETCH_ASSOC);

    if ($celestialResults) {
        foreach ($celestialResults as $row) {
            $representation = "Unknown"; 
            $typeNameFromDB = isset($row['typeName']) ? $row['typeName'] : ''; 

            if (stripos($typeNameFromDB, 'Sun') !== false || stripos($typeNameFromDB, 'Star') !== false ) { 
                $representation = "Yellow Circle";
            } else if (stripos($typeNameFromDB, 'Planet (Barren)') !== false) { $representation = "Pale Grey Circle";
            } else if (stripos($typeNameFromDB, 'Planet (Lava)') !== false) { $representation = "Red Circle";
            } else if (stripos($typeNameFromDB, 'Planet (Storm)') !== false) { $representation = "Dark Grey Circle";
            } else if (stripos($typeNameFromDB, 'Planet (Ice)') !== false) { $representation = "Light Grey Circle";
            } else if (stripos($typeNameFromDB, 'Planet (Gas)') !== false) { $representation = "Olive Circle";
            } else if (stripos($typeNameFromDB, 'Planet (Oceanic)') !== false) { $representation = "Blue Circle";
            } else if (stripos($typeNameFromDB, 'Planet (Plasma)') !== false) { $representation = "Red Circle";
            } else if (stripos($typeNameFromDB, 'Moon') !== false) { $representation = "Pale Grey Circle"; }
            
            $celestialOutputData[] = [
                'Id' => intval($row['Id']), 
                'itemName' => $row['itemName'],
                'X' => floatval($row['X']) / 1000.0,   
                'Y' => floatval($row['Y']) / 1000.0,   
                'Z' => floatval($row['Z']) / 1000.0,   
                'Represenatation' => $representation 
            ];
        }
    }

    // --- Combine and Output ---
    $finalOutput = [
        "systemInfo" => $systemInfoOutput, // This can be null if system info part failed but celestials found
        "celestials" => $celestialOutputData
    ];

    header('Content-Type: application/json');
    echo json_encode($finalOutput);

} catch(PDOException $e) {
    http_response_code(500); 
    error_log("Database Error in db_test.php: " . $e->getMessage()); 
    echo json_encode(["error" => "A database error occurred.", "debug_details" => $e->getMessage()]); 
} finally {
    $pdo = null; // Ensure connection is closed
}
?>
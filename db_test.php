<?php
// error_reporting(E_ALL); // Uncomment for debugging on your server
// ini_set('display_errors', 1); // Uncomment for debugging on your server

require 'config.php'; // Make sure this correctly sets $host, $dbname, $username, $password

$systemIdentifier = null; // Can be name or ID string from JS
if (isset($_POST['systemID'])) { // JS sends it as 'systemID' in the body
    $systemIdentifier = trim($_POST['systemID']);
}

if (empty($systemIdentifier)) { // Check if it's empty after trimming
    http_response_code(400); 
    echo json_encode(["error" => "systemIdentifier (system name or ID) not provided"]);
    exit;
}

try {
    $conn = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Assuming systemIdentifier is the system NAME for now.
    // If it could also be the numeric systemID, you'd need more complex logic or two different parameters.
    $stmt = $conn->prepare("SELECT 
                                evemapdenormalise.itemID AS Id, -- Aliased to match JS 'Id'
                                evemapdenormalise.itemName,
                                evemapdenormalise.posn_x AS X,  -- Aliased to match JS 'X'
                                evemapdenormalise.posn_y AS Y,  -- Aliased to match JS 'Y'
                                evemapdenormalise.posn_z AS Z,  -- Aliased to match JS 'Z'
                                invtypes.typeName               -- Used for 'Represenatation' logic
                           FROM solarsystems
                           INNER JOIN evemapdenormalise ON solarsystems.solarSystemID = evemapdenormalise.solarSystemID
                           INNER JOIN invtypes ON evemapdenormalise.typeID = invtypes.typeID
                           WHERE solarsystems.solarSystemName = :systemIdentifier");
                           // If you want to use solarSystemID from evemapdenormalise, your join condition would change
                           // or you'd pass the numeric systemID.

    $stmt->bindParam(':systemIdentifier', $systemIdentifier, PDO::PARAM_STR); // Bind as STRING
    $stmt->execute();
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $outputData = [];

    if ($result) {
        foreach ($result as $row) {
            $representation = "Unknown Circle"; 
            $typeNameFromDB = isset($row['typeName']) ? $row['typeName'] : ''; // Use the correct column name from SQL

            // Using stripos for case-insensitive partial match is good
            if (stripos($typeNameFromDB, 'Sun') !== false || stripos($typeNameFromDB, 'Star') !== false ) { // More specific: typeName LIKE '%Sun%' or typeName LIKE '%Star%'
                $representation = "Yellow Circle";
            } else if (stripos($typeNameFromDB, 'Planet (Barren)') !== false) {
                $representation = "Pale Grey Circle";
            } else if (stripos($typeNameFromDB, 'Planet (Lava)') !== false) {
                $representation = "Red Circle";
            } else if (stripos($typeNameFromDB, 'Planet (Storm)') !== false) {
                $representation = "Dark Grey Circle";
            } else if (stripos($typeNameFromDB, 'Planet (Ice)') !== false) {
                $representation = "Light Grey Circle";
            } else if (stripos($typeNameFromDB, 'Planet (Gas)') !== false) {
                $representation = "Olive Circle";
            } else if (stripos($typeNameFromDB, 'Planet (Oceanic)') !== false) {
                $representation = "Blue Circle";
            } else if (stripos($typeNameFromDB, 'Planet (Plasma)') !== false) {
                $representation = "Red Circle";
            } else if (stripos($typeNameFromDB, 'Moon') !== false) { // General moon catch
                $representation = "Pale Grey Circle";
            }
            // IMPORTANT: Ensure 'Id', 'X', 'Y', 'Z' keys below match the ALIASES in your SQL SELECT
            $outputData[] = [
                'Id' => intval($row['Id']), 
                'itemName' => $row['itemName'],
                'X' => floatval($row['X']) / 1000.0,   // Convert METERS from DB to KILOMETERS
                'Y' => floatval($row['Y']) / 1000.0,   // Convert METERS from DB to KILOMETERS
                'Z' => floatval($row['Z']) / 1000.0,   // Convert METERS from DB to KILOMETERS
                'Represenatation' => $representation  // JS expects this exact spelling
                // 'Orbits' can be omitted if always null for this data structure
            ];
        }
    }

    header('Content-Type: application/json');
    echo json_encode($outputData);

} catch(PDOException $e) {
    http_response_code(500); 
    error_log("Database Error in get_system_data.php: " . $e->getMessage()); // Log actual error on server
    echo json_encode(["error" => "A database error occurred. Please try again later.", "debug_details" => $e->getMessage()]); // Debug only
}
$conn = null;
?>
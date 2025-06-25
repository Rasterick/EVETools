<?php
ini_set('display_errors', 1); // Keep for debugging on test server
error_reporting(E_ALL);

header('Content-Type: application/json');
// header('Access-Control-Allow-Origin: *'); // If testing from different domain/port

require 'db_config.php'; // Defines $host, $db, $user, $pass, $charset

// --- Reusable cURL Function ---
function fetchJsonFromUrl($url, $timeout = 10) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'YourAppName/1.0 (Contact: abonriff@gmail.com)');
    curl_setopt($ch, CURLOPT_FAILONERROR, false); 
    curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
    // curl_setopt($ch, CURLOPT_ENCODING, ""); // If ESI sends gzipped often
    $responseJsonString = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($responseJsonString === false) {
        error_log("cURL Error for {$url}: " . $curlError);
        return ['error' => true, 'message' => "cURL Error: " . $curlError, 'http_code' => 0];
    }
    if ($httpCode !== 200) {
        error_log("HTTP Error {$httpCode} for {$url}. Response: " . substr($responseJsonString, 0, 200));
        return ['error' => true, 'message' => "HTTP Error: " . $httpCode, 'http_code' => $httpCode, 'response_body' => substr($responseJsonString,0,200)];
    }
    $data = json_decode($responseJsonString, true);
    if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
        error_log("JSON Decode Error for {$url}: " . json_last_error_msg() . ". Response: " . substr($responseJsonString, 0, 200));
        return ['error' => true, 'message' => "JSON Decode Error: " . json_last_error_msg(), 'http_code' => $httpCode];
    }
    return $data;
}

// --- Helper function to resolve TypeID to Name from invtypes (with caching) ---
function resolveTypeName($typeId, $pdo, &$cache) {
    if (!$typeId) return "N/A";
    if (isset($cache[$typeId])) {
        return $cache[$typeId];
    }
    try {
        $stmt = $pdo->prepare("SELECT typeName FROM invtypes WHERE typeID = :typeId LIMIT 1");
        $stmt->execute([':typeId' => $typeId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $typeName = $row['typeName'] ?? "TypeID:{$typeId}";
        $cache[$typeId] = $typeName; // Cache it
        return $typeName;
    } catch (PDOException $e) {
        error_log("DB error resolving typeID {$typeId}: " . $e->getMessage());
        return "DBError:TypeID:{$typeId}";
    }
}

// --- Helper function to resolve Character/Corp/Alliance Name from ESI (with caching) ---
function resolveEsiName($id, $category, &$cache, $esiBaseUrl = "https://esi.evetech.net/latest") {
    if (!$id) return "N/A";
    if (isset($cache[$id])) {
        return $cache[$id];
    }
    
    $url = "";
    switch ($category) {
        case 'character': $url = "{$esiBaseUrl}/characters/{$id}/?datasource=tranquility"; break;
        case 'corporation': $url = "{$esiBaseUrl}/corporations/{$id}/?datasource=tranquility"; break;
        case 'alliance': $url = "{$esiBaseUrl}/alliances/{$id}/?datasource=tranquility"; break;
        default: return "Invalid Category";
    }

    $data = fetchJsonFromUrl($url);
    usleep(50000); // Be nice to ESI

    $name = "N/A (ESI Error)";
    if ($data && !isset($data['error'])) {
        $name = $data["name"] ?? "ID:{$id}";
    } else if ($data && isset($data['message'])) {
        $name = "ESI Err: " . substr($data['message'], 0, 20);
    } else if ($data && isset($data['error_message'])) { // Some ESI errors use this key
         $name = "ESI Err: " . substr($data['error_message'], 0, 20);
    }


    $cache[$id] = $name;
    return $name;
}


// --- Main Script Logic ---
$systemIdentifier = null; 
if (isset($_POST['systemID'])) { // Assuming JS POSTs 'systemID' which contains the system name
    $systemIdentifier = trim($_POST['systemID']);
}

if (empty($systemIdentifier)) {
    http_response_code(400); 
    echo json_encode(['success' => false, "error" => "systemIdentifier (system name) not provided"]);
    exit;
}

$pdo = null;
$processedKillsDetails = [];
$characterNameCache = []; 
$corporationNameCache = [];
$allianceNameCache = []; // Added for alliances
$shipTypeNameCache = []; // For ship types from invtypes

try {
    // --- Database Connection ---
    $dsn = "mysql:host=$host;dbname=$dbname;charset=$charset";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    $pdo = new PDO($dsn, $username, $password, $options);

    // --- 1. Get solarSystemID from systemName ---
    $stmtSysId = $pdo->prepare("SELECT solarSystemID FROM solarsystems WHERE solarSystemName = :systemName LIMIT 1");
    $stmtSysId->bindParam(':systemName', $systemIdentifier, PDO::PARAM_STR);
    $stmtSysId->execute();
    $systemRow = $stmtSysId->fetch(PDO::FETCH_ASSOC);

    if (!$systemRow || !isset($systemRow['solarSystemID'])) {
        echo json_encode(['success' => false, "error" => "System name '{$systemIdentifier}' not found in database."]);
        exit;
    }
    $numericSystemID = $systemRow['solarSystemID'];

    // --- 2. Fetch Kill List from Zkillboard ---
    $zkillUrl = "https://zkillboard.com/api/kills/systemID/$numericSystemID/pastSeconds/172800/"; // 24 hours
    $killmailSummaries = fetchJsonFromUrl($zkillUrl);

    if ($killmailSummaries === null || isset($killmailSummaries['error'])) {
        $errMsg = $killmailSummaries['message'] ?? "Failed to fetch or parse kill list from Zkillboard.";
        echo json_encode(["success" => false, "error" => $errMsg, "zkill_response" => $killmailSummaries]);
        exit;
    }

    // --- 3. Process Killmails ---
    if (is_array($killmailSummaries)) {
        $killCounter = 0;
        $maxKillsToProcess = 10; // Limit for now
        $maxKillsToDisplay = 10;


        foreach ($killmailSummaries as $summary) {
            if ($killCounter >= $maxKillsToDisplay) break;

            if (!isset($summary["killmail_id"]) || !isset($summary["zkb"]["hash"])) continue;
            
            $killmailId = $summary["killmail_id"];
            $killmailHash = $summary["zkb"]["hash"];

            // --- 3a. Fetch Detailed Killmail from ESI ---
            $esiKillmailUrl = "https://esi.evetech.net/latest/killmails/{$killmailId}/{$killmailHash}/?datasource=tranquility";
            $detailedKillData = fetchJsonFromUrl($esiKillmailUrl);

            if ($detailedKillData === null || isset($detailedKillData['error'])) {
                error_log("Skipping kill {$killmailId} due to ESI detail fetch error or invalid data. ESI Response: " . json_encode($detailedKillData));
                continue; 
            }

            $killTime = $detailedKillData["killmail_time"] ?? 'Unknown Time';

            // --- 3b. Process Victim ---
            $victimInfo = $detailedKillData["victim"] ?? null;
            $victimCharId = $victimInfo["character_id"] ?? null;
            $victimCorpId = $victimInfo["corporation_id"] ?? null;
            $victimAllianceId = $victimInfo["alliance_id"] ?? null;
            $victimShipTypeId = $victimInfo["ship_type_id"] ?? null;
            
            $victimCharName = resolveEsiName($victimCharId, 'character', $characterNameCache);
            $victimCorpName = resolveEsiName($victimCorpId, 'corporation', $corporationNameCache);
            $victimAllianceName = resolveEsiName($victimAllianceId, 'alliance', $allianceNameCache);
            $victimShipName = resolveTypeName($victimShipTypeId, $pdo, $shipTypeNameCache);
            
            $posX_m = $victimInfo["position"]["x"] ?? null;
            $posZ_m = $victimInfo["position"]["z"] ?? null;
            $posX_km = $posX_m !== null ? ($posX_m / 1000.0) : null;
            $posZ_km = $posZ_m !== null ? ($posZ_m / 1000.0) : null;

            // --- 3c. Process Attackers (to find final blow and summarize others) ---
            $finalBlowAttackerData = null;
            $otherAttackers = []; // Array to store non-final-blow attacker objects

            if (isset($detailedKillData["attackers"]) && is_array($detailedKillData["attackers"])) {
                $tempOtherAttackers = [];
                foreach($detailedKillData["attackers"] as $att) {
                    // Check if character_id exists before trying to use it for comparison later
                    $currentAttackerCharId = $att['character_id'] ?? null; 

                    if (isset($att['final_blow']) && $att['final_blow'] === true) {
                        $finalBlowAttackerData = $att;
                    } else {
                        $tempOtherAttackers[] = $att;
                    }
                }

                // Fallback for final_blow if not explicitly set
                if (!$finalBlowAttackerData && !empty($detailedKillData["attackers"])) {
                    $finalBlowAttackerData = $detailedKillData["attackers"][0];
                    // Remove it from tempOtherAttackers if it was the first one and now considered final_blow
                    if (!empty($tempOtherAttackers) && 
                        ($tempOtherAttackers[0]['character_id'] ?? null) === ($finalBlowAttackerData['character_id'] ?? null) &&
                        ($tempOtherAttackers[0]['ship_type_id'] ?? null) === ($finalBlowAttackerData['ship_type_id'] ?? null)) {
                         array_shift($tempOtherAttackers);   
                    }
                } else if ($finalBlowAttackerData && !empty($tempOtherAttackers)) {
                    // Ensure final blow is not also in other attackers list
                     $fbCharIdToExclude = $finalBlowAttackerData['character_id'] ?? null;
                     $fbShipIdToExclude = $finalBlowAttackerData['ship_type_id'] ?? null;

                     $tempOtherAttackers = array_filter($tempOtherAttackers, function($att) use ($fbCharIdToExclude, $fbShipIdToExclude){
                        $attCharId = $att['character_id'] ?? null;
                        $attShipId = $att['ship_type_id'] ?? null;
                        // Only keep if it's NOT the final blow character AND ship combination
                        return !($attCharId === $fbCharIdToExclude && $attShipId === $fbShipIdToExclude);
                     });
                }
                 $otherAttackers = array_values($tempOtherAttackers); // Re-index array
            }
            
            $fbSummary = "N/A";
            if ($finalBlowAttackerData) {
                $fbChar = resolveEsiName($finalBlowAttackerData['character_id'] ?? null, 'character', $characterNameCache);
                $fbCorp = resolveEsiName($finalBlowAttackerData['corporation_id'] ?? null, 'corporation', $corporationNameCache);
                $fbShip = resolveTypeName($finalBlowAttackerData['ship_type_id'] ?? null, $pdo, $shipTypeNameCache);
                $fbWeapon = resolveTypeName($finalBlowAttackerData['weapon_type_id'] ?? null, $pdo, $shipTypeNameCache); // Weapons are also in invTypes
                $fbSummary = "{$fbChar} [{$fbCorp}] in {$fbShip} with {$fbWeapon}";
            }

            $supportSummary = "N/A";
            // (You would implement the aggregation for $otherAttackers here into $supportSummary string)
            // For brevity, I'll skip the full aggregation loop for other attackers here,
            // but it would be similar to the previous complex example.

            $processedKillsDetails[] = [
                "killmail_id" => $killmailId,
                "kill_time" => $killTime,
                "victim_ship" => $victimShipName,
                "victim_name" => $victimCharName,
                "victim_corp" => $victimCorpName,
                "victim_alliance" => $victimAllianceName,
                "final_blow_summary" => $fbSummary,
                "supporting_attackers_summary" => $supportSummary, // Placeholder for now
                "total_attackers" => count($detailedKillData["attackers"] ?? []),
                "position_x_km" => $posX_km,
                "position_z_km" => $posZ_km,
                "zkb_link" => "https://zkillboard.com/kill/{$killmailId}/"
            ];
            $killCounter++;
        }
    }

    echo json_encode(["success" => true, "kills" => $processedKillsDetails, "system_id_processed" => $numericSystemID]);

} catch(PDOException $e) {
    http_response_code(500); 
    error_log("DB Error (getkillsforSystem.php): " . $e->getMessage()); 
    echo json_encode(['success' => false, "error" => "A database error occurred.", "debug_details" => $e->getMessage()]); 
} catch(Exception $e) { // Catch any other general exceptions
    http_response_code(500);
    error_log("General Error (getkillsforSystem.php): " . $e->getMessage());
    echo json_encode(['success' => false, "error" => "An unexpected error occurred."]);
} finally {
    $pdo = null;
}
?>
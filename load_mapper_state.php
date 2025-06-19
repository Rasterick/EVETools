<?php
// load_mapper_state.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // For development, restrict in production

require_once __DIR__ . '/config.php'; // $host, $db, $user, $pass, $charset

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

if (!isset($_GET['map_id'])) { // Changed param name to map_id for clarity
    http_response_code(400); 
    echo json_encode(['success' => false, 'message' => 'Mapper State ID (map_id) not provided.']);
    exit;
}

$mapId = $_GET['map_id'];

if (!ctype_alnum($mapId) || strlen($mapId) > 16) { 
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid Mapper State ID format.']);
    exit;
}

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    // --- QUERY THE CORRECT TABLE ---
    $stmt = $pdo->prepare("SELECT data_payload, system_name FROM system_mapper_states WHERE id = :mapId");
    $stmt->bindParam(':mapId', $mapId, PDO::PARAM_STR);
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC); // Fetch the row

    if ($row && isset($row['data_payload'])) {
        // Optionally update access count and last_accessed_at
        $updateStmt = $pdo->prepare("UPDATE system_mapper_states SET access_count = access_count + 1, last_accessed_at = CURRENT_TIMESTAMP WHERE id = :mapId");
        $updateStmt->bindParam(':mapId', $mapId, PDO::PARAM_STR);
        $updateStmt->execute();

        echo json_encode(['success' => true, 'data_payload' => $row['data_payload'], 'system_name_from_db' => $row['system_name'] ]);
    } else {
        http_response_code(404); 
        echo json_encode(['success' => false, 'message' => 'Mapper State ID not found.']);
    }
} catch (\PDOException $e) {
    http_response_code(500); 
    error_log("DB Fetch Error (load_mapper_state.php ID: ".$mapId."): " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Error fetching state data.']);
}
$pdo = null;
?>
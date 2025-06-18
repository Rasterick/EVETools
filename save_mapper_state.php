<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// save_scan.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // For local testing from file:/// or different dev domains. REMOVE/RESTRICT for production.
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Pre-flight request for CORS
    exit(0);
}

require_once __DIR__ . '/config.php'; // $host, $db, $user, $pass, $charset

// Function to generate a unique short ID
function generateShortId($length = 8) {
    // A simple random alphanumeric ID - consider a more robust unique ID generator for high traffic
    $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $charactersLength = strlen($characters);
    $randomString = '';
    for ($i = 0; $i < $length; $i++) {
        $randomString .= $characters[random_int(0, $charactersLength - 1)];
    }
    return $randomString;
}

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

// Get the JSON payload from the POST request body
$jsonPayload = file_get_contents('php://input');
$dataObject = json_decode($jsonPayload, true); // Decode it to validate and potentially extract systemName

if (!$jsonPayload || $dataObject === null) {
    http_response_code(400); // Bad Request
    echo json_encode(['success' => false, 'message' => 'Invalid or missing JSON data payload.']);
    exit;
}

// Extract systemName from the payload to store it if you add a column for it (optional but useful)
$systemName = isset($dataObject['systemName']) ? $dataObject['systemName'] : null;

// Generate a unique short ID - you might want to check for collisions in a high-volume system
$shortId = generateShortId(8); // Generate an 8-character ID

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

     $stmt = $pdo->prepare(
        "INSERT INTO system_mapper_states (id, system_name, data_payload) VALUES (:id, :system_name, :data_payload)"
    );

    $executeParams = [
        ':id' => $shortId,
        ':system_name' => $systemName, // Ensure $systemName is defined (from $dataObject['systemName'])
        ':data_payload' => $jsonPayload
    ];

    // Log what you're about to execute
    error_log("Executing INSERT with ID: " . $shortId . ", SystemName: " . $systemName);
    // error_log("Payload sample for INSERT: " . substr($jsonPayload, 0, 100)); // Already logged this

    if ($stmt->execute($executeParams)) {
        // ... success logic ...
        // Construct the shareable URL
        $baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://" . $_SERVER['HTTP_HOST'];
        
        // --- IMPORTANT: Determine path to system_mapper.html RELATIVE TO WEB ROOT ---
        // If system_mapper.html is in the web root: /system_mapper.html
        // If it's in a subdirectory, e.g., /mytools/system_mapper.html: /mytools/system_mapper.html
        $pathToMapper = "/system_mapper.html"; // <<< ADJUST THIS TO YOUR ACTUAL PATH FROM WEB ROOT
        
        $shareableUrl = $baseUrl . $pathToMapper . '?map_id=' . $shortId;


        echo json_encode([
            'success' => true, 
            'id' => $shortId, 
            'url' => $shareableUrl,
            'message' => 'Mapper state saved successfully.'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to save scan data to database.']);
    }

} catch (\PDOException $e) {
    http_response_code(500); 
    error_log("DB Insert Error (system_mapper_states.php): " . $e->getMessage() . " Payload: " . substr($jsonPayload, 0, 500));
    echo json_encode(['success' => false, 'message' => 'Database error during save. Please try again later.']);
}
?>
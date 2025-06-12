<?php
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['greeting'])) {
        echo json_encode(["message" => "POST received!", "data" => $_POST['greeting']]);
    } else {
        echo json_encode(["error" => "Greeting not in POST"]);
    }
} else {
    echo json_encode(["error" => "Not a POST request", "method" => $_SERVER['REQUEST_METHOD']]);
}
?>
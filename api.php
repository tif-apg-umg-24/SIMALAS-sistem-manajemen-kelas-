<?php
// =====================================================
// File: api.php
// SIMALAS API Backend untuk MySQL
// Database: db_simalas
// =====================================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// =====================================================
// DATABASE CONNECTION
// =====================================================
class Database {
    private $host = "localhost";
    private $db_name = "db_simalas"; // 👈 NAMA DATABASE DIUBAH
    private $username = "root"; // default XAMPP
    private $password = ""; // default XAMPP (kosong)
    private $conn;

    public function getConnection() {
        $this->conn = null;
        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name,
                $this->username,
                $this->password,
                array(PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4")
            );
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch(PDOException $e) {
            echo json_encode(array(
                "success" => false,
                "message" => "Connection failed: " . $e->getMessage()
            ));
            exit();
        }
        return $this->conn;
    }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================
function response($success, $message = "", $data = null) {
    echo json_encode(array(
        "success" => $success,
        "message" => $message,
        "data" => $data
    ));
    exit();
}

// =====================================================
// MAIN ROUTER
// =====================================================
$database = new Database();
$db = $database->getConnection();

$action = isset($_GET['action']) ? $_GET['action'] : '';
$method = $_SERVER['REQUEST_METHOD'];

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

// =====================================================
// LOGIN
// =====================================================
if ($action === 'login' && $method === 'POST') {
    $nim = isset($input['nim']) ? trim($input['nim']) : '';
    $password = isset($input['password']) ? trim($input['password']) : '';
    
    if (empty($nim) || empty($password)) {
        response(false, "NIM dan password harus diisi");
    }
    
    $query = "SELECT * FROM users WHERE nim = :nim LIMIT 1";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':nim', $nim);
    $stmt->execute();
    
    if ($stmt->rowCount() > 0) {
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($user['password'] === $password) {
            unset($user['password']); // Don't send password back
            response(true, "Login berhasil", $user);
        } else {
            response(false, "Password salah");
        }
    } else {
        response(false, "NIM tidak terdaftar");
    }
}

// =====================================================
// USERS
// =====================================================
if ($action === 'users' && $method === 'GET') {
    $query = "SELECT nim, name, role FROM users ORDER BY name";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    response(true, "", $users);
}

// Change Password
if ($action === 'change_password' && $method === 'POST') {
    $nim = $input['nim'];
    $old_password = $input['old_password'];
    $new_password = $input['new_password'];
    
    // Verify old password
    $query = "SELECT password FROM users WHERE nim = :nim";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':nim', $nim);
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user || $user['password'] !== $old_password) {
        response(false, "Password lama salah");
    }
    
    // Update password
    $query = "UPDATE users SET password = :password WHERE nim = :nim";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':password', $new_password);
    $stmt->bindParam(':nim', $nim);
    
    if ($stmt->execute()) {
        response(true, "Password berhasil diubah");
    } else {
        response(false, "Gagal mengubah password");
    }
}

// =====================================================
// MATERIALS
// =====================================================
if ($action === 'materials' && $method === 'GET') {
    $query = "SELECT m.*, u.name as uploader_name 
              FROM materials m 
              LEFT JOIN users u ON m.uploaded_by = u.nim 
              ORDER BY m.id DESC";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $materials = $stmt->fetchAll(PDO::FETCH_ASSOC);
    response(true, "", $materials);
}

if ($action === 'materials' && $method === 'POST') {
    $data = $input;
    
    $query = "INSERT INTO materials (title, scope, course, upload_type, type, filename, 
              size, download_url, storage_path, link, uploaded_by) 
              VALUES (:title, :scope, :course, :upload_type, :type, :filename, 
              :size, :download_url, :storage_path, :link, :uploaded_by)";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':title', $data['title']);
    $stmt->bindParam(':scope', $data['scope']);
    $stmt->bindParam(':course', $data['course']);
    $stmt->bindParam(':upload_type', $data['upload_type']);
    $stmt->bindParam(':type', $data['type']);
    $stmt->bindParam(':filename', $data['filename']);
    $stmt->bindParam(':size', $data['size']);
    $stmt->bindParam(':download_url', $data['download_url']);
    $stmt->bindParam(':storage_path', $data['storage_path']);
    $stmt->bindParam(':link', $data['link']);
    $stmt->bindParam(':uploaded_by', $data['uploaded_by']);
    
    if ($stmt->execute()) {
        $data['id'] = $db->lastInsertId();
        response(true, "Materi berhasil ditambahkan", $data);
    } else {
        response(false, "Gagal menambahkan materi");
    }
}

if ($action === 'materials' && $method === 'DELETE') {
    $id = isset($_GET['id']) ? $_GET['id'] : 0;
    
    $query = "DELETE FROM materials WHERE id = :id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':id', $id);
    
    if ($stmt->execute()) {
        response(true, "Materi berhasil dihapus");
    } else {
        response(false, "Gagal menghapus materi");
    }
}

// =====================================================
// TASKS
// =====================================================
if ($action === 'tasks' && $method === 'GET') {
    $query = "SELECT t.*, u.name as creator_name 
              FROM tasks t 
              LEFT JOIN users u ON t.created_by = u.nim 
              ORDER BY t.deadline ASC";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
    response(true, "", $tasks);
}

if ($action === 'tasks' && $method === 'POST') {
    $data = $input;
    
    $query = "INSERT INTO tasks (title, course, deadline, submission_link, description, created_by) 
              VALUES (:title, :course, :deadline, :submission_link, :description, :created_by)";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':title', $data['title']);
    $stmt->bindParam(':course', $data['course']);
    $stmt->bindParam(':deadline', $data['deadline']);
    $stmt->bindParam(':submission_link', $data['submission_link']);
    $stmt->bindParam(':description', $data['description']);
    $stmt->bindParam(':created_by', $data['created_by']);
    
    if ($stmt->execute()) {
        $data['id'] = $db->lastInsertId();
        response(true, "Tugas berhasil ditambahkan", $data);
    } else {
        response(false, "Gagal menambahkan tugas");
    }
}

if ($action === 'tasks' && $method === 'PUT') {
    $data = $input;
    $id = $data['id'];
    
    $query = "UPDATE tasks SET title = :title, course = :course, deadline = :deadline, 
              submission_link = :submission_link, description = :description 
              WHERE id = :id";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':title', $data['title']);
    $stmt->bindParam(':course', $data['course']);
    $stmt->bindParam(':deadline', $data['deadline']);
    $stmt->bindParam(':submission_link', $data['submission_link']);
    $stmt->bindParam(':description', $data['description']);
    $stmt->bindParam(':id', $id);
    
    if ($stmt->execute()) {
        response(true, "Tugas berhasil diupdate");
    } else {
        response(false, "Gagal mengupdate tugas");
    }
}

if ($action === 'tasks' && $method === 'DELETE') {
    $id = isset($_GET['id']) ? $_GET['id'] : 0;
    
    $query = "DELETE FROM tasks WHERE id = :id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':id', $id);
    
    if ($stmt->execute()) {
        response(true, "Tugas berhasil dihapus");
    } else {
        response(false, "Gagal menghapus tugas");
    }
}

// =====================================================
// TASK STATUS
// =====================================================
if ($action === 'task_status' && $method === 'GET') {
    $nim = isset($_GET['nim']) ? $_GET['nim'] : '';
    
    if ($nim) {
        $query = "SELECT * FROM task_status WHERE nim = :nim";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':nim', $nim);
    } else {
        $query = "SELECT * FROM task_status";
        $stmt = $db->prepare($query);
    }
    
    $stmt->execute();
    $statuses = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Convert to format: {task_id: {nim: true}}
    $result = array();
    foreach ($statuses as $status) {
        if (!isset($result[$status['task_id']])) {
            $result[$status['task_id']] = array();
        }
        $result[$status['task_id']][$status['nim']] = (bool)$status['completed'];
    }
    
    response(true, "", $result);
}

if ($action === 'task_status' && $method === 'POST') {
    $task_id = $input['task_id'];
    $nim = $input['nim'];
    $completed = isset($input['completed']) ? $input['completed'] : true;
    
    if ($completed) {
        $query = "INSERT INTO task_status (task_id, nim, completed, completed_at) 
                  VALUES (:task_id, :nim, 1, NOW()) 
                  ON DUPLICATE KEY UPDATE completed = 1, completed_at = NOW()";
    } else {
        $query = "DELETE FROM task_status WHERE task_id = :task_id AND nim = :nim";
    }
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':task_id', $task_id);
    $stmt->bindParam(':nim', $nim);
    
    if ($stmt->execute()) {
        response(true, "Status berhasil diupdate");
    } else {
        response(false, "Gagal mengupdate status");
    }
}

// =====================================================
// EVENTS
// =====================================================
if ($action === 'events' && $method === 'GET') {
    $nim = isset($_GET['nim']) ? $_GET['nim'] : '';
    
    if ($nim) {
        $query = "SELECT * FROM events WHERE created_by = :nim ORDER BY date ASC";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':nim', $nim);
    } else {
        $query = "SELECT * FROM events ORDER BY date ASC";
        $stmt = $db->prepare($query);
    }
    
    $stmt->execute();
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
    response(true, "", $events);
}

if ($action === 'events' && $method === 'POST') {
    $data = $input;
    
    $query = "INSERT INTO events (title, date, location, description, created_by) 
              VALUES (:title, :date, :location, :description, :created_by)";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':title', $data['title']);
    $stmt->bindParam(':date', $data['date']);
    $stmt->bindParam(':location', $data['location']);
    $stmt->bindParam(':description', $data['description']);
    $stmt->bindParam(':created_by', $data['created_by']);
    
    if ($stmt->execute()) {
        $data['id'] = $db->lastInsertId();
        response(true, "Acara berhasil ditambahkan", $data);
    } else {
        response(false, "Gagal menambahkan acara");
    }
}

if ($action === 'events' && $method === 'PUT') {
    $data = $input;
    $id = $data['id'];
    
    $query = "UPDATE events SET title = :title, date = :date, location = :location, 
              description = :description WHERE id = :id";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':title', $data['title']);
    $stmt->bindParam(':date', $data['date']);
    $stmt->bindParam(':location', $data['location']);
    $stmt->bindParam(':description', $data['description']);
    $stmt->bindParam(':id', $id);
    
    if ($stmt->execute()) {
        response(true, "Acara berhasil diupdate");
    } else {
        response(false, "Gagal mengupdate acara");
    }
}

if ($action === 'events' && $method === 'DELETE') {
    $id = isset($_GET['id']) ? $_GET['id'] : 0;
    
    $query = "DELETE FROM events WHERE id = :id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':id', $id);
    
    if ($stmt->execute()) {
        response(true, "Acara berhasil dihapus");
    } else {
        response(false, "Gagal menghapus acara");
    }
}

// =====================================================
// KAS
// =====================================================
if ($action === 'kas' && $method === 'GET') {
    $query = "SELECT * FROM kas ORDER BY name";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $kas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    response(true, "", $kas);
}

if ($action === 'kas' && $method === 'POST') {
    $data = $input;
    
    $query = "INSERT INTO kas (nim, name, amount, paid) 
              VALUES (:nim, :name, :amount, :paid)";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':nim', $data['nim']);
    $stmt->bindParam(':name', $data['name']);
    $stmt->bindParam(':amount', $data['amount']);
    $paid = isset($data['paid']) ? $data['paid'] : false;
    $stmt->bindParam(':paid', $paid);
    
    if ($stmt->execute()) {
        $data['id'] = $db->lastInsertId();
        response(true, "Anggota kas berhasil ditambahkan", $data);
    } else {
        response(false, "Gagal menambahkan anggota kas");
    }
}

if ($action === 'kas' && $method === 'PUT') {
    $data = $input;
    $id = $data['id'];
    
    // Check if only toggling paid status
    if (isset($data['paid']) && count($data) == 2) {
        $query = "UPDATE kas SET paid = :paid WHERE id = :id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':paid', $data['paid']);
        $stmt->bindParam(':id', $id);
    } else {
        $query = "UPDATE kas SET name = :name, amount = :amount WHERE id = :id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':name', $data['name']);
        $stmt->bindParam(':amount', $data['amount']);
        $stmt->bindParam(':id', $id);
    }
    
    if ($stmt->execute()) {
        response(true, "Kas berhasil diupdate");
    } else {
        response(false, "Gagal mengupdate kas");
    }
}

if ($action === 'kas' && $method === 'DELETE') {
    $id = isset($_GET['id']) ? $_GET['id'] : 0;
    
    $query = "DELETE FROM kas WHERE id = :id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':id', $id);
    
    if ($stmt->execute()) {
        response(true, "Anggota kas berhasil dihapus");
    } else {
        response(false, "Gagal menghapus anggota kas");
    }
}

// =====================================================
// FILE UPLOAD
// =====================================================
if ($action === 'upload_file' && $method === 'POST') {
    $response = array();
    
    if (isset($_FILES['file'])) {
        $file = $_FILES['file'];
        $upload_dir = 'uploads/materials/';
        
        // Create directory if not exists
        if (!file_exists($upload_dir)) {
            mkdir($upload_dir, 0777, true);
        }
        
        $filename = time() . '_' . basename($file['name']);
        $target_file = $upload_dir . $filename;
        
        if (move_uploaded_file($file['tmp_name'], $target_file)) {
            $response['success'] = true;
            $response['filename'] = $file['name'];
            $response['filepath'] = $target_file;
            $response['url'] = 'http://localhost/simalas/' . $target_file; // Adjust URL
            $response['size'] = round($file['size'] / (1024 * 1024), 2) . ' MB';
        } else {
            $response['success'] = false;
            $response['message'] = 'Gagal upload file';
        }
    } else {
        $response['success'] = false;
        $response['message'] = 'File tidak ditemukan';
    }
    
    echo json_encode($response);
    exit();
}

// Default response
response(false, "Invalid action or method");
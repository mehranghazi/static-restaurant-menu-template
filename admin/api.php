<?php
// Optional admin API for PHP hosting (PHP 7.4+). Routes: ?route=session|login|logout|menu|image
// - Password: PBKDF2 hash stored in admin/config.php (create it with `npm run admin:setup`).
// - Session cookie (HttpOnly, SameSite=Strict) + CSRF token on every write.
// - Writes only data/menu.json and images/menu/<id>.(webp|jpg|png), one level above this folder.
// - Messages are English; admin.js shows the translated texts for login problems.

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_FAILURES = 5;
const LOCK_SECONDS = 900;

$siteRoot = dirname(__DIR__);
$menuFile = $siteRoot . '/data/menu.json';
$imageDir = $siteRoot . '/images/menu';
$configFile = __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond($status, $body)
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

function fail($status, $message)
{
    respond($status, ['error' => $message]);
}

$isHttps = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
session_name('menu_admin');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => rtrim(dirname($_SERVER['SCRIPT_NAME']), '/') . '/',
    'secure' => $isHttps,
    'httponly' => true,
    'samesite' => 'Strict',
]);
session_start();

$config = is_file($configFile) ? include $configFile : null;
$configured = is_array($config) && isset($config['salt'], $config['hash'], $config['iterations']);
$route = isset($_GET['route']) ? (string) $_GET['route'] : '';
$method = $_SERVER['REQUEST_METHOD'];
$authenticated = !empty($_SESSION['authenticated']);

function requireAuth($authenticated)
{
    if (!$authenticated) {
        fail(401, 'Not logged in');
    }
}

function requireCsrf()
{
    $sent = isset($_SERVER['HTTP_X_CSRF_TOKEN']) ? $_SERVER['HTTP_X_CSRF_TOKEN'] : '';
    $expected = isset($_SESSION['csrf']) ? $_SESSION['csrf'] : '';
    if ($expected === '' || !hash_equals($expected, $sent)) {
        fail(403, 'Invalid security token. Reload the page and log in again.');
    }
}

function readBody()
{
    $length = isset($_SERVER['CONTENT_LENGTH']) ? (int) $_SERVER['CONTENT_LENGTH'] : 0;
    if ($length > MAX_BYTES) {
        fail(413, 'File too large');
    }
    $body = file_get_contents('php://input', false, null, 0, MAX_BYTES + 1);
    if ($body === false || strlen($body) > MAX_BYTES) {
        fail(413, 'File too large');
    }
    return $body;
}

function validId($id)
{
    return is_string($id) && preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $id) === 1 && strlen($id) <= 80;
}

function validateMenu($menu)
{
    if (!is_array($menu) || !isset($menu['categories']) || !is_array($menu['categories'])) {
        fail(400, 'Invalid menu');
    }
    $ids = [];
    foreach ($menu['categories'] as $category) {
        if (!is_array($category) || !isset($category['id'], $category['name']) || !validId($category['id']) || !is_string($category['name']) || $category['name'] === '') {
            fail(400, 'Invalid category');
        }
        if (!isset($category['items']) || !is_array($category['items'])) {
            fail(400, 'Invalid items');
        }
        foreach ($category['items'] as $item) {
            $id = is_array($item) && isset($item['id']) ? $item['id'] : null;
            if (!validId($id) || isset($ids[$id])) {
                fail(400, 'Invalid or duplicate id: ' . (is_string($id) ? $id : '?'));
            }
            $ids[$id] = true;
            if (!isset($item['name']) || !is_string($item['name']) || trim($item['name']) === '' || mb_strlen($item['name']) > 200) {
                fail(400, 'Missing name: ' . $id);
            }
            if (isset($item['nameAlt']) && (!is_string($item['nameAlt']) || mb_strlen($item['nameAlt']) > 200)) {
                fail(400, 'Invalid second name: ' . $id);
            }
            if (!array_key_exists('price', $item) || ($item['price'] !== null && (!(is_int($item['price']) || is_float($item['price'])) || !($item['price'] > 0) || $item['price'] > 100000000))) {
                fail(400, 'Invalid price: ' . $id);
            }
            if (!array_key_exists('image', $item) || ($item['image'] !== null && (!is_string($item['image']) || preg_match('/^images\/menu\/[a-z0-9-]+\.(webp|jpg|png)(\?v=\d+)?$/', $item['image']) !== 1))) {
                fail(400, 'Invalid image path: ' . $id);
            }
            if (isset($item['imageAlt']) && (!is_string($item['imageAlt']) || mb_strlen($item['imageAlt']) > 300)) {
                fail(400, 'Invalid alt text: ' . $id);
            }
            if (isset($item['description']) && (!is_string($item['description']) || mb_strlen($item['description']) > 600)) {
                fail(400, 'Invalid description: ' . $id);
            }
        }
    }
}

function writeMenu($menuFile, $menu)
{
    $dir = dirname($menuFile);
    if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
        fail(500, 'Cannot create data folder');
    }
    if (is_file($menuFile)) {
        @copy($menuFile, $dir . '/menu.backup.json');
    }
    $json = json_encode($menu, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "\n";
    $temp = $menuFile . '.tmp';
    if (file_put_contents($temp, $json, LOCK_EX) === false || !rename($temp, $menuFile)) {
        @unlink($temp);
        fail(500, 'Cannot write menu file. Check folder permissions.');
    }
}

function removeImages($imageDir, $id)
{
    foreach (['webp', 'jpg', 'png'] as $extension) {
        $path = $imageDir . '/' . $id . '.' . $extension;
        if (is_file($path)) {
            @unlink($path);
        }
    }
}

function lockFile()
{
    $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
    return sys_get_temp_dir() . '/menu_admin_login_' . md5($ip);
}

function loginState()
{
    $file = lockFile();
    $state = is_file($file) ? json_decode((string) file_get_contents($file), true) : null;
    if (!is_array($state) || !isset($state['count'], $state['since']) || time() - $state['since'] > LOCK_SECONDS) {
        return ['count' => 0, 'since' => time()];
    }
    return $state;
}

if ($route === 'session' && $method === 'GET') {
    respond(200, [
        'configured' => $configured,
        'authenticated' => $authenticated,
        'login' => true,
        'csrf' => $authenticated ? $_SESSION['csrf'] : '',
    ]);
}

if ($route === 'login' && $method === 'POST') {
    if (!$configured) {
        fail(500, 'Password is not configured');
    }
    $state = loginState();
    if ($state['count'] >= MAX_FAILURES) {
        fail(429, 'Too many failed attempts. Try again in 15 minutes.');
    }
    $input = json_decode((string) file_get_contents('php://input', false, null, 0, 4096), true);
    $password = is_array($input) && isset($input['password']) && is_string($input['password']) ? $input['password'] : '';
    $derived = hash_pbkdf2('sha256', $password, (string) $config['salt'], (int) $config['iterations'], 64, false);
    if ($password === '' || !hash_equals((string) $config['hash'], $derived)) {
        $state['count']++;
        @file_put_contents(lockFile(), json_encode($state), LOCK_EX);
        usleep(700000);
        fail(401, 'Wrong password.');
    }
    @unlink(lockFile());
    session_regenerate_id(true);
    $_SESSION['authenticated'] = true;
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    respond(200, ['ok' => true, 'csrf' => $_SESSION['csrf']]);
}

if ($route === 'logout' && $method === 'POST') {
    $_SESSION = [];
    session_destroy();
    respond(200, ['ok' => true]);
}

if ($route === 'menu' && $method === 'GET') {
    requireAuth($authenticated);
    $raw = is_file($menuFile) ? file_get_contents($menuFile) : false;
    if ($raw === false) {
        fail(500, 'Menu file not found');
    }
    http_response_code(200);
    echo $raw;
    exit;
}

if ($route === 'menu' && $method === 'PUT') {
    requireAuth($authenticated);
    requireCsrf();
    $menu = json_decode(readBody(), true);
    validateMenu($menu);
    writeMenu($menuFile, $menu);
    respond(200, ['ok' => true]);
}

if ($route === 'image' && $method === 'PUT') {
    requireAuth($authenticated);
    requireCsrf();
    $id = isset($_GET['id']) ? $_GET['id'] : '';
    if (!validId($id)) {
        fail(400, 'Invalid id');
    }
    $body = readBody();
    $info = $body === '' ? false : @getimagesizefromstring($body);
    $types = [IMAGETYPE_WEBP => 'webp', IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png'];
    if ($info === false || !isset($types[$info[2]])) {
        fail(400, 'Only WebP, JPEG or PNG images are allowed');
    }
    $extension = $types[$info[2]];
    if (!is_dir($imageDir) && !mkdir($imageDir, 0755, true)) {
        fail(500, 'Cannot create images folder');
    }
    removeImages($imageDir, $id);
    if (file_put_contents($imageDir . '/' . $id . '.' . $extension, $body, LOCK_EX) === false) {
        fail(500, 'Cannot write image. Check folder permissions.');
    }
    respond(200, ['image' => 'images/menu/' . $id . '.' . $extension . '?v=' . time()]);
}

if ($route === 'image' && $method === 'DELETE') {
    requireAuth($authenticated);
    requireCsrf();
    $id = isset($_GET['id']) ? $_GET['id'] : '';
    if (!validId($id)) {
        fail(400, 'Invalid id');
    }
    removeImages($imageDir, $id);
    respond(200, ['ok' => true]);
}

fail(404, 'Not found');

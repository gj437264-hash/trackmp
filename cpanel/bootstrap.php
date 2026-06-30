<?php
// /app/cpanel/bootstrap.php — DB, session, helpers (loaded by every page)
declare(strict_types=1);

session_start();

// ----- Load config -----
$configFile = __DIR__ . '/config.php';
if (!file_exists($configFile)) {
    die("Missing config.php — copy config.example.php to config.php and fill in your cPanel database credentials.");
}
require $configFile;

// ----- DB (PDO MySQL) -----
function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER, DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
    }
    return $pdo;
}

// ----- Helpers -----
function e(?string $s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function url(string $p): string { return BASE_URL . $p; }
function redirect(string $p): void { header('Location: ' . url($p)); exit; }
function user(): ?array { return $_SESSION['user'] ?? null; }
function require_login(): array {
    $u = user();
    if (!$u) redirect('/login.php?next=' . urlencode($_SERVER['REQUEST_URI'] ?? '/'));
    return $u;
}
function csrf(): string {
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}
function check_csrf(): void {
    if (($_POST['csrf'] ?? '') !== ($_SESSION['csrf'] ?? '__none__')) {
        http_response_code(400);
        die('Invalid CSRF token. Please go back and try again.');
    }
}
function flash(?string $msg = null, string $type = 'info'): ?array {
    if ($msg !== null) { $_SESSION['flash'] = ['msg' => $msg, 'type' => $type]; return null; }
    $f = $_SESSION['flash'] ?? null; unset($_SESSION['flash']); return $f;
}
function tenure(?string $sinceDate): string {
    if (!$sinceDate) return '—';
    try {
        $since = new DateTime($sinceDate);
        $now = new DateTime();
        $d = $since->diff($now);
        $years = $d->y; $months = $d->m;
        if ($years === 0 && $months === 0) return 'Less than a month';
        $parts = [];
        if ($years) $parts[] = $years . ' yr' . ($years > 1 ? 's' : '');
        if ($months) $parts[] = $months . ' mo';
        return implode(' ', $parts);
    } catch (Throwable) { return '—'; }
}
function status_badge(string $s): string {
    $map = [
        'delivered' => ['bg-green-50 text-green-700 border-green-200', 'Delivered'],
        'in_progress' => ['bg-amber-50 text-amber-700 border-amber-200', 'In Progress'],
        'pending' => ['bg-zinc-100 text-zinc-700 border-zinc-200', 'Pending'],
        'broken' => ['bg-red-50 text-red-700 border-red-200', 'Broken'],
    ];
    [$cls, $label] = $map[$s] ?? $map['pending'];
    return '<span class="inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-md ' . $cls . '">' . e($label) . '</span>';
}
function fmt_money(?float $n): string {
    if ($n === null) return '—';
    return CURRENCY_SYMBOL . number_format($n, 0);
}

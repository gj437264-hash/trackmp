<?php
// /app/cpanel/install.php — Run ONCE to create DB tables and seed the admin user.
// Visit https://yourdomain.com/install.php in a browser, then DELETE this file.
require __DIR__ . '/bootstrap.php';

$pdo = db();

$schema = [
"CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(190) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

"CREATE TABLE IF NOT EXISTS politicians (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(180) NOT NULL,
    party VARCHAR(120) NOT NULL,
    position VARCHAR(160) NOT NULL,
    position_since DATE NULL,
    country VARCHAR(80) NOT NULL,
    state VARCHAR(120) NOT NULL,
    city VARCHAR(120) NOT NULL DEFAULT '',
    constituency VARCHAR(180) NOT NULL,
    photo_url VARCHAR(500) NULL,
    bio TEXT NULL,
    verified TINYINT(1) NOT NULL DEFAULT 0,
    created_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX (country), INDEX (state), INDEX (city), INDEX (constituency), INDEX (party)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

"CREATE TABLE IF NOT EXISTS promises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    politician_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    date_made DATE NULL,
    source_url VARCHAR(500) NULL,
    created_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX (politician_id), INDEX (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

"CREATE TABLE IF NOT EXISTS works (
    id INT AUTO_INCREMENT PRIMARY KEY,
    politician_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    work_date DATE NULL,
    source_url VARCHAR(500) NULL,
    created_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX (politician_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

"CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    politician_id INT NOT NULL,
    body TEXT NOT NULL,
    created_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX (politician_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

"CREATE TABLE IF NOT EXISTS ratings (
    politician_id INT NOT NULL,
    user_id INT NOT NULL,
    score TINYINT NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (politician_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",

"CREATE TABLE IF NOT EXISTS wealth_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    politician_id INT NOT NULL,
    as_of_date DATE NOT NULL,
    annual_income DECIMAL(15,2) NULL,
    net_worth DECIMAL(15,2) NULL,
    source_url VARCHAR(500) NULL,
    notes TEXT NULL,
    created_by INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX (politician_id), INDEX (as_of_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
];

foreach ($schema as $sql) $pdo->exec($sql);

// Seed admin
$adminEmail = strtolower(ADMIN_EMAIL);
$stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
$stmt->execute([$adminEmail]);
if (!$stmt->fetch()) {
    $hash = password_hash(ADMIN_PASSWORD, PASSWORD_BCRYPT);
    $pdo->prepare("INSERT INTO users (email, name, password_hash, role) VALUES (?, 'Admin', ?, 'admin')")
        ->execute([$adminEmail, $hash]);
    $adminMsg = "Admin user created: <code>$adminEmail</code> / <code>" . e(ADMIN_PASSWORD) . "</code>";
} else {
    $adminMsg = "Admin already exists: <code>$adminEmail</code>";
}
?>
<!doctype html>
<html><head><meta charset="utf-8"><title>Install</title>
<script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-zinc-50 text-zinc-900">
<div class="max-w-2xl mx-auto p-10">
<h1 class="text-3xl font-bold">Installation complete</h1>
<p class="mt-3 text-zinc-700">All tables created in <b><?= e(DB_NAME) ?></b>.</p>
<p class="mt-2"><?= $adminMsg ?></p>
<div class="mt-6 p-4 border border-red-300 bg-red-50 text-red-800 rounded">
  <b>Important:</b> delete <code>install.php</code> from your server now, and change the admin password by editing <code>config.php</code> and re-running.
</div>
<p class="mt-6"><a class="text-blue-600 underline" href="<?= url('/') ?>">Go to the site →</a></p>
</div></body></html>

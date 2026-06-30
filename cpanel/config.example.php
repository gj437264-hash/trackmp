<?php
// /app/cpanel/config.example.php
// Copy this file to config.php and fill in your cPanel DB credentials.

define('DB_HOST', 'localhost');                  // cPanel: usually 'localhost'
define('DB_NAME', 'youruser_trackmp');           // cPanel DB name (with prefix)
define('DB_USER', 'youruser_trackmp');           // cPanel DB user
define('DB_PASS', 'CHANGE_ME');                  // cPanel DB password

// Public base URL where the app lives. Examples:
//   '' if installed at the document root          → site.com/
//   '/trackmp' if installed in a subfolder        → site.com/trackmp/
define('BASE_URL', '');

// Display currency for income/wealth entries
define('CURRENCY_SYMBOL', '$');

// Site name + admin bootstrap
define('SITE_NAME', 'TrackMP');
define('ADMIN_EMAIL', 'admin@example.com');
define('ADMIN_PASSWORD', 'admin123');            // CHANGE this before going live

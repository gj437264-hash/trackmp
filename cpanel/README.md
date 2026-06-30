# TrackMP — cPanel / Shared Hosting Edition

A self-contained PHP + MySQL version of TrackMP that drops straight into any cPanel public_html. No build step, no Node, no MongoDB — just upload, configure, and run.

## What's included

- **Country / state / city / constituency** taxonomy with all four exposed as sortable filters in the feed.
- **Position + "in position since"** — tenure is auto-computed and shown live (e.g. "4 yrs 3 mo").
- **Wealth tracker** — log annual income and net worth over time, with per-row growth % and an overall growth summary on the profile.
- **Public 1–5 star rating** averaged across all logged-in voters.
- **Promises** with status tracker (pending / in progress / delivered / broken).
- **Work / achievement** log with sources.
- **Discussion** thread per politician.
- **Admin verification** badge (admin role only).
- **My contributions** page so each user can see their own additions.
- Sort the feed by: recency, name, longest tenure, newest in position, public rating, most delivered, most promises, highest net worth.

## Requirements
- PHP **8.0+** (cPanel "MultiPHP Manager" — set domain to PHP 8.0 or newer)
- MySQL / MariaDB
- Tailwind is loaded from a CDN — **no build tools needed**

## Install (cPanel)

1. **Create a MySQL database**
   - cPanel → **MySQL Databases**
   - Create DB (e.g. `youruser_trackmp`)
   - Create a user, set a strong password
   - Add the user to the DB with **ALL PRIVILEGES**

2. **Upload the files**
   - cPanel → **File Manager**
   - Go into `public_html/` (or a subfolder, e.g. `public_html/trackmp/`)
   - Upload everything from `/app/cpanel/` (or upload the folder as a `.zip` and use "Extract")

3. **Configure**
   - Copy `config.example.php` to `config.php` (right-click → Copy in File Manager)
   - Edit `config.php`:
     ```php
     define('DB_HOST', 'localhost');
     define('DB_NAME', 'youruser_trackmp');
     define('DB_USER', 'youruser_trackmp');
     define('DB_PASS', 'your_strong_password');
     define('BASE_URL', '');                  // '/trackmp' if installed in a subfolder
     define('CURRENCY_SYMBOL', '$');          // change to '₹', '€', etc. if needed
     define('SITE_NAME', 'TrackMP');
     define('ADMIN_EMAIL', 'you@yourdomain.com');
     define('ADMIN_PASSWORD', 'CHANGE_THIS_NOW');
     ```

4. **Run the installer (once)**
   - Visit `https://yourdomain.com/install.php` in a browser.
   - You should see "Installation complete".
   - **DELETE `install.php`** from the server immediately afterwards.

5. **Log in**
   - Visit `https://yourdomain.com/`
   - Click **Login** and sign in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `config.php`
   - Anyone else can register at `/register.php`

## Going live checklist

- [ ] Enabled SSL in cPanel (AutoSSL / Let's Encrypt)
- [ ] Uncommented the HTTPS-redirect block in `.htaccess`
- [ ] Changed `ADMIN_PASSWORD` to something strong
- [ ] Deleted `install.php`
- [ ] Configured a daily DB backup in cPanel → **Backup Wizard**

## File map

| File | Purpose |
|---|---|
| `index.php` | Landing page with hero + live stats |
| `feed.php` | Searchable, filterable list of politicians |
| `politician.php` | Profile page — promises, wealth, work, discussion, rating, admin verify, share |
| `new.php` | Add a politician (also handles `?id=` for edit) |
| `me.php` | Logged-in user's contributions |
| `login.php` / `register.php` / `logout.php` | Auth |
| `install.php` | One-time DB setup + admin seed (delete after running) |
| `bootstrap.php` | DB + session + helpers (loaded by every page) |
| `layout.php` | Header / footer / Tailwind |
| `config.example.php` → `config.php` | Your credentials (never commit `config.php`) |
| `.htaccess` | Locks down internal files, optional HTTPS redirect |

## Updating

Just upload the new files via File Manager or FTP. Schema changes can be applied by re-running `install.php` (it uses `CREATE TABLE IF NOT EXISTS`, so existing tables are kept intact). For destructive schema changes, run the matching `ALTER TABLE` manually via phpMyAdmin.

## Security notes

- All HTML output is HTML-escaped via the `e()` helper.
- All forms include a CSRF token validated server-side.
- Passwords use `password_hash()` with bcrypt.
- DB queries use PDO prepared statements throughout.
- `config.php`, `bootstrap.php`, `layout.php` are denied direct HTTP access via `.htaccess`.

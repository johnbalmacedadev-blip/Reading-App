# Deploy to cPanel — Lecture Portal

This app is a **Laravel API + React SPA** served from the same domain (recommended for cPanel).

| Part | Folder |
|------|--------|
| Backend (Laravel) | `backend/` |
| Frontend (React) | `Teacher Dashboard/` |
| Web root (document root) | `backend/public/` |

---

## 1. Requirements on cPanel

- **PHP 8.2+** (MultiPHP Manager)
- Extensions: `mbstring`, `openssl`, `pdo_mysql`, `tokenizer`, `xml`, `ctype`, `json`, `fileinfo`, `bcmath`
- **MySQL** database
- **Composer** (via SSH Terminal, or upload `vendor/` from your PC)
- **Node.js 18+** (only needed on your PC to build the frontend, not on the server)

---

## 2. Build locally (before upload)

On your computer, in the project root:

```bash
# 1. Install frontend dependencies (first time only)
cd "Teacher Dashboard"
npm install

# 2. Production build — outputs to backend/public/app.html + backend/public/assets/
npm run build:deploy
```

```bash
# 3. Install PHP dependencies (production only, no dev packages)
cd ../backend
composer install --no-dev --optimize-autoloader
```

---

## 3. Upload files to cPanel

### Recommended folder layout

```
/home/youruser/
  lecture-portal/          ← upload project here (OUTSIDE public_html)
    backend/
    Teacher Dashboard/       ← optional on server (only needed if you build on server)
    scripts/
  public_html/             ← point document root HERE (see step 4)
```

**Upload these (via File Manager or FTP):**

- Entire `backend/` folder **except**:
  - `backend/.env` (create on server — see step 5)
  - `backend/node_modules/` (if any)
  - `backend/storage/logs/*` (empty folder is fine)
- Ensure these exist after build:
  - `backend/public/app.html`
  - `backend/public/assets/`
  - `backend/public/index.php`
  - `backend/public/.htaccess`

**Do not upload:** `node_modules`, `.git`, local `.env` files with secrets.

---

## 4. Point the domain to Laravel `public/`

### Option A — Change document root (best)

In cPanel → **Domains** → your domain → **Document Root**:

Set to:
```
/home/youruser/lecture-portal/backend/public
```

### Option B — Symlink `public_html` (if you cannot change doc root)

In **Terminal**:

```bash
cd ~
rm -rf public_html
ln -s ~/lecture-portal/backend/public public_html
```

---

## 5. Configure environment on server

```bash
cd ~/lecture-portal/backend
cp .env.production.example .env
nano .env   # or edit in cPanel File Manager
```

**Update these values:**

| Variable | Example |
|----------|---------|
| `APP_URL` | `https://yourdomain.com` |
| `APP_KEY` | Run `php artisan key:generate` |
| `DB_DATABASE` | cPanel MySQL database name |
| `DB_USERNAME` | cPanel MySQL user |
| `DB_PASSWORD` | MySQL password |
| `SESSION_DOMAIN` | `yourdomain.com` |
| `SANCTUM_STATEFUL_DOMAINS` | `yourdomain.com,www.yourdomain.com` |

Generate app key:

```bash
php artisan key:generate
```

---

## 6. Database setup

In cPanel → **MySQL Databases**: create database + user, assign ALL PRIVILEGES.

Then on server:

```bash
cd ~/lecture-portal/backend
php artisan migrate --force
php artisan db:seed --force   # optional: demo data
```

---

## 7. Laravel permissions & storage

```bash
cd ~/lecture-portal/backend
chmod -R 775 storage bootstrap/cache
php artisan storage:link
```

If `storage:link` fails on shared hosting, ask host to enable symlinks or manually link `public/storage` → `storage/app/public`.

---

## 8. Optimize for production

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

After any `.env` change, run:

```bash
php artisan config:clear
php artisan config:cache
```

---

## 9. Verify deployment

Open in browser:

| URL | Expected |
|-----|----------|
| `https://yourdomain.com/` | Login / dashboard SPA |
| `https://yourdomain.com/api/user` | JSON (401 if not logged in) |
| `https://yourdomain.com/up` | Laravel health check |

**Test login** with a seeded teacher, e.g. `gisele@example.com` / `password` (change passwords in production).

---

## 10. HTTPS (required for cookies)

Enable **SSL/TLS** in cPanel (Let's Encrypt). Ensure:

```
APP_URL=https://yourdomain.com
SESSION_SECURE_COOKIE=true
```

---

## 11. Updating the site later

On your PC:

```bash
cd "Teacher Dashboard"
npm run build:deploy
cd ../backend
composer install --no-dev --optimize-autoloader
```

Upload changed files, then on server:

```bash
cd ~/lecture-portal/backend
php artisan migrate --force
php artisan config:cache
php artisan route:cache
```

---

## 12. Optional — Cron (queues / scheduler)

If you use queued jobs, add cPanel **Cron Job**:

```
* * * * * cd /home/youruser/lecture-portal/backend && php artisan schedule:run >> /dev/null 2>&1
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Blank page | Check `backend/public/app.html` exists; re-run `npm run build:deploy` |
| 500 error | Check `storage/logs/laravel.log`; fix permissions on `storage/` |
| Login fails / CSRF | Verify `SANCTUM_STATEFUL_DOMAINS` and `SESSION_DOMAIN` match your URL |
| API 404 | Document root must be `backend/public`, not `backend/` |
| Assets 404 | Ensure `backend/public/assets/` was uploaded |
| `vendor/` missing | Run `composer install --no-dev` on server or upload `vendor/` |

---

## Quick checklist

- [ ] `npm run build:deploy` run locally
- [ ] `composer install --no-dev` run locally or on server
- [ ] Files uploaded to server
- [ ] Document root = `backend/public`
- [ ] `.env` configured with MySQL + domain
- [ ] `php artisan key:generate`
- [ ] `php artisan migrate --force`
- [ ] `php artisan storage:link`
- [ ] `chmod -R 775 storage bootstrap/cache`
- [ ] SSL enabled
- [ ] `php artisan config:cache`

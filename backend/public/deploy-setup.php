<?php

/**
 * Lecture Portal — one-time web installer (no SSH required).
 *
 * WHAT IT DOES (all the things you would normally run in a terminal):
 *   - php artisan migrate --force
 *   - php artisan db:seed --force   (optional, adds demo data)
 *   - php artisan storage:link      (with a copy fallback if symlinks are disabled)
 *   - php artisan config:clear / cache:clear
 *
 * HOW TO USE:
 *   1. Make sure backend/.env exists and DB credentials are correct.
 *   2. Visit in your browser:
 *        https://yourdomain.com/deploy-setup.php?token=9a9a85e19b814b078eca5b94f27dad02
 *      Add &seed=1  to also install demo data (teacher gisele@example.com / password).
 *      Add &fresh=1 to DROP ALL TABLES first (migrate:fresh) — destructive!
 *      Add &sync_workshops=1 to publish the 15 platform template workshops (grade=All).
 *      Add &replace_workshops=1 with sync_workshops to archive old platform workshops first.
 *   3. When it finishes, DELETE this file from the server.
 *
 * SECURITY: the token below must match the ?token= in the URL. Change it if you like.
 */

$SETUP_TOKEN = '9a9a85e19b814b078eca5b94f27dad02';

header('Content-Type: text/plain; charset=utf-8');

$token = isset($_GET['token']) ? (string) $_GET['token'] : '';
if (! hash_equals($SETUP_TOKEN, $token)) {
    http_response_code(403);
    echo "Forbidden. Append ?token=YOUR_TOKEN to the URL.\n";
    echo "The token is defined at the top of deploy-setup.php.\n";
    exit;
}

@set_time_limit(300);

echo "Lecture Portal installer\n";
echo "========================\n\n";

$autoload = __DIR__ . '/../vendor/autoload.php';
if (! file_exists($autoload)) {
    echo "ERROR: vendor/autoload.php not found. The backend/vendor folder did not upload correctly.\n";
    exit;
}
require $autoload;

$envPath = __DIR__ . '/../.env';
if (! file_exists($envPath)) {
    echo "ERROR: backend/.env not found.\n";
    echo "Create it from .env.production.example and set your DB credentials first.\n";
    exit;
}

/** @var \Illuminate\Foundation\Application $app */
$app = require_once __DIR__ . '/../bootstrap/app.php';

/** @var \Illuminate\Contracts\Console\Kernel $kernel */
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

function run_artisan(\Illuminate\Contracts\Console\Kernel $kernel, string $command, array $params = []): void
{
    echo "> php artisan {$command}\n";
    try {
        $status = $kernel->call($command, $params);
        $output = trim($kernel->output());
        echo ($output !== '' ? $output : '(no output)') . "\n";
        echo $status === 0 ? "[OK]\n\n" : "[exit code {$status}]\n\n";
    } catch (\Throwable $e) {
        echo "[FAILED] " . $e->getMessage() . "\n\n";
    }
}

// 1. Verify the database connection early with a clear message.
echo "> checking database connection\n";
try {
    \Illuminate\Support\Facades\DB::connection()->getPdo();
    echo "[OK] connected to '" . \Illuminate\Support\Facades\DB::connection()->getDatabaseName() . "'\n\n";
} catch (\Throwable $e) {
    echo "[FAILED] " . $e->getMessage() . "\n";
    echo "Fix DB_DATABASE / DB_USERNAME / DB_PASSWORD in backend/.env and reload this page.\n";
    exit;
}

// 2. Clear any stale cached config so the fresh .env is used.
run_artisan($kernel, 'config:clear');
run_artisan($kernel, 'cache:clear');

// 3. Migrate.
if (isset($_GET['fresh']) && $_GET['fresh'] === '1') {
    run_artisan($kernel, 'migrate:fresh', ['--force' => true]);
} else {
    run_artisan($kernel, 'migrate', ['--force' => true]);
}

// 4. Optional demo data.
if (isset($_GET['seed']) && $_GET['seed'] === '1') {
    run_artisan($kernel, 'db:seed', ['--force' => true]);
}

// 4b. Optional: sync 15 platform workshop assessments from bundled JSON.
if (isset($_GET['sync_workshops']) && $_GET['sync_workshops'] === '1') {
    $params = [];
    if (isset($_GET['replace_workshops']) && $_GET['replace_workshops'] === '1') {
        $params['--replace'] = true;
    }
    run_artisan($kernel, 'assessments:sync-platform-workshops', $params);
}

// 5. storage:link, with a manual fallback if the host blocks symlink().
echo "> linking storage (public/storage -> storage/app/public)\n";
$link = __DIR__ . '/storage';
$target = __DIR__ . '/../storage/app/public';
if (file_exists($link)) {
    echo "[OK] public/storage already exists\n\n";
} else {
    $linked = false;
    if (function_exists('symlink')) {
        try {
            $linked = @symlink($target, $link);
        } catch (\Throwable $e) {
            $linked = false;
        }
    }
    if ($linked) {
        echo "[OK] symlink created\n\n";
    } else {
        echo "symlink not available; run artisan fallback...\n";
        run_artisan($kernel, 'storage:link');
        if (! file_exists($link)) {
            echo "[WARN] Could not create a symlink (common on shared hosting).\n";
            echo "       Uploaded files may not be publicly reachable until you create\n";
            echo "       the link in cPanel, or ask your host to enable symlink().\n\n";
        }
    }
}

// 6. Re-cache config for performance (safe to skip if it errors).
run_artisan($kernel, 'config:cache');

echo "Done.\n";
echo "IMPORTANT: delete this file (deploy-setup.php) from the server now.\n";

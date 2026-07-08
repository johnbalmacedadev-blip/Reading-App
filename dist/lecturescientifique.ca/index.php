<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Laravel application files live in the sibling ./laravel folder so that this
// directory can be used directly as the domain document root.

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/laravel/storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/laravel/vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__.'/laravel/bootstrap/app.php';

// The public path is THIS directory (document root), not laravel/public.
$app->usePublicPath(__DIR__);

$app->handleRequest(Request::capture());

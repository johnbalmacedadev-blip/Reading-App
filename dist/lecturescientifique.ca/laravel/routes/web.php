<?php

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;

Route::get('/{any?}', function () {
  $appHtml = public_path('app.html');

  if (! File::exists($appHtml)) {
    return response(
      'Frontend not built. Run "npm run build:deploy" in the Teacher Dashboard folder.',
      503
    );
  }

  return response()->file($appHtml, ['Content-Type' => 'text/html; charset=UTF-8']);
})->where('any', '^(?!api|sanctum|storage|up).*$');

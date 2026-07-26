<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('backups:run')
    ->everyMinute()
    ->withoutOverlapping(120)
    ->runInBackground();

Schedule::command('notifications:billing-reminders')
    ->dailyAt('08:00')
    ->timezone('America/Toronto')
    ->withoutOverlapping();

Schedule::command('notifications:inactive-account-nudges')
    ->dailyAt('08:30')
    ->timezone('America/Toronto')
    ->withoutOverlapping();

<?php

return [
    'disk' => env('BACKUP_DISK', 'local'),
    'directory' => trim(env('BACKUP_DIRECTORY', 'backups'), '/'),
    'timezone' => env('BACKUP_TIMEZONE', 'America/Toronto'),
    'mysqldump_path' => env('MYSQLDUMP_PATH', 'mysqldump'),
];

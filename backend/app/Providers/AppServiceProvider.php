<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if ($this->app->environment('local')) {
            $vitePorts = collect(range(5173, 5180))->flatMap(
                fn (int $port) => ["localhost:{$port}", "127.0.0.1:{$port}"]
            )->all();

            config([
                'sanctum.stateful' => array_values(array_unique(array_merge(
                    config('sanctum.stateful', []),
                    $vitePorts
                ))),
            ]);
        }
    }
}

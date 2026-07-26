<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('trial_started_at')->nullable()->after('started_at');
            $table->timestamp('trial_ends_at')->nullable()->after('trial_started_at');
            $table->string('subscription_status', 30)->default('trialing')->after('trial_ends_at');
            $table->string('subscription_plan', 30)->nullable()->after('subscription_status');
            $table->string('subscription_billing', 20)->nullable()->after('subscription_plan');
            $table->string('stripe_customer_id')->nullable()->index()->after('subscription_billing');
            $table->string('stripe_subscription_id')->nullable()->index()->after('stripe_customer_id');
            $table->timestamp('subscription_started_at')->nullable()->after('stripe_subscription_id');
            $table->timestamp('subscription_ends_at')->nullable()->after('subscription_started_at');
        });

        // Existing active teachers receive a fresh 30-day trial on rollout.
        DB::table('users')
            ->where('role', 'teacher')
            ->where('account_status', 'active')
            ->update([
                'trial_started_at' => now(),
                'trial_ends_at' => now()->addDays(30),
                'subscription_status' => 'trialing',
            ]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['stripe_customer_id']);
            $table->dropIndex(['stripe_subscription_id']);
            $table->dropColumn([
                'trial_started_at',
                'trial_ends_at',
                'subscription_status',
                'subscription_plan',
                'subscription_billing',
                'stripe_customer_id',
                'stripe_subscription_id',
                'subscription_started_at',
                'subscription_ends_at',
            ]);
        });
    }
};

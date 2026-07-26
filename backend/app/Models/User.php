<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'first_name',
        'last_name',
        'email',
        'preferred_language',
        'password',
        'portal_password_encrypted',
        'role',
        'school_id',
        'title',
        'phone',
        'avatar_path',
        'school_board',
        'account_status',
        'affiliation_type',
        'requested_board_code',
        'join_requested_at',
        'started_at',
        'trial_started_at',
        'trial_ends_at',
        'subscription_status',
        'subscription_plan',
        'subscription_billing',
        'stripe_customer_id',
        'stripe_subscription_id',
        'subscription_started_at',
        'subscription_ends_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'started_at' => 'date',
            'join_requested_at' => 'datetime',
            'trial_started_at' => 'datetime',
            'trial_ends_at' => 'datetime',
            'subscription_started_at' => 'datetime',
            'subscription_ends_at' => 'datetime',
            'last_login_at' => 'datetime',
        ];
    }

    public function daysSinceLastLogin(): ?int
    {
        $reference = $this->last_login_at ?? $this->created_at;
        if (! $reference) {
            return null;
        }

        return (int) $reference->diffInDays(now());
    }

    public function isLoginInactive(int $days = 30): bool
    {
        $elapsed = $this->daysSinceLastLogin();

        return $elapsed !== null && $elapsed >= $days;
    }

    public function markLogin(): void
    {
        $this->forceFill(['last_login_at' => now()])->save();
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function classes(): HasMany
    {
        return $this->hasMany(SchoolClass::class, 'teacher_id');
    }

    public function displayName(): string
    {
        if ($this->first_name) {
            return trim("{$this->first_name} {$this->last_name}");
        }

        return $this->name;
    }

    public function initials(): string
    {
        $first = $this->first_name ?: strtok($this->name, ' ');
        $last = $this->last_name ?: '';

        return strtoupper(substr($first, 0, 1) . substr($last, 0, 1));
    }

    public function startTrialIfNeeded(): void
    {
        if (
            $this->role !== 'teacher'
            || $this->account_status !== 'active'
            || $this->isInstitutionalTeacher()
            || $this->trial_started_at
            || $this->hasActiveSubscription()
        ) {
            return;
        }

        $this->forceFill([
            'trial_started_at' => now(),
            'trial_ends_at' => now()->addDays(30),
            'subscription_status' => 'trialing',
        ])->save();
    }

    public function isInstitutionalTeacher(): bool
    {
        if ($this->role !== 'teacher' || $this->account_status !== 'active') {
            return false;
        }

        return (bool) $this->school_id || trim((string) ($this->school_board ?? '')) !== '';
    }

    public function hasActiveTrial(): bool
    {
        return $this->subscription_status === 'trialing'
            && $this->trial_ends_at !== null
            && $this->trial_ends_at->isFuture();
    }

    public function hasActiveSubscription(): bool
    {
        return in_array($this->subscription_status, ['active', 'past_due'], true)
            && ($this->subscription_ends_at === null || $this->subscription_ends_at->isFuture());
    }

    public function canAccessReports(): bool
    {
        return $this->isInstitutionalTeacher()
            || ($this->hasActiveSubscription() && $this->subscription_plan === 'insights');
    }

    public function canAccessClassroomFeatures(): bool
    {
        return $this->isInstitutionalTeacher()
            || $this->hasActiveTrial()
            || ($this->hasActiveSubscription() && $this->subscription_plan === 'insights');
    }

    public function trialDaysRemaining(): int
    {
        if (! $this->hasActiveTrial()) {
            return 0;
        }

        return max(1, now()->startOfDay()->diffInDays($this->trial_ends_at->copy()->startOfDay()));
    }
}

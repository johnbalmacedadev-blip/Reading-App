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
        'contact_email',
        'pending_contact_email',
        'pending_username',
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
        'registration_source',
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
        'subscription_auto_renew',
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
            'subscription_auto_renew' => 'boolean',
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

    /** Admin portal username (local-part of email@portal.local). */
    public function adminUsername(): string
    {
        $email = strtolower(trim((string) $this->email));
        if (str_ends_with($email, '@portal.local')) {
            return substr($email, 0, -strlen('@portal.local'));
        }

        return strtok($email, '@') ?: $email;
    }

    public static function adminLoginEmail(string $username): string
    {
        $username = strtolower(trim($username));

        return "{$username}@portal.local";
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
            || $this->isRegistrationLicensedTeacher()
            || $this->isInstitutionalTeacher()
            || $this->trial_started_at
            || $this->hasActiveSubscription()
        ) {
            return;
        }

        $this->forceFill([
            'trial_started_at' => now(),
            'trial_ends_at' => now()->addDays(PlatformSetting::trialPeriodDays()),
            'subscription_status' => 'trialing',
        ])->save();
    }

    /** Created via school/board registration wizard or admin assignment to an institution. */
    public function isRegistrationLicensedTeacher(): bool
    {
        if ($this->role !== 'teacher') {
            return false;
        }

        return in_array($this->registration_source, [
            'school_registration',
            'board_registration',
            'school_assigned',
            'board_assigned',
        ], true)
            || ($this->affiliation_type === 'institutional' && $this->subscription_plan === 'institutional');
    }

    public function isInstitutionalTeacher(): bool
    {
        if ($this->role !== 'teacher' || $this->account_status !== 'active') {
            return false;
        }

        if ($this->isRegistrationLicensedTeacher()) {
            return true;
        }

        if ($this->subscription_plan === 'institutional' || $this->affiliation_type === 'institutional') {
            return true;
        }

        // Linked to a school or board institution — access follows that licence.
        if ($this->school_id) {
            return true;
        }

        if ($this->affiliation_type === 'board' && trim((string) ($this->school_board ?? '')) !== '') {
            return true;
        }

        // Affiliation "school" with a school_id already covered above; board-only link after approval.
        if ($this->affiliation_type === 'school' && $this->school_id) {
            return true;
        }

        // Individual trial / paid teachers who only typed a free-text board name stay personal.
        if ($this->affiliation_type === 'individual') {
            return false;
        }

        if (trim((string) ($this->school_board ?? '')) !== '') {
            return true;
        }

        return false;
    }

    /**
     * School / board portal user whose subscription window this teacher inherits.
     */
    public function institutionalSponsor(): ?User
    {
        if ($this->role !== 'teacher') {
            return null;
        }

        if ($this->school_id) {
            $schoolAdmin = static::query()
                ->where('role', 'school_admin')
                ->where('school_id', $this->school_id)
                ->orderByDesc('id')
                ->first();

            if ($schoolAdmin) {
                return $schoolAdmin;
            }
        }

        $board = trim((string) ($this->school_board ?? ''));
        if ($board !== '') {
            return static::query()
                ->where('role', 'board_admin')
                ->where('school_board', $board)
                ->orderByDesc('id')
                ->first();
        }

        return null;
    }

    /** Institutional licence still within the school/board coverage window. */
    public function hasInstitutionalCoverage(): bool
    {
        if (! $this->isInstitutionalTeacher()) {
            return false;
        }

        if ($this->subscription_plan === 'institutional') {
            return in_array($this->subscription_status, ['active', 'past_due'], true)
                && ($this->subscription_ends_at === null || $this->subscription_ends_at->isFuture());
        }

        // Legacy school/board-linked teachers without an explicit institutional plan.
        return true;
    }

    public function hasActiveTrial(): bool
    {
        if ($this->role === 'teacher' && ($this->isRegistrationLicensedTeacher() || $this->isInstitutionalTeacher())) {
            return false;
        }

        return $this->subscription_status === 'trialing'
            && $this->trial_ends_at !== null
            && $this->trial_ends_at->isFuture();
    }

    /** Individual teacher or school/board portal still on trial, with no paid/institutional subscription. */
    public function isTrialOnlyAccount(): bool
    {
        if ($this->hasActiveSubscription()) {
            return false;
        }

        if ($this->role === 'teacher' && $this->hasInstitutionalCoverage()) {
            return false;
        }

        if ($this->isInstitutionalAdmin()) {
            return $this->hasActiveTrial()
                || ($this->subscription_status === 'trialing' && $this->trial_ends_at !== null);
        }

        if ($this->role !== 'teacher') {
            return false;
        }

        return $this->hasActiveTrial()
            || ($this->subscription_status === 'trialing' && ! $this->hasActiveSubscription());
    }

    public function hasActiveSubscription(): bool
    {
        return in_array($this->subscription_status, ['active', 'past_due'], true)
            && ($this->subscription_ends_at === null || $this->subscription_ends_at->isFuture());
    }

    public function canAccessReports(): bool
    {
        return $this->hasInstitutionalCoverage()
            || $this->hasActiveTrial()
            || ($this->hasActiveSubscription() && in_array($this->subscription_plan, ['essentials', 'insights'], true));
    }

    public function canAccessClassroomFeatures(): bool
    {
        return $this->hasInstitutionalCoverage()
            || $this->hasActiveTrial()
            || ($this->hasActiveSubscription() && in_array($this->subscription_plan, ['essentials', 'insights'], true));
    }

    public function trialDaysRemaining(): int
    {
        if (! $this->hasActiveTrial()) {
            return 0;
        }

        return max(1, now()->startOfDay()->diffInDays($this->trial_ends_at->copy()->startOfDay()));
    }

    public function subscriptionDaysRemaining(): int
    {
        if (! $this->hasActiveSubscription() || $this->subscription_ends_at === null) {
            return 0;
        }

        return max(0, (int) now()->startOfDay()->diffInDays($this->subscription_ends_at->copy()->startOfDay()));
    }

    public function isInstitutionalAdmin(): bool
    {
        return in_array($this->role, ['school_admin', 'board_admin'], true);
    }

    /** School / board portal access (manual trial or subscription; no in-platform payment). */
    public function canAccessInstitutionalPortal(): bool
    {
        if (! $this->isInstitutionalAdmin()) {
            return false;
        }

        if ($this->account_status === 'archived') {
            return false;
        }

        // Accounts created before institutional billing had no trial/subscription fields.
        if ($this->subscription_status === null && $this->trial_ends_at === null) {
            return true;
        }

        return $this->hasActiveTrial() || $this->hasActiveSubscription();
    }
}

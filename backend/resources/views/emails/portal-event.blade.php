<x-mail::message>
# {{ \App\Services\EmailTemplate::line($templateKey, 'heading', $params, null, $emailAudience ?? null) }}

@isset($params['name'])
@if(in_array($templateKey, ['verify', 'teacher_created', 'reset', 'trial_ending', 'trial_expired', 'trial_extended', 'subscription_started', 'payment_successful', 'payment_failed', 'subscription_renewed', 'subscription_cancelled', 'subscription_expired', 'announcement', 'inactive_reminder', 'suspension_reminder'], true))
{{ \App\Services\EmailTemplate::line($templateKey, 'hello', $params, null, $emailAudience ?? null) }}
@endif
@endisset

@if($templateKey === 'welcome')
{{ \App\Services\EmailTemplate::line('welcome', 'ready', $params, null, $emailAudience ?? null) }}

{{ \App\Services\EmailTemplate::line('welcome', 'login_with', $params, null, $emailAudience ?? null) }}

**{{ $params['email'] }}**
@endif

@if(in_array($templateKey, ['verify', 'teacher_created'], true))
{{ \App\Services\EmailTemplate::line($templateKey, 'created', $params, null, $emailAudience ?? null) }}

**{{ \App\Services\EmailTemplate::line($templateKey, 'login_email', $params, null, $emailAudience ?? null) }}**  
**{{ \App\Services\EmailTemplate::line($templateKey, 'temp_password', $params, null, $emailAudience ?? null) }}**

{{ \App\Services\EmailTemplate::line($templateKey, 'activate_help', $params, null, $emailAudience ?? null) }}
@endif

@if(in_array($templateKey, ['reset', 'trial_ending', 'trial_expired', 'trial_extended', 'subscription_started', 'payment_successful', 'payment_failed', 'subscription_renewed', 'subscription_cancelled', 'subscription_expired', 'announcement', 'inactive_reminder', 'suspension_reminder', 'school_added'], true))
{{ \App\Services\EmailTemplate::line($templateKey, 'body', $params, null, $emailAudience ?? null) }}
@endif

@if($actionUrl)
<x-mail::button :url="$actionUrl" color="primary">
{{ \App\Services\EmailTemplate::line($templateKey, 'button', $params, null, $emailAudience ?? null) }}
</x-mail::button>
@endif

@if(in_array($templateKey, ['verify', 'teacher_created'], true))
{{ \App\Services\EmailTemplate::line($templateKey, 'expires', $params, null, $emailAudience ?? null) }}

{{ \App\Services\EmailTemplate::line($templateKey, 'after', $params, null, $emailAudience ?? null) }}

{{ \App\Services\EmailTemplate::line($templateKey, 'ignore', $params, null, $emailAudience ?? null) }}
@endif

@if($templateKey === 'reset')
{{ \App\Services\EmailTemplate::line('reset', 'expires', $params, null, $emailAudience ?? null) }}

{{ \App\Services\EmailTemplate::line('reset', 'ignore', $params, null, $emailAudience ?? null) }}
@endif

@if($templateKey === 'welcome')
{{ \App\Services\EmailTemplate::line('welcome', 'help', $params, null, $emailAudience ?? null) }}

{{ \App\Services\EmailTemplate::line('welcome', 'thanks', $params, null, $emailAudience ?? null) }}
@endif

{{ \App\Services\EmailTemplate::line($templateKey, 'team', $params, null, $emailAudience ?? null) }}
</x-mail::message>

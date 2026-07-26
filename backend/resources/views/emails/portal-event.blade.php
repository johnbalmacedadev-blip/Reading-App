<x-mail::message>
# {{ \App\Services\EmailTemplate::line($templateKey, 'heading', $params) }}

@isset($params['name'])
@if(in_array($templateKey, ['verify', 'teacher_created', 'reset', 'trial_ending', 'trial_expired', 'subscription_started', 'payment_successful', 'payment_failed', 'subscription_renewed', 'subscription_cancelled', 'subscription_expired', 'announcement', 'inactive_reminder', 'suspension_reminder'], true))
{{ \App\Services\EmailTemplate::line($templateKey, 'hello', $params) }}
@endif
@endisset

@if($templateKey === 'welcome')
{{ \App\Services\EmailTemplate::line('welcome', 'ready', $params) }}

{{ \App\Services\EmailTemplate::line('welcome', 'login_with', $params) }}

**{{ $params['email'] }}**
@endif

@if(in_array($templateKey, ['verify', 'teacher_created'], true))
{{ \App\Services\EmailTemplate::line($templateKey, 'created', $params) }}

**{{ \App\Services\EmailTemplate::line($templateKey, 'login_email', $params) }}**  
**{{ \App\Services\EmailTemplate::line($templateKey, 'temp_password', $params) }}**

{{ \App\Services\EmailTemplate::line($templateKey, 'activate_help', $params) }}
@endif

@if(in_array($templateKey, ['reset', 'trial_ending', 'trial_expired', 'subscription_started', 'payment_successful', 'payment_failed', 'subscription_renewed', 'subscription_cancelled', 'subscription_expired', 'announcement', 'inactive_reminder', 'suspension_reminder'], true))
{{ \App\Services\EmailTemplate::line($templateKey, 'body', $params) }}
@endif

@if($actionUrl)
<x-mail::button :url="$actionUrl" color="primary">
{{ \App\Services\EmailTemplate::line($templateKey, 'button', $params) }}
</x-mail::button>
@endif

@if(in_array($templateKey, ['verify', 'teacher_created'], true))
{{ \App\Services\EmailTemplate::line($templateKey, 'expires', $params) }}

{{ \App\Services\EmailTemplate::line($templateKey, 'after', $params) }}

{{ \App\Services\EmailTemplate::line($templateKey, 'ignore', $params) }}
@endif

@if($templateKey === 'reset')
{{ \App\Services\EmailTemplate::line('reset', 'expires', $params) }}

{{ \App\Services\EmailTemplate::line('reset', 'ignore', $params) }}
@endif

@if($templateKey === 'welcome')
{{ \App\Services\EmailTemplate::line('welcome', 'help', $params) }}

{{ \App\Services\EmailTemplate::line('welcome', 'thanks', $params) }}
@endif

{{ \App\Services\EmailTemplate::line($templateKey, 'team', $params) }}
</x-mail::message>

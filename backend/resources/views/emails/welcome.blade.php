<x-mail::message>
# {{ \App\Services\EmailTemplate::line('welcome', 'heading', ['name' => $name], null, $emailAudience ?? null) }}

{{ \App\Services\EmailTemplate::line('welcome', 'ready', ['portal' => $portal], null, $emailAudience ?? null) }}

{{ \App\Services\EmailTemplate::line('welcome', 'login_with', [], null, $emailAudience ?? null) }}

**{{ $email }}**
@if(!empty($temporaryPassword))

**{{ \App\Services\EmailTemplate::line('welcome', 'temp_password', ['password' => $temporaryPassword], null, $emailAudience ?? null) }}**
@endif

<x-mail::button :url="$loginUrl" color="primary">
{{ \App\Services\EmailTemplate::line('welcome', 'button', [], null, $emailAudience ?? null) }}
</x-mail::button>

{{ \App\Services\EmailTemplate::line('welcome', 'help', [], null, $emailAudience ?? null) }}

{{ \App\Services\EmailTemplate::line('welcome', 'thanks', [], null, $emailAudience ?? null) }}<br>
{{ \App\Services\EmailTemplate::line('welcome', 'team', [], null, $emailAudience ?? null) }}
</x-mail::message>

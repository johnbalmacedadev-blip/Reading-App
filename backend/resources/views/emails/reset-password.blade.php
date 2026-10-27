<x-mail::message>
# {{ \App\Services\EmailTemplate::line('reset', 'heading', [], null, $emailAudience ?? null) }}

{{ \App\Services\EmailTemplate::line('reset', 'hello', ['name' => $name], null, $emailAudience ?? null) }}

{{ \App\Services\EmailTemplate::line('reset', 'body', [], null, $emailAudience ?? null) }}

<x-mail::button :url="$resetUrl" color="primary">
{{ \App\Services\EmailTemplate::line('reset', 'button', [], null, $emailAudience ?? null) }}
</x-mail::button>

{{ \App\Services\EmailTemplate::line('reset', 'expires', ['minutes' => $expiresMinutes], null, $emailAudience ?? null) }}

{{ \App\Services\EmailTemplate::line('reset', 'ignore', [], null, $emailAudience ?? null) }}

{{ \App\Services\EmailTemplate::line('reset', 'team', [], null, $emailAudience ?? null) }}
</x-mail::message>

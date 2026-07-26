<x-mail::message>
# {{ \App\Services\EmailTemplate::line('reset', 'heading') }}

{{ \App\Services\EmailTemplate::line('reset', 'hello', ['name' => $name]) }}

{{ \App\Services\EmailTemplate::line('reset', 'body') }}

<x-mail::button :url="$resetUrl" color="primary">
{{ \App\Services\EmailTemplate::line('reset', 'button') }}
</x-mail::button>

{{ \App\Services\EmailTemplate::line('reset', 'expires', ['minutes' => $expiresMinutes]) }}

{{ \App\Services\EmailTemplate::line('reset', 'ignore') }}

{{ \App\Services\EmailTemplate::line('reset', 'team') }}
</x-mail::message>

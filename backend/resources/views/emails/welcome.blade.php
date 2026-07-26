<x-mail::message>
# {{ \App\Services\EmailTemplate::line('welcome', 'heading', ['name' => $name]) }}

{{ \App\Services\EmailTemplate::line('welcome', 'ready', ['portal' => $portal]) }}

{{ \App\Services\EmailTemplate::line('welcome', 'login_with') }}

**{{ $email }}**

<x-mail::button :url="$loginUrl" color="primary">
{{ \App\Services\EmailTemplate::line('welcome', 'button') }}
</x-mail::button>

{{ \App\Services\EmailTemplate::line('welcome', 'help') }}

{{ \App\Services\EmailTemplate::line('welcome', 'thanks') }}<br>
{{ \App\Services\EmailTemplate::line('welcome', 'team') }}
</x-mail::message>

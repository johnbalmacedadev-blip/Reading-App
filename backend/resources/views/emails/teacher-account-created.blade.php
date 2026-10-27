<x-mail::message>
# {{ \App\Services\EmailTemplate::line('teacher_created', 'heading', [], null, $emailAudience ?? null) }}

{{ \App\Services\EmailTemplate::line('teacher_created', 'hello', ['name' => $name], null, $emailAudience ?? null) }}

{{ \App\Services\EmailTemplate::line('teacher_created', 'created', [], null, $emailAudience ?? null) }}

**{{ \App\Services\EmailTemplate::line('teacher_created', 'login_email', ['email' => $email], null, $emailAudience ?? null) }}**  
**{{ \App\Services\EmailTemplate::line('teacher_created', 'temp_password', ['password' => $temporaryPassword], null, $emailAudience ?? null) }}**

{{ \App\Services\EmailTemplate::line('teacher_created', 'activate_help', [], null, $emailAudience ?? null) }}

<x-mail::button :url="$activationUrl" color="primary">
{{ \App\Services\EmailTemplate::line('teacher_created', 'button', [], null, $emailAudience ?? null) }}
</x-mail::button>

{{ \App\Services\EmailTemplate::line('teacher_created', 'expires', [], null, $emailAudience ?? null) }}

{{ \App\Services\EmailTemplate::line('teacher_created', 'after', ['url' => $loginUrl], null, $emailAudience ?? null) }}

{{ \App\Services\EmailTemplate::line('teacher_created', 'ignore', [], null, $emailAudience ?? null) }}

{{ \App\Services\EmailTemplate::line('teacher_created', 'team', [], null, $emailAudience ?? null) }}
</x-mail::message>

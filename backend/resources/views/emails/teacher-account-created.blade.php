<x-mail::message>
# {{ \App\Services\EmailTemplate::line('teacher_created', 'heading') }}

{{ \App\Services\EmailTemplate::line('teacher_created', 'hello', ['name' => $name]) }}

{{ \App\Services\EmailTemplate::line('teacher_created', 'created') }}

**{{ \App\Services\EmailTemplate::line('teacher_created', 'login_email', ['email' => $email]) }}**  
**{{ \App\Services\EmailTemplate::line('teacher_created', 'temp_password', ['password' => $temporaryPassword]) }}**

{{ \App\Services\EmailTemplate::line('teacher_created', 'activate_help') }}

<x-mail::button :url="$activationUrl" color="primary">
{{ \App\Services\EmailTemplate::line('teacher_created', 'button') }}
</x-mail::button>

{{ \App\Services\EmailTemplate::line('teacher_created', 'expires') }}

{{ \App\Services\EmailTemplate::line('teacher_created', 'after', ['url' => $loginUrl]) }}

{{ \App\Services\EmailTemplate::line('teacher_created', 'ignore') }}

{{ \App\Services\EmailTemplate::line('teacher_created', 'team') }}
</x-mail::message>

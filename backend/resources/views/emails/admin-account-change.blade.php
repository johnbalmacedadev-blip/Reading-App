<x-mail::message>
@php
  $fr = ($locale ?? 'fr') === 'fr';
  $name = $details['name'] ?? 'Admin';
@endphp

# {{ $kind === 'activation'
    ? ($fr ? 'Activez vos changements de compte' : 'Activate your account changes')
    : ($fr ? 'Confirmation de modification' : 'Change confirmation') }}

{{ $fr ? "Bonjour {$name}," : "Hello {$name}," }}

@if($kind === 'activation')
{{ $fr
    ? 'Une demande de modification de votre compte administrateur Lecture Scientifique a été faite. Cliquez sur le bouton ci-dessous pour activer et confirmer ces changements.'
    : 'A request was made to change your Lecture Scientifique admin account. Click the button below to activate and confirm these changes.' }}

@if(!empty($details['username']))
**{{ $fr ? 'Nouveau nom d’utilisateur :' : 'New username:' }}** {{ $details['username'] }}
@endif
@if(!empty($details['email']))
**{{ $fr ? 'Nouveau courriel :' : 'New email:' }}** {{ $details['email'] }}
@endif

@if($actionUrl)
<x-mail::button :url="$actionUrl" color="primary">
{{ $fr ? 'Activer et confirmer' : 'Activate and confirm' }}
</x-mail::button>
@endif

{{ $fr
    ? 'Ce lien est valide pendant 48 heures. Si vous n’êtes pas à l’origine de cette demande, ignorez ce message — aucun changement ne sera appliqué.'
    : 'This link is valid for 48 hours. If you did not request this change, ignore this message — nothing will be applied.' }}
@else
{{ $fr
    ? 'Ceci confirme qu’une demande de modification a été envoyée pour votre compte administrateur.'
    : 'This confirms that an admin account change was requested.' }}

@if(!empty($details['old_username']) || !empty($details['username']))
**{{ $fr ? 'Nom d’utilisateur :' : 'Username:' }}**
{{ $details['old_username'] ?? '—' }} → {{ $details['username'] ?? '—' }}
@endif
@if(!empty($details['old_email']) || !empty($details['email']))
**{{ $fr ? 'Courriel :' : 'Email:' }}**
{{ $details['old_email'] ?? '—' }} → {{ $details['email'] ?? '—' }}
@endif

{{ $fr
    ? 'Si vous n’êtes pas à l’origine de cette demande, contactez immédiatement le support et ignorez le courriel d’activation.'
    : 'If you did not make this request, contact support immediately and ignore the activation email.' }}
@endif

{{ $fr ? 'L’équipe Lecture Scientifique' : 'The Lecture Scientifique team' }}
</x-mail::message>

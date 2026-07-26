<?php

namespace App\Mail;

use App\Models\User;
use App\Services\EmailLocale;
use App\Services\EmailTemplate;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PortalEventEmail extends Mailable
{
    use Queueable, SerializesModels;

    public string $emailLocale;

    /**
     * @param  array<string, scalar|null>  $params
     */
    public function __construct(
        public User $user,
        public string $templateKey,
        public array $params = [],
        public ?string $actionUrl = null,
    ) {
        $this->emailLocale = EmailLocale::resolve($user);
        $this->locale($this->emailLocale);
        $this->params = array_merge([
            'name' => $user->displayName(),
            'email' => $user->email,
            'portal' => $this->portalLabel($user),
        ], $params);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: EmailTemplate::line($this->templateKey, 'subject', $this->params, $this->emailLocale),
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.portal-event',
            with: [
                'templateKey' => $this->templateKey,
                'params' => $this->params,
                'actionUrl' => $this->actionUrl,
                'hasPassword' => array_key_exists('password', $this->params),
            ],
        );
    }

    private function portalLabel(User $user): string
    {
        $locale = $this->emailLocale;

        return match ($user->role) {
            'school_admin' => $locale === 'fr' ? 'école' : 'school',
            'board_admin' => $locale === 'fr' ? 'conseil scolaire' : 'school board',
            default => $locale === 'fr' ? 'enseignant' : 'teacher',
        };
    }
}

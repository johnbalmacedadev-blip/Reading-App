<?php

namespace App\Mail;

use App\Mail\Concerns\EmbedsEmailLogo;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdminAccountChangeEmail extends Mailable
{
    use EmbedsEmailLogo, Queueable, SerializesModels;

    /**
     * @param  'activation'|'confirmation'  $kind
     * @param  array{name: string, username?: string|null, email?: string|null, old_username?: string|null, old_email?: string|null}  $details
     */
    public function __construct(
        public string $kind,
        public string $locale,
        public array $details,
        public ?string $actionUrl = null,
    ) {
        $this->locale(in_array($this->locale, ['en', 'fr'], true) ? $this->locale : 'fr');
        $this->embedEmailLogo();
    }

    public function envelope(): Envelope
    {
        $fr = $this->locale === 'fr';

        $subject = $this->kind === 'activation'
            ? ($fr
                ? 'Activez les changements de votre compte admin — Lecture Scientifique'
                : 'Activate your admin account changes — Lecture Scientifique')
            : ($fr
                ? 'Confirmation — modification du compte admin'
                : 'Confirmation — admin account change');

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.admin-account-change',
            with: [
                'kind' => $this->kind,
                'locale' => $this->locale,
                'details' => $this->details,
                'actionUrl' => $this->actionUrl,
            ],
        );
    }
}

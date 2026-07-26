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

class ResetPasswordEmail extends Mailable
{
    use Queueable, SerializesModels;

    public string $emailLocale;

    public function __construct(
        public User $user,
        public string $resetUrl,
        public int $expiresMinutes = 30,
    ) {
        $this->emailLocale = EmailLocale::resolve($user);
        $this->locale($this->emailLocale);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: EmailTemplate::line('reset', 'subject', [], $this->emailLocale),
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.reset-password',
            with: [
                'name' => $this->user->displayName(),
                'resetUrl' => $this->resetUrl,
                'expiresMinutes' => $this->expiresMinutes,
            ],
        );
    }
}

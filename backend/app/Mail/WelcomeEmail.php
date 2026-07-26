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

class WelcomeEmail extends Mailable
{
    use Queueable, SerializesModels;

    public string $emailLocale;

    public function __construct(public User $user)
    {
        $this->emailLocale = EmailLocale::resolve($user);
        $this->locale($this->emailLocale);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: EmailTemplate::line('welcome', 'subject', [], $this->emailLocale),
        );
    }

    public function content(): Content
    {
        $frontend = rtrim(config('app.frontend_url', config('app.url')), '/');
        $locale = $this->emailLocale;

        $portal = match ($this->user->role) {
            'school_admin' => $locale === 'fr' ? 'école' : 'school',
            'board_admin' => $locale === 'fr' ? 'conseil scolaire' : 'school board',
            default => $locale === 'fr' ? 'enseignant' : 'teacher',
        };

        $loginUrl = match ($this->user->role) {
            'school_admin' => $frontend.'/?portal=ecole',
            'board_admin' => $frontend.'/?portal=conseil',
            default => $frontend.'/signin',
        };

        return new Content(
            markdown: 'emails.welcome',
            with: [
                'name' => $this->user->displayName(),
                'email' => $this->user->email,
                'portal' => $portal,
                'loginUrl' => $loginUrl,
            ],
        );
    }
}

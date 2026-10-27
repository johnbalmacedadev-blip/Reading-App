<?php

namespace App\Mail;

use App\Mail\Concerns\EmbedsEmailLogo;
use App\Models\User;
use App\Services\EmailLocale;
use App\Services\EmailTemplate;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TeacherAccountCreatedEmail extends Mailable
{
    use EmbedsEmailLogo, Queueable, SerializesModels;

    public string $emailLocale;

    public string $emailAudience;

    public function __construct(
        public User $user,
        public string $activationUrl,
        public string $temporaryPassword,
    ) {
        $this->emailLocale = EmailLocale::resolve($user);
        $this->emailAudience = EmailTemplate::audienceFromUser($user);
        $this->locale($this->emailLocale);
        $this->embedEmailLogo();
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: EmailTemplate::line(
                'teacher_created',
                'subject',
                [],
                $this->emailLocale,
                $this->emailAudience,
            ),
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.teacher-account-created',
            with: [
                'name' => $this->user->displayName(),
                'email' => $this->user->email,
                'temporaryPassword' => $this->temporaryPassword,
                'activationUrl' => $this->activationUrl,
                'loginUrl' => rtrim(config('app.frontend_url', config('app.url')), '/').'/signin',
                'emailAudience' => $this->emailAudience,
            ],
        );
    }
}

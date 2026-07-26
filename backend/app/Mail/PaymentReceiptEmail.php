<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PaymentReceiptEmail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $planName,
        public string $billingPeriod,
        public string $amount,
        public string $dueToday,
        public ?string $nextBillingDate = null,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Reçu de paiement — Lecture Scientifique',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.payment-receipt',
            with: [
                'name' => $this->user->displayName(),
                'email' => $this->user->email,
                'planName' => $this->planName,
                'billingPeriod' => $this->billingPeriod,
                'amount' => $this->amount,
                'dueToday' => $this->dueToday,
                'nextBillingDate' => $this->nextBillingDate,
                'dashboardUrl' => rtrim(config('app.frontend_url', config('app.url')), '/').'/dashboard',
            ],
        );
    }
}

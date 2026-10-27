<?php

namespace App\Mail;

use App\Mail\Concerns\EmbedsEmailLogo;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Services\EmailTemplate;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EmailBlastMail extends Mailable
{
    use EmbedsEmailLogo;
    use Queueable;
    use SerializesModels;

    /**
     * @param  list<string>  $attachmentPaths
     */
    public function __construct(
        public User $user,
        public string $emailSubject,
        public string $htmlBody,
        public array $attachmentPaths = [],
    ) {
        $this->embedEmailLogo();
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->emailSubject,
        );
    }

    public function content(): Content
    {
        return new Content(
            htmlString: $this->wrapHtml(),
        );
    }

    /**
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        $out = [];
        foreach ($this->attachmentPaths as $path) {
            if (is_string($path) && is_readable($path)) {
                $out[] = Attachment::fromPath($path);
            }
        }

        return $out;
    }

    private function wrapHtml(): string
    {
        $name = e($this->user->displayName());
        $logoCid = EmailTemplate::EMAIL_LOGO_CID;
        $platform = e((string) (PlatformSetting::getValue('platform_name', 'Lecture Scientifique') ?: 'Lecture Scientifique'));
        $subject = e($this->emailSubject);
        $body = $this->sanitizeBody($this->htmlBody);

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{$subject}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="padding:20px 28px 8px;border-bottom:1px solid #f1f5f9;">
              <img src="cid:{$logoCid}" alt="{$platform}" style="max-height:42px;width:auto;display:block;">
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 8px;font-size:14px;color:#64748b;">
              Hello {$name},
            </td>
          </tr>
          <tr>
            <td style="padding:4px 28px 24px;font-size:15px;line-height:1.6;color:#0f172a;">
              {$body}
            </td>
          </tr>
          <tr>
            <td style="padding:14px 28px 22px;border-top:1px solid #f1f5f9;font-size:12px;color:#94a3b8;">
              {$platform}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;
    }

    private function sanitizeBody(string $html): string
    {
        $clean = preg_replace('/<script\b[^>]*>.*?<\/script>/is', '', $html) ?? $html;
        $clean = preg_replace('/\son\w+\s*=\s*("|\').*?\1/i', '', $clean) ?? $clean;
        $clean = preg_replace('/javascript\s*:/i', '', $clean) ?? $clean;

        return $clean;
    }
}

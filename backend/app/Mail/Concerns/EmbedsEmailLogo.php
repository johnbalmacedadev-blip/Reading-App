<?php

namespace App\Mail\Concerns;

use App\Services\EmailTemplate;
use Symfony\Component\Mime\Email;
use Symfony\Component\Mime\Part\DataPart;
use Symfony\Component\Mime\Part\File;

trait EmbedsEmailLogo
{
    /**
     * Attach the Email Templates logo as an inline CID image so clients
     * (Gmail, etc.) can render it without fetching a public URL.
     */
    protected function embedEmailLogo(): static
    {
        return $this->withSymfonyMessage(function (Email $message) {
            $path = EmailTemplate::logoPath();
            if ($path === null || ! is_readable($path)) {
                return;
            }

            $cid = EmailTemplate::EMAIL_LOGO_CID;

            foreach ($message->getAttachments() as $attachment) {
                if ($attachment->getContentId() === $cid) {
                    return;
                }
            }

            $mime = match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
                'jpg', 'jpeg' => 'image/jpeg',
                'webp' => 'image/webp',
                'gif' => 'image/gif',
                default => 'image/png',
            };

            $part = (new DataPart(new File($path), 'email-logo', $mime))->asInline();
            $part->setContentId($cid);
            $message->addPart($part);
        });
    }
}

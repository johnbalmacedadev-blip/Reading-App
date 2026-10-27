@props(['url'])
@php
    $logoPath = \App\Services\EmailTemplate::logoPath();
    $platformName = \App\Models\PlatformSetting::getValue('platform_name', 'Lecture Scientifique') ?: 'Lecture Scientifique';
    $logoSrc = null;

    // Prefer the CID attached by EmbedsEmailLogo (Email Templates → logo setting).
    if ($logoPath) {
        $logoSrc = 'cid:'.\App\Services\EmailTemplate::EMAIL_LOGO_CID;
    }

    // Fallback for previews / mailables that forgot to embed: public branding URL.
    if (! $logoSrc) {
        $logoSrc = \App\Services\EmailTemplate::logoPublicUrl();
    }

    $headerUrl = $url ?: rtrim((string) config('app.frontend_url', config('app.url')), '/');
@endphp
<tr>
<td class="header" style="padding: 0 0 25px 0; text-align: center;">
<a href="{{ $headerUrl }}" style="display: inline-block; text-decoration: none;" target="_blank" rel="noopener">
@if ($logoSrc)
<img src="{{ $logoSrc }}" width="240" alt="{{ $platformName }}" style="width: 240px; height: auto; max-width: 100%; border: 0; display: block; margin: 0 auto;">
@else
<span style="display: inline-block; background-color: #004aad; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 20px; font-weight: 700; padding: 14px 22px; border-radius: 8px;">
{{ $platformName }}
</span>
@endif
</a>
</td>
</tr>

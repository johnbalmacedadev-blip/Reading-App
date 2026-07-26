@props(['url'])
@php
    $logoSrc = \App\Services\EmailTemplate::logoDataUri();
    $platformName = \App\Models\PlatformSetting::getValue('platform_name', 'Lecture Scientifique') ?: 'Lecture Scientifique';
@endphp
<tr>
<td class="header" style="padding: 0 0 25px 0; text-align: center;">
<a href="{{ $url }}" style="display: inline-block; text-decoration: none;" target="_blank" rel="noopener">
@if ($logoSrc)
<img src="{{ $logoSrc }}" width="210" height="42" alt="{{ $platformName }}" style="width: 210px; height: auto; max-width: 100%; border: 0; display: block; margin: 0 auto; border-radius: 8px;">
@else
<span style="display: inline-block; background-color: #004aad; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 20px; font-weight: 700; padding: 14px 22px; border-radius: 8px;">
{{ $platformName }}
</span>
@endif
</a>
</td>
</tr>

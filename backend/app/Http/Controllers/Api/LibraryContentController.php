<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LibraryContent;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LibraryContentController extends Controller
{
  private const TYPES = ['Sheet', 'PDF', 'Lesson', 'Assessment', 'Resource', 'PowerPoint'];

  private const ALLOWED_MIMES = 'pdf,zip,doc,docx,ppt,pptx';

  private const VIEWABLE_FORMATS = ['PDF', 'PPT', 'PPTX'];

  public function index(Request $request): JsonResponse
  {
    $query = LibraryContent::query()->orderByDesc('created_at');

    if ($request->filled('search')) {
      $search = $request->string('search')->toString();
      $query->where('title', 'like', "%{$search}%");
    }

    if ($request->filled('type') && $request->string('type')->toString() !== 'All Types') {
      $query->where('type', $request->string('type')->toString());
    }

    if ($request->filled('unit') && $request->string('unit')->toString() !== 'All Units') {
      $query->where('unit', $request->string('unit')->toString());
    }

    return response()->json([
      'contents' => $query->get()->map(fn (LibraryContent $content) => $this->format($content)),
    ]);
  }

  public function store(Request $request): JsonResponse
  {
    $data = $request->validate([
      'title' => ['required', 'string', 'max:255'],
      'type' => ['required', 'string', 'in:'.implode(',', self::TYPES)],
      'unit' => ['required', 'string', 'max:50'],
      'atelier' => ['nullable', 'integer', 'min:0', 'max:20'],
      'interactive_view' => ['nullable', 'boolean'],
      'file' => ['required', 'file', 'max:51200', 'mimes:'.self::ALLOWED_MIMES],
    ]);

    $interactiveView = $request->boolean('interactive_view');

    $file = $request->file('file');
    $extension = strtoupper($file->getClientOriginalExtension());
    $storedName = Str::uuid().'.'.$file->getClientOriginalExtension();
    $path = $file->storeAs('library', $storedName, 'public');

    $uploader = $request->user()?->displayName() ?? 'Admin';

    $content = LibraryContent::create([
      'title' => $data['title'],
      'type' => $data['type'],
      'unit' => $data['unit'],
      'atelier' => $data['atelier'] ?? 0,
      'format' => $extension,
      'file_size_bytes' => $file->getSize(),
      'file_path' => $path,
      'uploader' => $uploader,
      'interactive_view' => $interactiveView && $this->formatSupportsView($extension),
    ]);

    AuditLogger::log('Upload', 'Content', "{$content->title} uploaded", 'info', $request, subject: $content);

    return response()->json([
      'content' => $this->format($content),
    ], 201);
  }

  public function update(Request $request, LibraryContent $libraryContent): JsonResponse
  {
    $data = $request->validate([
      'title' => ['required', 'string', 'max:255'],
      'type' => ['required', 'string', 'in:'.implode(',', self::TYPES)],
      'unit' => ['required', 'string', 'max:50'],
      'atelier' => ['nullable', 'integer', 'min:0', 'max:20'],
      'interactive_view' => ['nullable', 'boolean'],
      'file' => ['nullable', 'file', 'max:51200', 'mimes:'.self::ALLOWED_MIMES],
    ]);

    $libraryContent->fill([
      'title' => $data['title'],
      'type' => $data['type'],
      'unit' => $data['unit'],
      'atelier' => $data['atelier'] ?? 0,
      'interactive_view' => $request->boolean('interactive_view') && $this->formatSupportsView($libraryContent->format),
    ]);

    if ($request->hasFile('file')) {
      if ($libraryContent->file_path && Storage::disk('public')->exists($libraryContent->file_path)) {
        Storage::disk('public')->delete($libraryContent->file_path);
      }

      $file = $request->file('file');
      $extension = strtoupper($file->getClientOriginalExtension());
      $storedName = Str::uuid().'.'.$file->getClientOriginalExtension();
      $path = $file->storeAs('library', $storedName, 'public');

      $libraryContent->file_path = $path;
      $libraryContent->format = $extension;
      $libraryContent->file_size_bytes = $file->getSize();
      $libraryContent->interactive_view = $request->boolean('interactive_view') && $this->formatSupportsView($extension);
    }

    $libraryContent->save();

    $action = $request->hasFile('file') ? 'Upload' : 'Edit';
    AuditLogger::log($action, 'Content', "{$libraryContent->title} updated", 'info', $request, subject: $libraryContent);

    return response()->json([
      'content' => $this->format($libraryContent),
    ]);
  }

  public function destroy(Request $request, LibraryContent $libraryContent): JsonResponse
  {
    $title = $libraryContent->title;
    if ($libraryContent->file_path && Storage::disk('public')->exists($libraryContent->file_path)) {
      Storage::disk('public')->delete($libraryContent->file_path);
    }

    $libraryContent->delete();

    AuditLogger::log('Delete', 'Content', "{$title} deleted", 'warning', $request);

    return response()->json(['message' => 'Content deleted.']);
  }

  private const CONTINUUM_PDF_PATH = 'library/continuum-sml.pdf';

  public function downloadContinuum(Request $request): StreamedResponse|JsonResponse
  {
    if (! Storage::disk('public')->exists(self::CONTINUUM_PDF_PATH)) {
      return response()->json(['message' => 'Continuum PDF not found.'], 404);
    }

    AuditLogger::export($request, 'Content', 'Continuum PDF downloaded');

    return Storage::disk('public')->download(
      self::CONTINUUM_PDF_PATH,
      'Continuum-Lecture-Scientifique-SML.pdf'
    );
  }

  public function download(Request $request, LibraryContent $libraryContent): StreamedResponse|JsonResponse
  {
    if (! $libraryContent->file_path || ! Storage::disk('public')->exists($libraryContent->file_path)) {
      return response()->json(['message' => 'File not found.'], 404);
    }

    $extension = strtolower($libraryContent->format);
    $filename = Str::slug($libraryContent->title).'.'.$extension;

    AuditLogger::export($request, 'Content', "{$libraryContent->title} downloaded");

    return Storage::disk('public')->download($libraryContent->file_path, $filename);
  }

  public function show(LibraryContent $libraryContent): JsonResponse
  {
    return response()->json([
      'content' => $this->format($libraryContent),
    ]);
  }

  public function view(LibraryContent $libraryContent): StreamedResponse|JsonResponse
  {
    if (! $libraryContent->file_path || ! Storage::disk('public')->exists($libraryContent->file_path)) {
      return response()->json(['message' => 'File not found.'], 404);
    }

    if (! $libraryContent->interactive_view || ! $this->formatSupportsView($libraryContent->format)) {
      return response()->json(['message' => 'This file is not available for interactive viewing.'], 403);
    }

    $extension = strtolower($libraryContent->format);
    $mime = match ($extension) {
      'pdf' => 'application/pdf',
      'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'ppt' => 'application/vnd.ms-powerpoint',
      'doc' => 'application/msword',
      'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'zip' => 'application/zip',
      default => 'application/octet-stream',
    };

    return Storage::disk('public')->response($libraryContent->file_path, null, [
      'Content-Type' => $mime,
      'Content-Disposition' => 'inline; filename="'.Str::slug($libraryContent->title).'.'.$extension.'"',
    ]);
  }

  private function format(LibraryContent $content): array
  {
    return [
      'id' => $content->id,
      'title' => $content->title,
      'type' => $content->type,
      'unit' => $content->unit,
      'atelier' => $content->atelier,
      'format' => $content->format,
      'size' => $content->formattedSize(),
      'uploaded' => $content->created_at?->format('Y-m-d') ?? '',
      'uploader' => $content->uploader ?? 'Admin',
      'has_file' => (bool) $content->file_path,
      'interactive_view' => (bool) $content->interactive_view,
      'is_viewable' => (bool) $content->interactive_view && $this->formatSupportsView($content->format),
    ];
  }

  private function formatSupportsView(string $format): bool
  {
    return in_array(strtoupper($format), self::VIEWABLE_FORMATS, true);
  }
}

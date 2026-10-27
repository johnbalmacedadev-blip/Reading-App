<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DownloadableCategory;
use App\Models\DownloadableResource;
use App\Models\PlatformSetting;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DownloadableResourceController extends Controller
{
    private const ALLOWED_MIMES = 'pdf,zip,doc,docx';

    public function index(): JsonResponse
    {
        $categories = DownloadableCategory::query()
            ->with('resources')
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'categories' => $categories->map(fn (DownloadableCategory $category) => $this->formatCategory($category, true)),
        ]);
    }

    public function show(DownloadableCategory $downloadableCategory): JsonResponse
    {
        $downloadableCategory->load('resources');

        return response()->json([
            'category' => $this->formatCategory($downloadableCategory, true),
        ]);
    }

    public function update(Request $request, DownloadableCategory $downloadableCategory): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:20'],
        ]);

        $downloadableCategory->fill([
            'title' => $data['title'],
            'color' => $data['color'] ?? $downloadableCategory->color,
        ]);

        if ($downloadableCategory->isDirty('title')) {
            $downloadableCategory->slug = $this->uniqueSlug($data['title'], $downloadableCategory->id);
        }

        $downloadableCategory->save();
        $downloadableCategory->load('resources');

        AuditLogger::log('Edit', 'Content', "{$downloadableCategory->title} category updated", 'info', $request, subject: $downloadableCategory);

        return response()->json([
            'category' => $this->formatCategory($downloadableCategory, true),
        ]);
    }

    public function storeResource(Request $request, DownloadableCategory $downloadableCategory): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'file' => ['required', 'file', 'max:51200', 'mimes:'.self::ALLOWED_MIMES],
        ]);

        $file = $request->file('file');
        $extension = strtolower($file->getClientOriginalExtension());
        $storedName = Str::uuid().'.'.$extension;
        $path = $file->storeAs('downloadable-resources', $storedName, 'public');

        $maxSort = $downloadableCategory->resources()->max('sort_order') ?? 0;

        $resource = $downloadableCategory->resources()->create([
            'title' => $data['title'],
            'file_path' => $path,
            'file_format' => strtoupper($extension),
            'file_size_bytes' => $file->getSize(),
            'sort_order' => $maxSort + 1,
        ]);

        AuditLogger::log('Upload', 'Content', "{$resource->title} uploaded", 'info', $request, subject: $resource);

        return response()->json([
            'resource' => $this->formatResource($resource),
        ], 201);
    }

    public function updateResource(Request $request, DownloadableResource $downloadableResource): JsonResponse
    {
        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'file' => ['nullable', 'file', 'max:51200', 'mimes:'.self::ALLOWED_MIMES],
        ]);

        if (isset($data['title'])) {
            $downloadableResource->title = $data['title'];
        }

        if ($request->hasFile('file')) {
            $this->deleteFile($downloadableResource->file_path);

            $file = $request->file('file');
            $extension = strtolower($file->getClientOriginalExtension());
            $storedName = Str::uuid().'.'.$extension;
            $path = $file->storeAs('downloadable-resources', $storedName, 'public');

            $downloadableResource->file_path = $path;
            $downloadableResource->file_format = strtoupper($extension);
            $downloadableResource->file_size_bytes = $file->getSize();
        }

        $downloadableResource->save();

        $action = $request->hasFile('file') ? 'Upload' : 'Edit';
        AuditLogger::log($action, 'Content', "{$downloadableResource->title} updated", 'info', $request, subject: $downloadableResource);

        return response()->json([
            'resource' => $this->formatResource($downloadableResource),
        ]);
    }

    public function destroyResource(Request $request, DownloadableResource $downloadableResource): JsonResponse
    {
        $title = $downloadableResource->title;
        $this->deleteFile($downloadableResource->file_path);
        $downloadableResource->delete();

        AuditLogger::log('Delete', 'Content', "{$title} deleted", 'warning', $request);

        return response()->json(['message' => 'Resource deleted.']);
    }

    public function download(Request $request, DownloadableResource $downloadableResource): StreamedResponse|JsonResponse
    {
        PlatformSetting::assertTrialDownloadExportAllowed(
            $request->user(),
            \App\Services\ResourceAccessService::KIND_DOWNLOADABLE,
            (string) $downloadableResource->id,
        );

        if (! $downloadableResource->file_path || ! Storage::disk('public')->exists($downloadableResource->file_path)) {
            return response()->json(['message' => 'File not found.'], 404);
        }

        $extension = strtolower($downloadableResource->file_format ?? 'pdf');
        $filename = Str::slug($downloadableResource->title).'.'.$extension;

        AuditLogger::export($request, 'Content', "{$downloadableResource->title} downloaded");

        return Storage::disk('public')->download($downloadableResource->file_path, $filename);
    }

    private function formatCategory(DownloadableCategory $category, bool $includeResources = false): array
    {
        $data = [
            'id' => $category->id,
            'title' => $category->title,
            'slug' => $category->slug,
            'color' => $category->color,
            'sort_order' => $category->sort_order,
            'resource_count' => $category->resources->count(),
            'uploaded_count' => $category->resources->filter(fn ($r) => (bool) $r->file_path)->count(),
        ];

        if ($includeResources) {
            $data['resources'] = $category->resources->map(fn (DownloadableResource $resource) => $this->formatResource($resource));
        }

        return $data;
    }

    private function formatResource(DownloadableResource $resource): array
    {
        return [
            'id' => $resource->id,
            'category_id' => $resource->downloadable_category_id,
            'title' => $resource->title,
            'format' => $resource->file_format,
            'size' => $resource->formattedSize(),
            'has_file' => (bool) $resource->file_path,
            'sort_order' => $resource->sort_order,
        ];
    }

    private function uniqueSlug(string $title, ?int $ignoreId = null): string
    {
        $base = Str::slug($title);
        $slug = $base;
        $counter = 1;

        while (
            DownloadableCategory::query()
                ->where('slug', $slug)
                ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $slug = $base.'-'.$counter;
            $counter++;
        }

        return $slug;
    }

    private function deleteFile(?string $path): void
    {
        if ($path && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }
}

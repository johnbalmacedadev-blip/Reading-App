<?php

namespace App\Services;

use App\Models\DownloadableCategory;
use App\Models\ResourceAccessGrant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ResourceAccessService
{
    public const TYPE_TEACHER = 'teacher';

    public const TYPE_SCHOOL = 'school';

    public const KIND_DOWNLOADABLE = 'downloadable';

    public const KIND_EXPORT = 'export';

    /** @var array<string, array<int, bool>> */
    private static array $enabledCache = [];

    /** @return list<array{key: string, label: string, description: string}> */
    public static function exportCatalog(): array
    {
        return [
            [
                'key' => 'student_report',
                'label' => 'Student reports (PDF)',
                'description' => 'Export an individual student report as PDF.',
            ],
            [
                'key' => 'class_report',
                'label' => 'Class / workshop reports (PDF)',
                'description' => 'Export class and workshop evaluation reports as PDF.',
            ],
            [
                'key' => 'continuum',
                'label' => 'Continuum PDF',
                'description' => 'Download the continuum document from the library.',
            ],
            [
                'key' => 'library_content',
                'label' => 'Library documents',
                'description' => 'Download uploaded library files (PDF and other documents).',
            ],
            [
                'key' => 'pedagogical_sheets',
                'label' => 'Pedagogical unit sheets',
                'description' => 'Download unit quick sheets and lesson activity sheets.',
            ],
        ];
    }

    /** @return array{downloadable: list<array<string, mixed>>, exports: list<array{key: string, label: string, description: string}>} */
    public static function catalog(): array
    {
        $categories = DownloadableCategory::query()
            ->with('resources')
            ->orderBy('sort_order')
            ->get()
            ->map(function (DownloadableCategory $category) {
                return [
                    'id' => $category->id,
                    'title' => $category->title,
                    'color' => $category->color,
                    'resources' => $category->resources->map(fn ($resource) => [
                        'id' => $resource->id,
                        'title' => $resource->title,
                        'format' => $resource->file_format,
                        'size' => $resource->formattedSize(),
                        'has_file' => (bool) $resource->file_path,
                    ])->values()->all(),
                ];
            })
            ->values()
            ->all();

        return [
            'downloadable' => $categories,
            'exports' => self::exportCatalog(),
        ];
    }

    /**
     * @param  list<int|string>  $ids
     */
    public static function rememberEnabledMap(string $type, array $ids): void
    {
        $ids = array_values(array_unique(array_map('intval', $ids)));
        $map = array_fill_keys($ids, false);
        if ($ids !== []) {
            $enabledIds = ResourceAccessGrant::query()
                ->where('grantee_type', $type)
                ->whereIn('grantee_id', $ids)
                ->where('enabled', true)
                ->pluck('grantee_id')
                ->all();
            foreach ($enabledIds as $id) {
                $map[(int) $id] = true;
            }
        }
        self::$enabledCache[$type] = $map;
    }

    public static function isEnabled(string $type, int $id): bool
    {
        if (isset(self::$enabledCache[$type])) {
            return self::$enabledCache[$type][$id] ?? false;
        }

        return ResourceAccessGrant::query()
            ->where('grantee_type', $type)
            ->where('grantee_id', $id)
            ->where('enabled', true)
            ->exists();
    }

    /** @return array{enabled: bool, items: list<array{kind: string, resource_key: string}>} */
    public static function show(string $type, int $id): array
    {
        $grant = ResourceAccessGrant::query()
            ->with('items')
            ->where('grantee_type', $type)
            ->where('grantee_id', $id)
            ->first();

        if (! $grant) {
            return [
                'enabled' => false,
                'items' => [],
            ];
        }

        return [
            'enabled' => (bool) $grant->enabled,
            'items' => $grant->items->map(fn ($item) => [
                'kind' => $item->kind,
                'resource_key' => $item->resource_key,
            ])->values()->all(),
        ];
    }

    /**
     * @param  list<array{kind?: string, resource_key?: string}>  $items
     * @return array{enabled: bool, items: list<array{kind: string, resource_key: string}>}
     */
    public static function save(string $type, int $id, bool $enabled, array $items): array
    {
        $normalized = self::normalizeItems($items);

        if ($enabled && $normalized === []) {
            throw ValidationException::withMessages([
                'items' => ['Select at least one downloadable or export resource.'],
            ]);
        }

        DB::transaction(function () use ($type, $id, $enabled, $normalized) {
            $grant = ResourceAccessGrant::query()->updateOrCreate(
                [
                    'grantee_type' => $type,
                    'grantee_id' => $id,
                ],
                [
                    'enabled' => $enabled,
                ],
            );

            $grant->items()->delete();

            foreach ($normalized as $item) {
                $grant->items()->create($item);
            }
        });

        unset(self::$enabledCache[$type]);

        return self::show($type, $id);
    }

    public static function userMayAccess(?User $user, string $kind, string $key): bool
    {
        if (! $user) {
            return false;
        }

        $grants = self::grantsForUser($user);
        foreach ($grants as $grant) {
            if (! $grant->enabled) {
                continue;
            }
            foreach ($grant->items as $item) {
                if ($item->kind === $kind && $item->resource_key === $key) {
                    return true;
                }
            }
        }

        return false;
    }

    /** @return array{enabled: bool, downloadable_ids: list<int>, export_keys: list<string>} */
    public static function payloadForUser(?User $user): array
    {
        $downloadable = [];
        $exports = [];
        $enabled = false;

        foreach (self::grantsForUser($user) as $grant) {
            if (! $grant->enabled) {
                continue;
            }
            $enabled = true;
            foreach ($grant->items as $item) {
                if ($item->kind === self::KIND_DOWNLOADABLE) {
                    $downloadable[] = (int) $item->resource_key;
                }
                if ($item->kind === self::KIND_EXPORT) {
                    $exports[] = $item->resource_key;
                }
            }
        }

        return [
            'enabled' => $enabled,
            'downloadable_ids' => array_values(array_unique($downloadable)),
            'export_keys' => array_values(array_unique($exports)),
        ];
    }

    /** @return list<ResourceAccessGrant> */
    private static function grantsForUser(?User $user): array
    {
        if (! $user) {
            return [];
        }

        $query = ResourceAccessGrant::query()->with('items');

        if ($user->role === 'teacher') {
            $query->where(function ($q) use ($user) {
                $q->where(function ($inner) use ($user) {
                    $inner->where('grantee_type', self::TYPE_TEACHER)
                        ->where('grantee_id', $user->id);
                });
                if ($user->school_id) {
                    $q->orWhere(function ($inner) use ($user) {
                        $inner->where('grantee_type', self::TYPE_SCHOOL)
                            ->where('grantee_id', $user->school_id);
                    });
                }
            });

            return $query->get()->all();
        }

        if ($user->role === 'school_admin' && $user->school_id) {
            return $query
                ->where('grantee_type', self::TYPE_SCHOOL)
                ->where('grantee_id', $user->school_id)
                ->get()
                ->all();
        }

        return [];
    }

    /**
     * @param  list<array{kind?: string, resource_key?: string}>  $items
     * @return list<array{kind: string, resource_key: string}>
     */
    private static function normalizeItems(array $items): array
    {
        $exportKeys = array_column(self::exportCatalog(), 'key');
        $seen = [];
        $normalized = [];

        foreach ($items as $item) {
            $kind = (string) ($item['kind'] ?? '');
            $key = trim((string) ($item['resource_key'] ?? ''));
            if ($key === '') {
                continue;
            }
            if ($kind === self::KIND_DOWNLOADABLE) {
                if ((int) $key < 1) {
                    continue;
                }
                $key = (string) (int) $key;
            } elseif ($kind === self::KIND_EXPORT) {
                if (! in_array($key, $exportKeys, true)) {
                    continue;
                }
            } else {
                continue;
            }

            $token = $kind.':'.$key;
            if (isset($seen[$token])) {
                continue;
            }
            $seen[$token] = true;
            $normalized[] = [
                'kind' => $kind,
                'resource_key' => $key,
            ];
        }

        return $normalized;
    }
}

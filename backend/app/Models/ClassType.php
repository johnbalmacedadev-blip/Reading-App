<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClassType extends Model
{
    protected $fillable = [
        'code',
        'name',
        'name_fr',
        'assessment_grade',
        'sort_order',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public static function activeOrdered()
    {
        return static::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name');
    }

    public static function resolveAssessmentGrade(string $grade): string
    {
        $legacy = [
            'Maternelle' => 'Kindergarten',
            'Jardin' => 'Kindergarten',
            'Junior Kindergarten (JK)' => 'Kindergarten',
            'Senior Kindergarten (SK)' => 'Kindergarten',
            'JK' => 'Kindergarten',
            'SK' => 'Kindergarten',
            '1re année' => 'Grade 1',
            '2e année' => 'Grade 2',
            '3e année' => 'Grade 3',
            '3e année+' => 'Grade 3+',
            '4e année' => 'Grade 3+',
            '5e année' => 'Grade 3+',
            '6e année' => 'Grade 3+',
            'Grade 4' => 'Grade 3+',
            'Grade 5' => 'Grade 3+',
            'Grade 6' => 'Grade 3+',
        ];

        if (isset($legacy[$grade])) {
            return $legacy[$grade];
        }

        $match = static::query()
            ->where(function ($query) use ($grade) {
                $query->where('name', $grade)
                    ->orWhere('name_fr', $grade)
                    ->orWhere('code', $grade);
            })
            ->first();

        return $match?->assessment_grade ?? $grade;
    }

    /** @return list<string> */
    public static function allowedGradeValues(bool $activeOnly = true): array
    {
        $query = $activeOnly ? static::activeOrdered() : static::query()->orderBy('sort_order');

        return $query->get()
            ->flatMap(fn (self $type) => array_filter([$type->name, $type->name_fr, $type->code]))
            ->unique()
            ->values()
            ->all();
    }
}

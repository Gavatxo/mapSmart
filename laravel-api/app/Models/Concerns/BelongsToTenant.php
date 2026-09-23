<?php

namespace App\Models\Concerns;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

/**
 * Isolation multi-tenant.
 *
 * Toute requête sur un modèle utilisant ce trait est automatiquement filtrée
 * sur le tenant de l'utilisateur connecté, et tout enregistrement créé se voit
 * attribuer ce tenant. Un tenant ne peut donc jamais voir les données d'un autre.
 */
trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope('tenant', function (Builder $builder) {
            if ($tenantId = self::currentTenantId()) {
                $builder->where($builder->getModel()->getTable() . '.tenant_id', $tenantId);
            }
        });

        static::creating(function ($model) {
            if (! $model->tenant_id && $tenantId = self::currentTenantId()) {
                $model->tenant_id = $tenantId;
            }
        });
    }

    protected static function currentTenantId(): ?int
    {
        return Auth::user()?->tenant_id;
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}

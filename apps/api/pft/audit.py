"""Writing audit entries.

One function, called from domain code at the moment something changes. Keeping
it explicit (rather than a save-signal catch-all) means every entry carries a
human-readable summary and only fields that matter, and bulk internals like
imports log one entry per user action instead of one per row.
"""

from .models import AuditLog


def record(
    *,
    organization,
    actor,
    action: str,
    entity,
    summary: str,
    changes: dict | None = None,
):
    if organization is None:
        return None
    return AuditLog.objects.create(
        organization=organization,
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        actor_email=getattr(actor, "email", "") or "",
        action=action,
        entity_type=type(entity).__name__ if not isinstance(entity, str) else entity,
        entity_id=str(getattr(entity, "pk", "") or ""),
        summary=summary[:255],
        changes=changes or {},
    )

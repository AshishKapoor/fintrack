"""Reading the audit log.

Manager-only (owner or admin of the organization), newest first, filterable by
entity type and action, exportable as CSV for handing to an accountant or
auditor. There is deliberately no write surface.
"""

import csv
import io

from django.http import HttpResponse
from rest_framework import permissions, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied

from .models import AuditLog, Membership


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = [
            "id",
            "organization",
            "actor_email",
            "action",
            "entity_type",
            "entity_id",
            "summary",
            "changes",
            "created_at",
        ]


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Managers only: the audit log names people and actions, which is
        # exactly what a viewer or ordinary member should not browse.
        org_ids = Membership.objects.filter(
            user=self.request.user, role__in=Membership.MANAGE_ROLES
        ).values_list("organization_id", flat=True)
        queryset = AuditLog.objects.filter(organization_id__in=org_ids)

        organization = self.request.query_params.get("organization")
        if organization:
            queryset = queryset.filter(organization_id=organization)
        entity_type = self.request.query_params.get("entity_type")
        if entity_type:
            queryset = queryset.filter(entity_type=entity_type)
        log_action = self.request.query_params.get("action")
        if log_action:
            queryset = queryset.filter(action=log_action)
        return queryset

    @action(detail=False, methods=["get"], url_path="export")
    def export(self, request):
        organization = request.query_params.get("organization")
        if not organization:
            raise PermissionDenied("organization query parameter is required.")

        rows = self.get_queryset().filter(organization_id=organization)[:10000]

        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(
            ["timestamp", "actor", "action", "entity_type", "entity_id", "summary"]
        )
        for row in rows:
            writer.writerow(
                [
                    row.created_at.isoformat(),
                    row.actor_email or "system",
                    row.action,
                    row.entity_type,
                    row.entity_id,
                    row.summary,
                ]
            )

        response = HttpResponse(buffer.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="audit-log.csv"'
        return response

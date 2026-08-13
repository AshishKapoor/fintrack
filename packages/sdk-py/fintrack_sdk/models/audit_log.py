from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..models.action_enum import ActionEnum
from ..types import UNSET, Unset

T = TypeVar("T", bound="AuditLog")


@_attrs_define
class AuditLog:
    """
    Attributes:
        id (int):
        organization (int):
        action (ActionEnum): * `created` - Created
            * `updated` - Updated
            * `deleted` - Deleted
        entity_type (str):
        summary (str):
        created_at (datetime.datetime):
        actor_email (str | Unset):
        entity_id (str | Unset):
        changes (Any | Unset):
    """

    id: int
    organization: int
    action: ActionEnum
    entity_type: str
    summary: str
    created_at: datetime.datetime
    actor_email: str | Unset = UNSET
    entity_id: str | Unset = UNSET
    changes: Any | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        organization = self.organization

        action = self.action.value

        entity_type = self.entity_type

        summary = self.summary

        created_at = self.created_at.isoformat()

        actor_email = self.actor_email

        entity_id = self.entity_id

        changes = self.changes

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "organization": organization,
                "action": action,
                "entity_type": entity_type,
                "summary": summary,
                "created_at": created_at,
            }
        )
        if actor_email is not UNSET:
            field_dict["actor_email"] = actor_email
        if entity_id is not UNSET:
            field_dict["entity_id"] = entity_id
        if changes is not UNSET:
            field_dict["changes"] = changes

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        id = d.pop("id")

        organization = d.pop("organization")

        action = ActionEnum(d.pop("action"))

        entity_type = d.pop("entity_type")

        summary = d.pop("summary")

        created_at = datetime.datetime.fromisoformat(d.pop("created_at"))

        actor_email = d.pop("actor_email", UNSET)

        entity_id = d.pop("entity_id", UNSET)

        changes = d.pop("changes", UNSET)

        audit_log = cls(
            id=id,
            organization=organization,
            action=action,
            entity_type=entity_type,
            summary=summary,
            created_at=created_at,
            actor_email=actor_email,
            entity_id=entity_id,
            changes=changes,
        )

        audit_log.additional_properties = d
        return audit_log

    @property
    def additional_keys(self) -> list[str]:
        return list(self.additional_properties.keys())

    def __getitem__(self, key: str) -> Any:
        return self.additional_properties[key]

    def __setitem__(self, key: str, value: Any) -> None:
        self.additional_properties[key] = value

    def __delitem__(self, key: str) -> None:
        del self.additional_properties[key]

    def __contains__(self, key: str) -> bool:
        return key in self.additional_properties

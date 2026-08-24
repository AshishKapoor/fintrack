from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..types import UNSET, Unset

T = TypeVar("T", bound="PatchedNotificationPreference")


@_attrs_define
class PatchedNotificationPreference:
    """
    Attributes:
        id (int | Unset):
        email_enabled (bool | Unset):
        ntfy_enabled (bool | Unset):
        ntfy_server_url (str | Unset):
        ntfy_topic (str | Unset):
        webhook_enabled (bool | Unset):
        webhook_url (str | Unset):
        budget_alerts_enabled (bool | Unset):
        budget_alert_threshold (int | Unset):
        reminders_enabled (bool | Unset):
        reminder_days_before (int | Unset):
        weekly_digest_enabled (bool | Unset):
        created_at (datetime.datetime | Unset):
        updated_at (datetime.datetime | Unset):
    """

    id: int | Unset = UNSET
    email_enabled: bool | Unset = UNSET
    ntfy_enabled: bool | Unset = UNSET
    ntfy_server_url: str | Unset = UNSET
    ntfy_topic: str | Unset = UNSET
    webhook_enabled: bool | Unset = UNSET
    webhook_url: str | Unset = UNSET
    budget_alerts_enabled: bool | Unset = UNSET
    budget_alert_threshold: int | Unset = UNSET
    reminders_enabled: bool | Unset = UNSET
    reminder_days_before: int | Unset = UNSET
    weekly_digest_enabled: bool | Unset = UNSET
    created_at: datetime.datetime | Unset = UNSET
    updated_at: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        email_enabled = self.email_enabled

        ntfy_enabled = self.ntfy_enabled

        ntfy_server_url = self.ntfy_server_url

        ntfy_topic = self.ntfy_topic

        webhook_enabled = self.webhook_enabled

        webhook_url = self.webhook_url

        budget_alerts_enabled = self.budget_alerts_enabled

        budget_alert_threshold = self.budget_alert_threshold

        reminders_enabled = self.reminders_enabled

        reminder_days_before = self.reminder_days_before

        weekly_digest_enabled = self.weekly_digest_enabled

        created_at: str | Unset = UNSET
        if not isinstance(self.created_at, Unset):
            created_at = self.created_at.isoformat()

        updated_at: str | Unset = UNSET
        if not isinstance(self.updated_at, Unset):
            updated_at = self.updated_at.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if id is not UNSET:
            field_dict["id"] = id
        if email_enabled is not UNSET:
            field_dict["email_enabled"] = email_enabled
        if ntfy_enabled is not UNSET:
            field_dict["ntfy_enabled"] = ntfy_enabled
        if ntfy_server_url is not UNSET:
            field_dict["ntfy_server_url"] = ntfy_server_url
        if ntfy_topic is not UNSET:
            field_dict["ntfy_topic"] = ntfy_topic
        if webhook_enabled is not UNSET:
            field_dict["webhook_enabled"] = webhook_enabled
        if webhook_url is not UNSET:
            field_dict["webhook_url"] = webhook_url
        if budget_alerts_enabled is not UNSET:
            field_dict["budget_alerts_enabled"] = budget_alerts_enabled
        if budget_alert_threshold is not UNSET:
            field_dict["budget_alert_threshold"] = budget_alert_threshold
        if reminders_enabled is not UNSET:
            field_dict["reminders_enabled"] = reminders_enabled
        if reminder_days_before is not UNSET:
            field_dict["reminder_days_before"] = reminder_days_before
        if weekly_digest_enabled is not UNSET:
            field_dict["weekly_digest_enabled"] = weekly_digest_enabled
        if created_at is not UNSET:
            field_dict["created_at"] = created_at
        if updated_at is not UNSET:
            field_dict["updated_at"] = updated_at

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        id = d.pop("id", UNSET)

        email_enabled = d.pop("email_enabled", UNSET)

        ntfy_enabled = d.pop("ntfy_enabled", UNSET)

        ntfy_server_url = d.pop("ntfy_server_url", UNSET)

        ntfy_topic = d.pop("ntfy_topic", UNSET)

        webhook_enabled = d.pop("webhook_enabled", UNSET)

        webhook_url = d.pop("webhook_url", UNSET)

        budget_alerts_enabled = d.pop("budget_alerts_enabled", UNSET)

        budget_alert_threshold = d.pop("budget_alert_threshold", UNSET)

        reminders_enabled = d.pop("reminders_enabled", UNSET)

        reminder_days_before = d.pop("reminder_days_before", UNSET)

        weekly_digest_enabled = d.pop("weekly_digest_enabled", UNSET)

        _created_at = d.pop("created_at", UNSET)
        created_at: datetime.datetime | Unset
        if isinstance(_created_at, Unset):
            created_at = UNSET
        else:
            created_at = datetime.datetime.fromisoformat(_created_at)

        _updated_at = d.pop("updated_at", UNSET)
        updated_at: datetime.datetime | Unset
        if isinstance(_updated_at, Unset):
            updated_at = UNSET
        else:
            updated_at = datetime.datetime.fromisoformat(_updated_at)

        patched_notification_preference = cls(
            id=id,
            email_enabled=email_enabled,
            ntfy_enabled=ntfy_enabled,
            ntfy_server_url=ntfy_server_url,
            ntfy_topic=ntfy_topic,
            webhook_enabled=webhook_enabled,
            webhook_url=webhook_url,
            budget_alerts_enabled=budget_alerts_enabled,
            budget_alert_threshold=budget_alert_threshold,
            reminders_enabled=reminders_enabled,
            reminder_days_before=reminder_days_before,
            weekly_digest_enabled=weekly_digest_enabled,
            created_at=created_at,
            updated_at=updated_at,
        )

        patched_notification_preference.additional_properties = d
        return patched_notification_preference

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

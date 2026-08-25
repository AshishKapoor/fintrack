from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..models.sync_connection_provider_enum import SyncConnectionProviderEnum
from ..models.sync_connection_status_enum import SyncConnectionStatusEnum

if TYPE_CHECKING:
    from ..models.sync_connection_account import SyncConnectionAccount


T = TypeVar("T", bound="SyncConnection")


@_attrs_define
class SyncConnection:
    """
    Attributes:
        id (int):
        budget_file (int):
        provider (SyncConnectionProviderEnum): * `gocardless` - GoCardless Bank Account Data
            * `simplefin` - SimpleFIN Bridge
        provider_label (str):
        status (SyncConnectionStatusEnum): * `pending` - Pending
            * `active` - Active
            * `error` - Error
            * `revoked` - Revoked
        institution_name (str):
        last_synced_at (datetime.datetime | None):
        last_error (str):
        linked_accounts (list[SyncConnectionAccount]):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
    """

    id: int
    budget_file: int
    provider: SyncConnectionProviderEnum
    provider_label: str
    status: SyncConnectionStatusEnum
    institution_name: str
    last_synced_at: datetime.datetime | None
    last_error: str
    linked_accounts: list[SyncConnectionAccount]
    created_at: datetime.datetime
    updated_at: datetime.datetime
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        budget_file = self.budget_file

        provider = self.provider.value

        provider_label = self.provider_label

        status = self.status.value

        institution_name = self.institution_name

        last_synced_at: None | str
        if isinstance(self.last_synced_at, datetime.datetime):
            last_synced_at = self.last_synced_at.isoformat()
        else:
            last_synced_at = self.last_synced_at

        last_error = self.last_error

        linked_accounts = []
        for linked_accounts_item_data in self.linked_accounts:
            linked_accounts_item = linked_accounts_item_data.to_dict()
            linked_accounts.append(linked_accounts_item)

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "budget_file": budget_file,
                "provider": provider,
                "provider_label": provider_label,
                "status": status,
                "institution_name": institution_name,
                "last_synced_at": last_synced_at,
                "last_error": last_error,
                "linked_accounts": linked_accounts,
                "created_at": created_at,
                "updated_at": updated_at,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.sync_connection_account import SyncConnectionAccount

        d = dict(src_dict)
        id = d.pop("id")

        budget_file = d.pop("budget_file")

        provider = SyncConnectionProviderEnum(d.pop("provider"))

        provider_label = d.pop("provider_label")

        status = SyncConnectionStatusEnum(d.pop("status"))

        institution_name = d.pop("institution_name")

        def _parse_last_synced_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                last_synced_at_type_0 = datetime.datetime.fromisoformat(data)

                return last_synced_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        last_synced_at = _parse_last_synced_at(d.pop("last_synced_at"))

        last_error = d.pop("last_error")

        linked_accounts = []
        _linked_accounts = d.pop("linked_accounts")
        for linked_accounts_item_data in _linked_accounts:
            linked_accounts_item = SyncConnectionAccount.from_dict(
                linked_accounts_item_data
            )

            linked_accounts.append(linked_accounts_item)

        created_at = datetime.datetime.fromisoformat(d.pop("created_at"))

        updated_at = datetime.datetime.fromisoformat(d.pop("updated_at"))

        sync_connection = cls(
            id=id,
            budget_file=budget_file,
            provider=provider,
            provider_label=provider_label,
            status=status,
            institution_name=institution_name,
            last_synced_at=last_synced_at,
            last_error=last_error,
            linked_accounts=linked_accounts,
            created_at=created_at,
            updated_at=updated_at,
        )

        sync_connection.additional_properties = d
        return sync_connection

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

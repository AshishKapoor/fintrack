from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..models.sync_connection_provider_enum import SyncConnectionProviderEnum
from ..models.sync_connection_status_enum import SyncConnectionStatusEnum
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.sync_connection_account import SyncConnectionAccount


T = TypeVar("T", bound="PatchedSyncConnection")


@_attrs_define
class PatchedSyncConnection:
    """
    Attributes:
        id (int | Unset):
        budget_file (int | Unset):
        provider (SyncConnectionProviderEnum | Unset): * `gocardless` - GoCardless Bank Account Data
            * `simplefin` - SimpleFIN Bridge
        provider_label (str | Unset):
        status (SyncConnectionStatusEnum | Unset): * `pending` - Pending
            * `active` - Active
            * `error` - Error
            * `revoked` - Revoked
        institution_name (str | Unset):
        last_synced_at (datetime.datetime | None | Unset):
        last_error (str | Unset):
        linked_accounts (list[SyncConnectionAccount] | Unset):
        created_at (datetime.datetime | Unset):
        updated_at (datetime.datetime | Unset):
    """

    id: int | Unset = UNSET
    budget_file: int | Unset = UNSET
    provider: SyncConnectionProviderEnum | Unset = UNSET
    provider_label: str | Unset = UNSET
    status: SyncConnectionStatusEnum | Unset = UNSET
    institution_name: str | Unset = UNSET
    last_synced_at: datetime.datetime | None | Unset = UNSET
    last_error: str | Unset = UNSET
    linked_accounts: list[SyncConnectionAccount] | Unset = UNSET
    created_at: datetime.datetime | Unset = UNSET
    updated_at: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        budget_file = self.budget_file

        provider: str | Unset = UNSET
        if not isinstance(self.provider, Unset):
            provider = self.provider.value

        provider_label = self.provider_label

        status: str | Unset = UNSET
        if not isinstance(self.status, Unset):
            status = self.status.value

        institution_name = self.institution_name

        last_synced_at: None | str | Unset
        if isinstance(self.last_synced_at, Unset):
            last_synced_at = UNSET
        elif isinstance(self.last_synced_at, datetime.datetime):
            last_synced_at = self.last_synced_at.isoformat()
        else:
            last_synced_at = self.last_synced_at

        last_error = self.last_error

        linked_accounts: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.linked_accounts, Unset):
            linked_accounts = []
            for linked_accounts_item_data in self.linked_accounts:
                linked_accounts_item = linked_accounts_item_data.to_dict()
                linked_accounts.append(linked_accounts_item)

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
        if budget_file is not UNSET:
            field_dict["budget_file"] = budget_file
        if provider is not UNSET:
            field_dict["provider"] = provider
        if provider_label is not UNSET:
            field_dict["provider_label"] = provider_label
        if status is not UNSET:
            field_dict["status"] = status
        if institution_name is not UNSET:
            field_dict["institution_name"] = institution_name
        if last_synced_at is not UNSET:
            field_dict["last_synced_at"] = last_synced_at
        if last_error is not UNSET:
            field_dict["last_error"] = last_error
        if linked_accounts is not UNSET:
            field_dict["linked_accounts"] = linked_accounts
        if created_at is not UNSET:
            field_dict["created_at"] = created_at
        if updated_at is not UNSET:
            field_dict["updated_at"] = updated_at

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.sync_connection_account import SyncConnectionAccount

        d = dict(src_dict)
        id = d.pop("id", UNSET)

        budget_file = d.pop("budget_file", UNSET)

        _provider = d.pop("provider", UNSET)
        provider: SyncConnectionProviderEnum | Unset
        if isinstance(_provider, Unset):
            provider = UNSET
        else:
            provider = SyncConnectionProviderEnum(_provider)

        provider_label = d.pop("provider_label", UNSET)

        _status = d.pop("status", UNSET)
        status: SyncConnectionStatusEnum | Unset
        if isinstance(_status, Unset):
            status = UNSET
        else:
            status = SyncConnectionStatusEnum(_status)

        institution_name = d.pop("institution_name", UNSET)

        def _parse_last_synced_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                last_synced_at_type_0 = datetime.datetime.fromisoformat(data)

                return last_synced_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        last_synced_at = _parse_last_synced_at(d.pop("last_synced_at", UNSET))

        last_error = d.pop("last_error", UNSET)

        _linked_accounts = d.pop("linked_accounts", UNSET)
        linked_accounts: list[SyncConnectionAccount] | Unset = UNSET
        if _linked_accounts is not UNSET:
            linked_accounts = []
            for linked_accounts_item_data in _linked_accounts:
                linked_accounts_item = SyncConnectionAccount.from_dict(
                    linked_accounts_item_data
                )

                linked_accounts.append(linked_accounts_item)

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

        patched_sync_connection = cls(
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

        patched_sync_connection.additional_properties = d
        return patched_sync_connection

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

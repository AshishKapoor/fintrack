from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

T = TypeVar("T", bound="SyncConnectionAccount")


@_attrs_define
class SyncConnectionAccount:
    """
    Attributes:
        id (int):
        connection (int):
        account (int | None):
        account_name (str):
        external_account_id (str):
        display_name (str):
        currency_code (str):
        iban (str):
        last_synced_at (datetime.datetime | None):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
    """

    id: int
    connection: int
    account: int | None
    account_name: str
    external_account_id: str
    display_name: str
    currency_code: str
    iban: str
    last_synced_at: datetime.datetime | None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        connection = self.connection

        account: int | None
        account = self.account

        account_name = self.account_name

        external_account_id = self.external_account_id

        display_name = self.display_name

        currency_code = self.currency_code

        iban = self.iban

        last_synced_at: None | str
        if isinstance(self.last_synced_at, datetime.datetime):
            last_synced_at = self.last_synced_at.isoformat()
        else:
            last_synced_at = self.last_synced_at

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "connection": connection,
                "account": account,
                "account_name": account_name,
                "external_account_id": external_account_id,
                "display_name": display_name,
                "currency_code": currency_code,
                "iban": iban,
                "last_synced_at": last_synced_at,
                "created_at": created_at,
                "updated_at": updated_at,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        id = d.pop("id")

        connection = d.pop("connection")

        def _parse_account(data: object) -> int | None:
            if data is None:
                return data
            return cast(int | None, data)

        account = _parse_account(d.pop("account"))

        account_name = d.pop("account_name")

        external_account_id = d.pop("external_account_id")

        display_name = d.pop("display_name")

        currency_code = d.pop("currency_code")

        iban = d.pop("iban")

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

        created_at = datetime.datetime.fromisoformat(d.pop("created_at"))

        updated_at = datetime.datetime.fromisoformat(d.pop("updated_at"))

        sync_connection_account = cls(
            id=id,
            connection=connection,
            account=account,
            account_name=account_name,
            external_account_id=external_account_id,
            display_name=display_name,
            currency_code=currency_code,
            iban=iban,
            last_synced_at=last_synced_at,
            created_at=created_at,
            updated_at=updated_at,
        )

        sync_connection_account.additional_properties = d
        return sync_connection_account

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

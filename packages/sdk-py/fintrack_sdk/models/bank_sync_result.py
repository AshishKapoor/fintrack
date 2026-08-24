from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

T = TypeVar("T", bound="BankSyncResult")


@_attrs_define
class BankSyncResult:
    """
    Attributes:
        accounts_synced (int):
        created (int):
        skipped (int):
        errors (list[str]):
    """

    accounts_synced: int
    created: int
    skipped: int
    errors: list[str]
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        accounts_synced = self.accounts_synced

        created = self.created

        skipped = self.skipped

        errors = self.errors

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "accounts_synced": accounts_synced,
                "created": created,
                "skipped": skipped,
                "errors": errors,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        accounts_synced = d.pop("accounts_synced")

        created = d.pop("created")

        skipped = d.pop("skipped")

        errors = cast(list[str], d.pop("errors"))

        bank_sync_result = cls(
            accounts_synced=accounts_synced,
            created=created,
            skipped=skipped,
            errors=errors,
        )

        bank_sync_result.additional_properties = d
        return bank_sync_result

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

from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..types import UNSET, Unset

T = TypeVar("T", bound="BudgetFile")


@_attrs_define
class BudgetFile:
    """
    Attributes:
        id (int):
        name (str):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        currency_code (str | Unset):
        is_default (bool | Unset):
        organization (int | Unset):
    """

    id: int
    name: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    currency_code: str | Unset = UNSET
    is_default: bool | Unset = UNSET
    organization: int | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        name = self.name

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        currency_code = self.currency_code

        is_default = self.is_default

        organization = self.organization

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "name": name,
                "created_at": created_at,
                "updated_at": updated_at,
            }
        )
        if currency_code is not UNSET:
            field_dict["currency_code"] = currency_code
        if is_default is not UNSET:
            field_dict["is_default"] = is_default
        if organization is not UNSET:
            field_dict["organization"] = organization

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        id = d.pop("id")

        name = d.pop("name")

        created_at = datetime.datetime.fromisoformat(d.pop("created_at"))

        updated_at = datetime.datetime.fromisoformat(d.pop("updated_at"))

        currency_code = d.pop("currency_code", UNSET)

        is_default = d.pop("is_default", UNSET)

        organization = d.pop("organization", UNSET)

        budget_file = cls(
            id=id,
            name=name,
            created_at=created_at,
            updated_at=updated_at,
            currency_code=currency_code,
            is_default=is_default,
            organization=organization,
        )

        budget_file.additional_properties = d
        return budget_file

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

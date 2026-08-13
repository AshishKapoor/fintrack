from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..types import UNSET, Unset

T = TypeVar("T", bound="PatchedBudgetFile")


@_attrs_define
class PatchedBudgetFile:
    """
    Attributes:
        id (int | Unset):
        name (str | Unset):
        currency_code (str | Unset):
        is_default (bool | Unset):
        organization (int | None | Unset):
        created_at (datetime.datetime | Unset):
        updated_at (datetime.datetime | Unset):
    """

    id: int | Unset = UNSET
    name: str | Unset = UNSET
    currency_code: str | Unset = UNSET
    is_default: bool | Unset = UNSET
    organization: int | None | Unset = UNSET
    created_at: datetime.datetime | Unset = UNSET
    updated_at: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        name = self.name

        currency_code = self.currency_code

        is_default = self.is_default

        organization: int | None | Unset
        if isinstance(self.organization, Unset):
            organization = UNSET
        else:
            organization = self.organization

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
        if name is not UNSET:
            field_dict["name"] = name
        if currency_code is not UNSET:
            field_dict["currency_code"] = currency_code
        if is_default is not UNSET:
            field_dict["is_default"] = is_default
        if organization is not UNSET:
            field_dict["organization"] = organization
        if created_at is not UNSET:
            field_dict["created_at"] = created_at
        if updated_at is not UNSET:
            field_dict["updated_at"] = updated_at

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        id = d.pop("id", UNSET)

        name = d.pop("name", UNSET)

        currency_code = d.pop("currency_code", UNSET)

        is_default = d.pop("is_default", UNSET)

        def _parse_organization(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        organization = _parse_organization(d.pop("organization", UNSET))

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

        patched_budget_file = cls(
            id=id,
            name=name,
            currency_code=currency_code,
            is_default=is_default,
            organization=organization,
            created_at=created_at,
            updated_at=updated_at,
        )

        patched_budget_file.additional_properties = d
        return patched_budget_file

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

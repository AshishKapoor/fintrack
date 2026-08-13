from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..types import UNSET, Unset

T = TypeVar("T", bound="PatchedBudget")


@_attrs_define
class PatchedBudget:
    """
    Attributes:
        id (int | Unset):
        month (int | Unset):
        year (int | Unset):
        amount_limit (str | Unset):
        user (int | Unset):
        category (int | Unset):
    """

    id: int | Unset = UNSET
    month: int | Unset = UNSET
    year: int | Unset = UNSET
    amount_limit: str | Unset = UNSET
    user: int | Unset = UNSET
    category: int | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        month = self.month

        year = self.year

        amount_limit = self.amount_limit

        user = self.user

        category = self.category

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if id is not UNSET:
            field_dict["id"] = id
        if month is not UNSET:
            field_dict["month"] = month
        if year is not UNSET:
            field_dict["year"] = year
        if amount_limit is not UNSET:
            field_dict["amount_limit"] = amount_limit
        if user is not UNSET:
            field_dict["user"] = user
        if category is not UNSET:
            field_dict["category"] = category

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        id = d.pop("id", UNSET)

        month = d.pop("month", UNSET)

        year = d.pop("year", UNSET)

        amount_limit = d.pop("amount_limit", UNSET)

        user = d.pop("user", UNSET)

        category = d.pop("category", UNSET)

        patched_budget = cls(
            id=id,
            month=month,
            year=year,
            amount_limit=amount_limit,
            user=user,
            category=category,
        )

        patched_budget.additional_properties = d
        return patched_budget

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

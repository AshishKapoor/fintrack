from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

T = TypeVar("T", bound="Budget")


@_attrs_define
class Budget:
    """
    Attributes:
        id (int):
        month (int):
        year (int):
        amount_limit (str):
        user (int):
        category (int):
    """

    id: int
    month: int
    year: int
    amount_limit: str
    user: int
    category: int
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
        field_dict.update(
            {
                "id": id,
                "month": month,
                "year": year,
                "amount_limit": amount_limit,
                "user": user,
                "category": category,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        id = d.pop("id")

        month = d.pop("month")

        year = d.pop("year")

        amount_limit = d.pop("amount_limit")

        user = d.pop("user")

        category = d.pop("category")

        budget = cls(
            id=id,
            month=month,
            year=year,
            amount_limit=amount_limit,
            user=user,
            category=category,
        )

        budget.additional_properties = d
        return budget

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

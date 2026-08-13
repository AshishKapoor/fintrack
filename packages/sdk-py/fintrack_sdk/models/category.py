from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..models.type_f1e_enum import TypeF1EEnum

T = TypeVar("T", bound="Category")


@_attrs_define
class Category:
    """
    Attributes:
        id (int):
        name (str):
        type_ (TypeF1EEnum): * `income` - Income
            * `expense` - Expense
        user (int | None):
    """

    id: int
    name: str
    type_: TypeF1EEnum
    user: int | None
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        name = self.name

        type_ = self.type_.value

        user: int | None
        user = self.user

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "name": name,
                "type": type_,
                "user": user,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        id = d.pop("id")

        name = d.pop("name")

        type_ = TypeF1EEnum(d.pop("type"))

        def _parse_user(data: object) -> int | None:
            if data is None:
                return data
            return cast(int | None, data)

        user = _parse_user(d.pop("user"))

        category = cls(
            id=id,
            name=name,
            type_=type_,
            user=user,
        )

        category.additional_properties = d
        return category

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

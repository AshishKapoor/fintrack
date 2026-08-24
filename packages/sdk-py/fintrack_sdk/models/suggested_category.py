from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

T = TypeVar("T", bound="SuggestedCategory")


@_attrs_define
class SuggestedCategory:
    """Response shape for PayeeViewSet.suggested_category - schema-only (see
    @extend_schema on the view): without it, drf-spectacular falls back to
    the viewset's own PayeeSerializer for this action's response, which
    doesn't have these fields and would generate a wrong/unusable client type.

        Attributes:
            category (int | None):
            category_name (str):
    """

    category: int | None
    category_name: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        category: int | None
        category = self.category

        category_name = self.category_name

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "category": category,
                "category_name": category_name,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)

        def _parse_category(data: object) -> int | None:
            if data is None:
                return data
            return cast(int | None, data)

        category = _parse_category(d.pop("category"))

        category_name = d.pop("category_name")

        suggested_category = cls(
            category=category,
            category_name=category_name,
        )

        suggested_category.additional_properties = d
        return suggested_category

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

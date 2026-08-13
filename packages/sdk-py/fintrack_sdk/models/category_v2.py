from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..models.kind_enum import KindEnum
from ..types import UNSET, Unset

T = TypeVar("T", bound="CategoryV2")


@_attrs_define
class CategoryV2:
    """
    Attributes:
        id (int):
        budget_file (int):
        name (str):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        group (int | None | Unset):
        kind (KindEnum | Unset): * `income` - Income
            * `expense` - Expense
        is_archived (bool | Unset):
        notes_md (str | Unset):
    """

    id: int
    budget_file: int
    name: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    group: int | None | Unset = UNSET
    kind: KindEnum | Unset = UNSET
    is_archived: bool | Unset = UNSET
    notes_md: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        budget_file = self.budget_file

        name = self.name

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        group: int | None | Unset
        if isinstance(self.group, Unset):
            group = UNSET
        else:
            group = self.group

        kind: str | Unset = UNSET
        if not isinstance(self.kind, Unset):
            kind = self.kind.value

        is_archived = self.is_archived

        notes_md = self.notes_md

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "budget_file": budget_file,
                "name": name,
                "created_at": created_at,
                "updated_at": updated_at,
            }
        )
        if group is not UNSET:
            field_dict["group"] = group
        if kind is not UNSET:
            field_dict["kind"] = kind
        if is_archived is not UNSET:
            field_dict["is_archived"] = is_archived
        if notes_md is not UNSET:
            field_dict["notes_md"] = notes_md

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        id = d.pop("id")

        budget_file = d.pop("budget_file")

        name = d.pop("name")

        created_at = datetime.datetime.fromisoformat(d.pop("created_at"))

        updated_at = datetime.datetime.fromisoformat(d.pop("updated_at"))

        def _parse_group(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        group = _parse_group(d.pop("group", UNSET))

        _kind = d.pop("kind", UNSET)
        kind: KindEnum | Unset
        if isinstance(_kind, Unset):
            kind = UNSET
        else:
            kind = KindEnum(_kind)

        is_archived = d.pop("is_archived", UNSET)

        notes_md = d.pop("notes_md", UNSET)

        category_v2 = cls(
            id=id,
            budget_file=budget_file,
            name=name,
            created_at=created_at,
            updated_at=updated_at,
            group=group,
            kind=kind,
            is_archived=is_archived,
            notes_md=notes_md,
        )

        category_v2.additional_properties = d
        return category_v2

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

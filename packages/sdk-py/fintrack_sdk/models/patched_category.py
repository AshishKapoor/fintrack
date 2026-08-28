from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..models.kind_enum import KindEnum
from ..types import UNSET, Unset

T = TypeVar("T", bound="PatchedCategory")


@_attrs_define
class PatchedCategory:
    """
    Attributes:
        id (int | Unset):
        budget_file (int | Unset):
        group (int | None | Unset):
        name (str | Unset):
        kind (KindEnum | Unset): * `income` - Income
            * `expense` - Expense
        is_archived (bool | Unset):
        notes_md (str | Unset):
        created_at (datetime.datetime | Unset):
        updated_at (datetime.datetime | Unset):
    """

    id: int | Unset = UNSET
    budget_file: int | Unset = UNSET
    group: int | None | Unset = UNSET
    name: str | Unset = UNSET
    kind: KindEnum | Unset = UNSET
    is_archived: bool | Unset = UNSET
    notes_md: str | Unset = UNSET
    created_at: datetime.datetime | Unset = UNSET
    updated_at: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        budget_file = self.budget_file

        group: int | None | Unset
        if isinstance(self.group, Unset):
            group = UNSET
        else:
            group = self.group

        name = self.name

        kind: str | Unset = UNSET
        if not isinstance(self.kind, Unset):
            kind = self.kind.value

        is_archived = self.is_archived

        notes_md = self.notes_md

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
        if group is not UNSET:
            field_dict["group"] = group
        if name is not UNSET:
            field_dict["name"] = name
        if kind is not UNSET:
            field_dict["kind"] = kind
        if is_archived is not UNSET:
            field_dict["is_archived"] = is_archived
        if notes_md is not UNSET:
            field_dict["notes_md"] = notes_md
        if created_at is not UNSET:
            field_dict["created_at"] = created_at
        if updated_at is not UNSET:
            field_dict["updated_at"] = updated_at

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        id = d.pop("id", UNSET)

        budget_file = d.pop("budget_file", UNSET)

        def _parse_group(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        group = _parse_group(d.pop("group", UNSET))

        name = d.pop("name", UNSET)

        _kind = d.pop("kind", UNSET)
        kind: KindEnum | Unset
        if isinstance(_kind, Unset):
            kind = UNSET
        else:
            kind = KindEnum(_kind)

        is_archived = d.pop("is_archived", UNSET)

        notes_md = d.pop("notes_md", UNSET)

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

        patched_category = cls(
            id=id,
            budget_file=budget_file,
            group=group,
            name=name,
            kind=kind,
            is_archived=is_archived,
            notes_md=notes_md,
            created_at=created_at,
            updated_at=updated_at,
        )

        patched_category.additional_properties = d
        return patched_category

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

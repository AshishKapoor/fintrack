from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..models.mode_enum import ModeEnum
from ..types import UNSET, Unset

T = TypeVar("T", bound="PatchedBudgetMonth")


@_attrs_define
class PatchedBudgetMonth:
    """
    Attributes:
        id (int | Unset):
        budget_file (int | Unset):
        year (int | Unset):
        month (int | Unset):
        mode (ModeEnum | Unset): * `envelope` - Envelope
            * `traditional` - Traditional
        notes_md (str | Unset):
        created_at (datetime.datetime | Unset):
        updated_at (datetime.datetime | Unset):
    """

    id: int | Unset = UNSET
    budget_file: int | Unset = UNSET
    year: int | Unset = UNSET
    month: int | Unset = UNSET
    mode: ModeEnum | Unset = UNSET
    notes_md: str | Unset = UNSET
    created_at: datetime.datetime | Unset = UNSET
    updated_at: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        budget_file = self.budget_file

        year = self.year

        month = self.month

        mode: str | Unset = UNSET
        if not isinstance(self.mode, Unset):
            mode = self.mode.value

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
        if year is not UNSET:
            field_dict["year"] = year
        if month is not UNSET:
            field_dict["month"] = month
        if mode is not UNSET:
            field_dict["mode"] = mode
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

        year = d.pop("year", UNSET)

        month = d.pop("month", UNSET)

        _mode = d.pop("mode", UNSET)
        mode: ModeEnum | Unset
        if isinstance(_mode, Unset):
            mode = UNSET
        else:
            mode = ModeEnum(_mode)

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

        patched_budget_month = cls(
            id=id,
            budget_file=budget_file,
            year=year,
            month=month,
            mode=mode,
            notes_md=notes_md,
            created_at=created_at,
            updated_at=updated_at,
        )

        patched_budget_month.additional_properties = d
        return patched_budget_month

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

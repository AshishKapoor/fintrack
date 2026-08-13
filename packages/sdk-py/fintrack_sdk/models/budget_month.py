from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..models.mode_enum import ModeEnum
from ..types import UNSET, Unset

T = TypeVar("T", bound="BudgetMonth")


@_attrs_define
class BudgetMonth:
    """
    Attributes:
        id (int):
        budget_file (int):
        year (int):
        month (int):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        mode (ModeEnum | Unset): * `envelope` - Envelope
            * `traditional` - Traditional
        notes_md (str | Unset):
    """

    id: int
    budget_file: int
    year: int
    month: int
    created_at: datetime.datetime
    updated_at: datetime.datetime
    mode: ModeEnum | Unset = UNSET
    notes_md: str | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        budget_file = self.budget_file

        year = self.year

        month = self.month

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        mode: str | Unset = UNSET
        if not isinstance(self.mode, Unset):
            mode = self.mode.value

        notes_md = self.notes_md

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "budget_file": budget_file,
                "year": year,
                "month": month,
                "created_at": created_at,
                "updated_at": updated_at,
            }
        )
        if mode is not UNSET:
            field_dict["mode"] = mode
        if notes_md is not UNSET:
            field_dict["notes_md"] = notes_md

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        id = d.pop("id")

        budget_file = d.pop("budget_file")

        year = d.pop("year")

        month = d.pop("month")

        created_at = datetime.datetime.fromisoformat(d.pop("created_at"))

        updated_at = datetime.datetime.fromisoformat(d.pop("updated_at"))

        _mode = d.pop("mode", UNSET)
        mode: ModeEnum | Unset
        if isinstance(_mode, Unset):
            mode = UNSET
        else:
            mode = ModeEnum(_mode)

        notes_md = d.pop("notes_md", UNSET)

        budget_month = cls(
            id=id,
            budget_file=budget_file,
            year=year,
            month=month,
            created_at=created_at,
            updated_at=updated_at,
            mode=mode,
            notes_md=notes_md,
        )

        budget_month.additional_properties = d
        return budget_month

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

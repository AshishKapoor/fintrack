from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..models.report_type_enum import ReportTypeEnum
from ..types import UNSET, Unset

T = TypeVar("T", bound="PatchedSavedReport")


@_attrs_define
class PatchedSavedReport:
    """
    Attributes:
        id (int | Unset):
        budget_file (int | Unset):
        name (str | Unset):
        report_type (ReportTypeEnum | Unset): * `net_worth` - Net Worth
            * `cash_flow` - Cash Flow
            * `spending` - Spending Trends
            * `custom` - Custom
        definition (Any | Unset):
        pinned (bool | Unset):
        created_at (datetime.datetime | Unset):
        updated_at (datetime.datetime | Unset):
    """

    id: int | Unset = UNSET
    budget_file: int | Unset = UNSET
    name: str | Unset = UNSET
    report_type: ReportTypeEnum | Unset = UNSET
    definition: Any | Unset = UNSET
    pinned: bool | Unset = UNSET
    created_at: datetime.datetime | Unset = UNSET
    updated_at: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        budget_file = self.budget_file

        name = self.name

        report_type: str | Unset = UNSET
        if not isinstance(self.report_type, Unset):
            report_type = self.report_type.value

        definition = self.definition

        pinned = self.pinned

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
        if name is not UNSET:
            field_dict["name"] = name
        if report_type is not UNSET:
            field_dict["report_type"] = report_type
        if definition is not UNSET:
            field_dict["definition"] = definition
        if pinned is not UNSET:
            field_dict["pinned"] = pinned
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

        name = d.pop("name", UNSET)

        _report_type = d.pop("report_type", UNSET)
        report_type: ReportTypeEnum | Unset
        if isinstance(_report_type, Unset):
            report_type = UNSET
        else:
            report_type = ReportTypeEnum(_report_type)

        definition = d.pop("definition", UNSET)

        pinned = d.pop("pinned", UNSET)

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

        patched_saved_report = cls(
            id=id,
            budget_file=budget_file,
            name=name,
            report_type=report_type,
            definition=definition,
            pinned=pinned,
            created_at=created_at,
            updated_at=updated_at,
        )

        patched_saved_report.additional_properties = d
        return patched_saved_report

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

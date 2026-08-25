from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..models.report_type_enum import ReportTypeEnum
from ..types import UNSET, Unset

T = TypeVar("T", bound="SavedReport")


@_attrs_define
class SavedReport:
    """
    Attributes:
        id (int):
        budget_file (int):
        name (str):
        report_type (ReportTypeEnum): * `net_worth` - Net Worth
            * `cash_flow` - Cash Flow
            * `spending` - Spending Trends
            * `custom` - Custom
            * `net_worth_series` - Net Worth Over Time
            * `cash_flow_sankey` - Cash Flow Sankey
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        definition (Any | Unset):
        pinned (bool | Unset):
    """

    id: int
    budget_file: int
    name: str
    report_type: ReportTypeEnum
    created_at: datetime.datetime
    updated_at: datetime.datetime
    definition: Any | Unset = UNSET
    pinned: bool | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        budget_file = self.budget_file

        name = self.name

        report_type = self.report_type.value

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        definition = self.definition

        pinned = self.pinned

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "budget_file": budget_file,
                "name": name,
                "report_type": report_type,
                "created_at": created_at,
                "updated_at": updated_at,
            }
        )
        if definition is not UNSET:
            field_dict["definition"] = definition
        if pinned is not UNSET:
            field_dict["pinned"] = pinned

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        id = d.pop("id")

        budget_file = d.pop("budget_file")

        name = d.pop("name")

        report_type = ReportTypeEnum(d.pop("report_type"))

        created_at = datetime.datetime.fromisoformat(d.pop("created_at"))

        updated_at = datetime.datetime.fromisoformat(d.pop("updated_at"))

        definition = d.pop("definition", UNSET)

        pinned = d.pop("pinned", UNSET)

        saved_report = cls(
            id=id,
            budget_file=budget_file,
            name=name,
            report_type=report_type,
            created_at=created_at,
            updated_at=updated_at,
            definition=definition,
            pinned=pinned,
        )

        saved_report.additional_properties = d
        return saved_report

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

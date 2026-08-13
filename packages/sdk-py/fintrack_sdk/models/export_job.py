from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..models.export_job_format_enum import ExportJobFormatEnum
from ..models.export_job_status_enum import ExportJobStatusEnum
from ..types import UNSET, Unset

T = TypeVar("T", bound="ExportJob")


@_attrs_define
class ExportJob:
    """
    Attributes:
        id (int):
        budget_file (int):
        format_ (ExportJobFormatEnum): * `csv` - CSV
            * `json` - JSON
            * `xlsx` - XLSX
        status (ExportJobStatusEnum): * `pending` - Pending
            * `running` - Running
            * `completed` - Completed
            * `failed` - Failed
        file_name (str):
        error_message (str):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        completed_at (datetime.datetime | None):
        filters (Any | Unset):
    """

    id: int
    budget_file: int
    format_: ExportJobFormatEnum
    status: ExportJobStatusEnum
    file_name: str
    error_message: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    completed_at: datetime.datetime | None
    filters: Any | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        budget_file = self.budget_file

        format_ = self.format_.value

        status = self.status.value

        file_name = self.file_name

        error_message = self.error_message

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        completed_at: None | str
        if isinstance(self.completed_at, datetime.datetime):
            completed_at = self.completed_at.isoformat()
        else:
            completed_at = self.completed_at

        filters = self.filters

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "budget_file": budget_file,
                "format": format_,
                "status": status,
                "file_name": file_name,
                "error_message": error_message,
                "created_at": created_at,
                "updated_at": updated_at,
                "completed_at": completed_at,
            }
        )
        if filters is not UNSET:
            field_dict["filters"] = filters

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        id = d.pop("id")

        budget_file = d.pop("budget_file")

        format_ = ExportJobFormatEnum(d.pop("format"))

        status = ExportJobStatusEnum(d.pop("status"))

        file_name = d.pop("file_name")

        error_message = d.pop("error_message")

        created_at = datetime.datetime.fromisoformat(d.pop("created_at"))

        updated_at = datetime.datetime.fromisoformat(d.pop("updated_at"))

        def _parse_completed_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                completed_at_type_0 = datetime.datetime.fromisoformat(data)

                return completed_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        completed_at = _parse_completed_at(d.pop("completed_at"))

        filters = d.pop("filters", UNSET)

        export_job = cls(
            id=id,
            budget_file=budget_file,
            format_=format_,
            status=status,
            file_name=file_name,
            error_message=error_message,
            created_at=created_at,
            updated_at=updated_at,
            completed_at=completed_at,
            filters=filters,
        )

        export_job.additional_properties = d
        return export_job

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

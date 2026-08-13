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

T = TypeVar("T", bound="PatchedExportJob")


@_attrs_define
class PatchedExportJob:
    """
    Attributes:
        id (int | Unset):
        budget_file (int | Unset):
        format_ (ExportJobFormatEnum | Unset): * `csv` - CSV
            * `json` - JSON
            * `xlsx` - XLSX
        status (ExportJobStatusEnum | Unset): * `pending` - Pending
            * `running` - Running
            * `completed` - Completed
            * `failed` - Failed
        filters (Any | Unset):
        file_name (str | Unset):
        error_message (str | Unset):
        created_at (datetime.datetime | Unset):
        updated_at (datetime.datetime | Unset):
        completed_at (datetime.datetime | None | Unset):
    """

    id: int | Unset = UNSET
    budget_file: int | Unset = UNSET
    format_: ExportJobFormatEnum | Unset = UNSET
    status: ExportJobStatusEnum | Unset = UNSET
    filters: Any | Unset = UNSET
    file_name: str | Unset = UNSET
    error_message: str | Unset = UNSET
    created_at: datetime.datetime | Unset = UNSET
    updated_at: datetime.datetime | Unset = UNSET
    completed_at: datetime.datetime | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        budget_file = self.budget_file

        format_: str | Unset = UNSET
        if not isinstance(self.format_, Unset):
            format_ = self.format_.value

        status: str | Unset = UNSET
        if not isinstance(self.status, Unset):
            status = self.status.value

        filters = self.filters

        file_name = self.file_name

        error_message = self.error_message

        created_at: str | Unset = UNSET
        if not isinstance(self.created_at, Unset):
            created_at = self.created_at.isoformat()

        updated_at: str | Unset = UNSET
        if not isinstance(self.updated_at, Unset):
            updated_at = self.updated_at.isoformat()

        completed_at: None | str | Unset
        if isinstance(self.completed_at, Unset):
            completed_at = UNSET
        elif isinstance(self.completed_at, datetime.datetime):
            completed_at = self.completed_at.isoformat()
        else:
            completed_at = self.completed_at

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if id is not UNSET:
            field_dict["id"] = id
        if budget_file is not UNSET:
            field_dict["budget_file"] = budget_file
        if format_ is not UNSET:
            field_dict["format"] = format_
        if status is not UNSET:
            field_dict["status"] = status
        if filters is not UNSET:
            field_dict["filters"] = filters
        if file_name is not UNSET:
            field_dict["file_name"] = file_name
        if error_message is not UNSET:
            field_dict["error_message"] = error_message
        if created_at is not UNSET:
            field_dict["created_at"] = created_at
        if updated_at is not UNSET:
            field_dict["updated_at"] = updated_at
        if completed_at is not UNSET:
            field_dict["completed_at"] = completed_at

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        id = d.pop("id", UNSET)

        budget_file = d.pop("budget_file", UNSET)

        _format_ = d.pop("format", UNSET)
        format_: ExportJobFormatEnum | Unset
        if isinstance(_format_, Unset):
            format_ = UNSET
        else:
            format_ = ExportJobFormatEnum(_format_)

        _status = d.pop("status", UNSET)
        status: ExportJobStatusEnum | Unset
        if isinstance(_status, Unset):
            status = UNSET
        else:
            status = ExportJobStatusEnum(_status)

        filters = d.pop("filters", UNSET)

        file_name = d.pop("file_name", UNSET)

        error_message = d.pop("error_message", UNSET)

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

        def _parse_completed_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                completed_at_type_0 = datetime.datetime.fromisoformat(data)

                return completed_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        completed_at = _parse_completed_at(d.pop("completed_at", UNSET))

        patched_export_job = cls(
            id=id,
            budget_file=budget_file,
            format_=format_,
            status=status,
            filters=filters,
            file_name=file_name,
            error_message=error_message,
            created_at=created_at,
            updated_at=updated_at,
            completed_at=completed_at,
        )

        patched_export_job.additional_properties = d
        return patched_export_job

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

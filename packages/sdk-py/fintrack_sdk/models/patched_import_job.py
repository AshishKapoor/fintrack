from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..models.import_job_format_enum import ImportJobFormatEnum
from ..models.import_job_status_enum import ImportJobStatusEnum
from ..types import UNSET, Unset

T = TypeVar("T", bound="PatchedImportJob")


@_attrs_define
class PatchedImportJob:
    """
    Attributes:
        id (int | Unset):
        budget_file (int | Unset):
        format_ (ImportJobFormatEnum | Unset): * `csv` - CSV
            * `ofx` - OFX
            * `qfx` - QFX
            * `qif` - QIF
            * `camt053` - CAMT.053
            * `ynab4` - YNAB4
            * `nynab` - nYNAB
        status (ImportJobStatusEnum | Unset): * `uploaded` - Uploaded
            * `previewed` - Previewed
            * `importing` - Importing
            * `completed` - Completed
            * `failed` - Failed
        source_filename (str | Unset):
        source_payload (str | Unset):
        preview_summary (Any | Unset):
        mapping (Any | Unset):
        error_message (str | Unset):
        created_at (datetime.datetime | Unset):
        updated_at (datetime.datetime | Unset):
    """

    id: int | Unset = UNSET
    budget_file: int | Unset = UNSET
    format_: ImportJobFormatEnum | Unset = UNSET
    status: ImportJobStatusEnum | Unset = UNSET
    source_filename: str | Unset = UNSET
    source_payload: str | Unset = UNSET
    preview_summary: Any | Unset = UNSET
    mapping: Any | Unset = UNSET
    error_message: str | Unset = UNSET
    created_at: datetime.datetime | Unset = UNSET
    updated_at: datetime.datetime | Unset = UNSET
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

        source_filename = self.source_filename

        source_payload = self.source_payload

        preview_summary = self.preview_summary

        mapping = self.mapping

        error_message = self.error_message

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
        if format_ is not UNSET:
            field_dict["format"] = format_
        if status is not UNSET:
            field_dict["status"] = status
        if source_filename is not UNSET:
            field_dict["source_filename"] = source_filename
        if source_payload is not UNSET:
            field_dict["source_payload"] = source_payload
        if preview_summary is not UNSET:
            field_dict["preview_summary"] = preview_summary
        if mapping is not UNSET:
            field_dict["mapping"] = mapping
        if error_message is not UNSET:
            field_dict["error_message"] = error_message
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

        _format_ = d.pop("format", UNSET)
        format_: ImportJobFormatEnum | Unset
        if isinstance(_format_, Unset):
            format_ = UNSET
        else:
            format_ = ImportJobFormatEnum(_format_)

        _status = d.pop("status", UNSET)
        status: ImportJobStatusEnum | Unset
        if isinstance(_status, Unset):
            status = UNSET
        else:
            status = ImportJobStatusEnum(_status)

        source_filename = d.pop("source_filename", UNSET)

        source_payload = d.pop("source_payload", UNSET)

        preview_summary = d.pop("preview_summary", UNSET)

        mapping = d.pop("mapping", UNSET)

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

        patched_import_job = cls(
            id=id,
            budget_file=budget_file,
            format_=format_,
            status=status,
            source_filename=source_filename,
            source_payload=source_payload,
            preview_summary=preview_summary,
            mapping=mapping,
            error_message=error_message,
            created_at=created_at,
            updated_at=updated_at,
        )

        patched_import_job.additional_properties = d
        return patched_import_job

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

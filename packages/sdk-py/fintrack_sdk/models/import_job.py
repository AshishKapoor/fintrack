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

T = TypeVar("T", bound="ImportJob")


@_attrs_define
class ImportJob:
    """
    Attributes:
        id (int):
        budget_file (int):
        format_ (ImportJobFormatEnum): * `csv` - CSV
            * `ofx` - OFX
            * `qfx` - QFX
            * `qif` - QIF
            * `camt053` - CAMT.053
            * `ynab4` - YNAB4
            * `nynab` - nYNAB
        status (ImportJobStatusEnum): * `uploaded` - Uploaded
            * `previewed` - Previewed
            * `importing` - Importing
            * `completed` - Completed
            * `failed` - Failed
        preview_summary (Any):
        error_message (str):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        source_filename (str | Unset):
        source_payload (str | Unset):
        mapping (Any | Unset):
    """

    id: int
    budget_file: int
    format_: ImportJobFormatEnum
    status: ImportJobStatusEnum
    preview_summary: Any
    error_message: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    source_filename: str | Unset = UNSET
    source_payload: str | Unset = UNSET
    mapping: Any | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        budget_file = self.budget_file

        format_ = self.format_.value

        status = self.status.value

        preview_summary = self.preview_summary

        error_message = self.error_message

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        source_filename = self.source_filename

        source_payload = self.source_payload

        mapping = self.mapping

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "budget_file": budget_file,
                "format": format_,
                "status": status,
                "preview_summary": preview_summary,
                "error_message": error_message,
                "created_at": created_at,
                "updated_at": updated_at,
            }
        )
        if source_filename is not UNSET:
            field_dict["source_filename"] = source_filename
        if source_payload is not UNSET:
            field_dict["source_payload"] = source_payload
        if mapping is not UNSET:
            field_dict["mapping"] = mapping

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        id = d.pop("id")

        budget_file = d.pop("budget_file")

        format_ = ImportJobFormatEnum(d.pop("format"))

        status = ImportJobStatusEnum(d.pop("status"))

        preview_summary = d.pop("preview_summary")

        error_message = d.pop("error_message")

        created_at = datetime.datetime.fromisoformat(d.pop("created_at"))

        updated_at = datetime.datetime.fromisoformat(d.pop("updated_at"))

        source_filename = d.pop("source_filename", UNSET)

        source_payload = d.pop("source_payload", UNSET)

        mapping = d.pop("mapping", UNSET)

        import_job = cls(
            id=id,
            budget_file=budget_file,
            format_=format_,
            status=status,
            preview_summary=preview_summary,
            error_message=error_message,
            created_at=created_at,
            updated_at=updated_at,
            source_filename=source_filename,
            source_payload=source_payload,
            mapping=mapping,
        )

        import_job.additional_properties = d
        return import_job

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

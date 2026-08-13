from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..models.frequency_enum import FrequencyEnum
from ..types import UNSET, Unset

T = TypeVar("T", bound="PatchedScheduledTransaction")


@_attrs_define
class PatchedScheduledTransaction:
    """
    Attributes:
        id (int | Unset):
        budget_file (int | Unset):
        name (str | Unset):
        is_active (bool | Unset):
        start_date (datetime.date | Unset):
        next_run_date (datetime.date | Unset):
        frequency (FrequencyEnum | Unset): * `daily` - Daily
            * `weekly` - Weekly
            * `monthly` - Monthly
            * `yearly` - Yearly
            * `custom` - Custom
        interval (int | Unset):
        transaction_template (Any | Unset):
        last_run_at (datetime.datetime | None | Unset):
        created_at (datetime.datetime | Unset):
        updated_at (datetime.datetime | Unset):
    """

    id: int | Unset = UNSET
    budget_file: int | Unset = UNSET
    name: str | Unset = UNSET
    is_active: bool | Unset = UNSET
    start_date: datetime.date | Unset = UNSET
    next_run_date: datetime.date | Unset = UNSET
    frequency: FrequencyEnum | Unset = UNSET
    interval: int | Unset = UNSET
    transaction_template: Any | Unset = UNSET
    last_run_at: datetime.datetime | None | Unset = UNSET
    created_at: datetime.datetime | Unset = UNSET
    updated_at: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        budget_file = self.budget_file

        name = self.name

        is_active = self.is_active

        start_date: str | Unset = UNSET
        if not isinstance(self.start_date, Unset):
            start_date = self.start_date.isoformat()

        next_run_date: str | Unset = UNSET
        if not isinstance(self.next_run_date, Unset):
            next_run_date = self.next_run_date.isoformat()

        frequency: str | Unset = UNSET
        if not isinstance(self.frequency, Unset):
            frequency = self.frequency.value

        interval = self.interval

        transaction_template = self.transaction_template

        last_run_at: None | str | Unset
        if isinstance(self.last_run_at, Unset):
            last_run_at = UNSET
        elif isinstance(self.last_run_at, datetime.datetime):
            last_run_at = self.last_run_at.isoformat()
        else:
            last_run_at = self.last_run_at

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
        if is_active is not UNSET:
            field_dict["is_active"] = is_active
        if start_date is not UNSET:
            field_dict["start_date"] = start_date
        if next_run_date is not UNSET:
            field_dict["next_run_date"] = next_run_date
        if frequency is not UNSET:
            field_dict["frequency"] = frequency
        if interval is not UNSET:
            field_dict["interval"] = interval
        if transaction_template is not UNSET:
            field_dict["transaction_template"] = transaction_template
        if last_run_at is not UNSET:
            field_dict["last_run_at"] = last_run_at
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

        is_active = d.pop("is_active", UNSET)

        _start_date = d.pop("start_date", UNSET)
        start_date: datetime.date | Unset
        if isinstance(_start_date, Unset):
            start_date = UNSET
        else:
            start_date = datetime.date.fromisoformat(_start_date)

        _next_run_date = d.pop("next_run_date", UNSET)
        next_run_date: datetime.date | Unset
        if isinstance(_next_run_date, Unset):
            next_run_date = UNSET
        else:
            next_run_date = datetime.date.fromisoformat(_next_run_date)

        _frequency = d.pop("frequency", UNSET)
        frequency: FrequencyEnum | Unset
        if isinstance(_frequency, Unset):
            frequency = UNSET
        else:
            frequency = FrequencyEnum(_frequency)

        interval = d.pop("interval", UNSET)

        transaction_template = d.pop("transaction_template", UNSET)

        def _parse_last_run_at(data: object) -> datetime.datetime | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                last_run_at_type_0 = datetime.datetime.fromisoformat(data)

                return last_run_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None | Unset, data)

        last_run_at = _parse_last_run_at(d.pop("last_run_at", UNSET))

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

        patched_scheduled_transaction = cls(
            id=id,
            budget_file=budget_file,
            name=name,
            is_active=is_active,
            start_date=start_date,
            next_run_date=next_run_date,
            frequency=frequency,
            interval=interval,
            transaction_template=transaction_template,
            last_run_at=last_run_at,
            created_at=created_at,
            updated_at=updated_at,
        )

        patched_scheduled_transaction.additional_properties = d
        return patched_scheduled_transaction

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

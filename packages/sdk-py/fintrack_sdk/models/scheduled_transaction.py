from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..models.frequency_enum import FrequencyEnum
from ..types import UNSET, Unset

T = TypeVar("T", bound="ScheduledTransaction")


@_attrs_define
class ScheduledTransaction:
    """
    Attributes:
        id (int):
        budget_file (int):
        name (str):
        start_date (datetime.date):
        next_run_date (datetime.date):
        last_run_at (datetime.datetime | None):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        is_active (bool | Unset):
        frequency (FrequencyEnum | Unset): * `daily` - Daily
            * `weekly` - Weekly
            * `monthly` - Monthly
            * `yearly` - Yearly
            * `custom` - Custom
        interval (int | Unset):
        transaction_template (Any | Unset):
    """

    id: int
    budget_file: int
    name: str
    start_date: datetime.date
    next_run_date: datetime.date
    last_run_at: datetime.datetime | None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    is_active: bool | Unset = UNSET
    frequency: FrequencyEnum | Unset = UNSET
    interval: int | Unset = UNSET
    transaction_template: Any | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        budget_file = self.budget_file

        name = self.name

        start_date = self.start_date.isoformat()

        next_run_date = self.next_run_date.isoformat()

        last_run_at: None | str
        if isinstance(self.last_run_at, datetime.datetime):
            last_run_at = self.last_run_at.isoformat()
        else:
            last_run_at = self.last_run_at

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        is_active = self.is_active

        frequency: str | Unset = UNSET
        if not isinstance(self.frequency, Unset):
            frequency = self.frequency.value

        interval = self.interval

        transaction_template = self.transaction_template

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "budget_file": budget_file,
                "name": name,
                "start_date": start_date,
                "next_run_date": next_run_date,
                "last_run_at": last_run_at,
                "created_at": created_at,
                "updated_at": updated_at,
            }
        )
        if is_active is not UNSET:
            field_dict["is_active"] = is_active
        if frequency is not UNSET:
            field_dict["frequency"] = frequency
        if interval is not UNSET:
            field_dict["interval"] = interval
        if transaction_template is not UNSET:
            field_dict["transaction_template"] = transaction_template

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        id = d.pop("id")

        budget_file = d.pop("budget_file")

        name = d.pop("name")

        start_date = datetime.date.fromisoformat(d.pop("start_date"))

        next_run_date = datetime.date.fromisoformat(d.pop("next_run_date"))

        def _parse_last_run_at(data: object) -> datetime.datetime | None:
            if data is None:
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                last_run_at_type_0 = datetime.datetime.fromisoformat(data)

                return last_run_at_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.datetime | None, data)

        last_run_at = _parse_last_run_at(d.pop("last_run_at"))

        created_at = datetime.datetime.fromisoformat(d.pop("created_at"))

        updated_at = datetime.datetime.fromisoformat(d.pop("updated_at"))

        is_active = d.pop("is_active", UNSET)

        _frequency = d.pop("frequency", UNSET)
        frequency: FrequencyEnum | Unset
        if isinstance(_frequency, Unset):
            frequency = UNSET
        else:
            frequency = FrequencyEnum(_frequency)

        interval = d.pop("interval", UNSET)

        transaction_template = d.pop("transaction_template", UNSET)

        scheduled_transaction = cls(
            id=id,
            budget_file=budget_file,
            name=name,
            start_date=start_date,
            next_run_date=next_run_date,
            last_run_at=last_run_at,
            created_at=created_at,
            updated_at=updated_at,
            is_active=is_active,
            frequency=frequency,
            interval=interval,
            transaction_template=transaction_template,
        )

        scheduled_transaction.additional_properties = d
        return scheduled_transaction

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

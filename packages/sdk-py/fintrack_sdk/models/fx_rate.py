from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

T = TypeVar("T", bound="FxRate")


@_attrs_define
class FxRate:
    """
    Attributes:
        id (int):
        rate_date (datetime.date):
        currency_code (str):
        rate (str):
    """

    id: int
    rate_date: datetime.date
    currency_code: str
    rate: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        rate_date = self.rate_date.isoformat()

        currency_code = self.currency_code

        rate = self.rate

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "rate_date": rate_date,
                "currency_code": currency_code,
                "rate": rate,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        id = d.pop("id")

        rate_date = datetime.date.fromisoformat(d.pop("rate_date"))

        currency_code = d.pop("currency_code")

        rate = d.pop("rate")

        fx_rate = cls(
            id=id,
            rate_date=rate_date,
            currency_code=currency_code,
            rate=rate,
        )

        fx_rate.additional_properties = d
        return fx_rate

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

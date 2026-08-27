from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..models.type_enum import TypeEnum
from ..types import UNSET, Unset

T = TypeVar("T", bound="Account")


@_attrs_define
class Account:
    """
    Attributes:
        id (int):
        budget_file (int):
        name (str):
        current_balance (str):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        type_ (TypeEnum | Unset): * `checking` - Checking
            * `savings` - Savings
            * `cash` - Cash
            * `credit` - Credit Card
            * `asset` - Asset
            * `liability` - Liability
        opening_balance (str | Unset):
        currency_code (str | Unset):
        interest_rate (None | str | Unset): Annual percentage rate, e.g. 19.99 for 19.99% APR.
        minimum_payment (None | str | Unset):
        is_archived (bool | Unset):
    """

    id: int
    budget_file: int
    name: str
    current_balance: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    type_: TypeEnum | Unset = UNSET
    opening_balance: str | Unset = UNSET
    currency_code: str | Unset = UNSET
    interest_rate: None | str | Unset = UNSET
    minimum_payment: None | str | Unset = UNSET
    is_archived: bool | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        budget_file = self.budget_file

        name = self.name

        current_balance = self.current_balance

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        type_: str | Unset = UNSET
        if not isinstance(self.type_, Unset):
            type_ = self.type_.value

        opening_balance = self.opening_balance

        currency_code = self.currency_code

        interest_rate: None | str | Unset
        if isinstance(self.interest_rate, Unset):
            interest_rate = UNSET
        else:
            interest_rate = self.interest_rate

        minimum_payment: None | str | Unset
        if isinstance(self.minimum_payment, Unset):
            minimum_payment = UNSET
        else:
            minimum_payment = self.minimum_payment

        is_archived = self.is_archived

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "budget_file": budget_file,
                "name": name,
                "current_balance": current_balance,
                "created_at": created_at,
                "updated_at": updated_at,
            }
        )
        if type_ is not UNSET:
            field_dict["type"] = type_
        if opening_balance is not UNSET:
            field_dict["opening_balance"] = opening_balance
        if currency_code is not UNSET:
            field_dict["currency_code"] = currency_code
        if interest_rate is not UNSET:
            field_dict["interest_rate"] = interest_rate
        if minimum_payment is not UNSET:
            field_dict["minimum_payment"] = minimum_payment
        if is_archived is not UNSET:
            field_dict["is_archived"] = is_archived

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        id = d.pop("id")

        budget_file = d.pop("budget_file")

        name = d.pop("name")

        current_balance = d.pop("current_balance")

        created_at = datetime.datetime.fromisoformat(d.pop("created_at"))

        updated_at = datetime.datetime.fromisoformat(d.pop("updated_at"))

        _type_ = d.pop("type", UNSET)
        type_: TypeEnum | Unset
        if isinstance(_type_, Unset):
            type_ = UNSET
        else:
            type_ = TypeEnum(_type_)

        opening_balance = d.pop("opening_balance", UNSET)

        currency_code = d.pop("currency_code", UNSET)

        def _parse_interest_rate(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        interest_rate = _parse_interest_rate(d.pop("interest_rate", UNSET))

        def _parse_minimum_payment(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        minimum_payment = _parse_minimum_payment(d.pop("minimum_payment", UNSET))

        is_archived = d.pop("is_archived", UNSET)

        account = cls(
            id=id,
            budget_file=budget_file,
            name=name,
            current_balance=current_balance,
            created_at=created_at,
            updated_at=updated_at,
            type_=type_,
            opening_balance=opening_balance,
            currency_code=currency_code,
            interest_rate=interest_rate,
            minimum_payment=minimum_payment,
            is_archived=is_archived,
        )

        account.additional_properties = d
        return account

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

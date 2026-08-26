from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..models.type_005_enum import Type005Enum
from ..types import UNSET, Unset

T = TypeVar("T", bound="Transaction")


@_attrs_define
class Transaction:
    """
    Attributes:
        id (int):
        user (int):
        title (str):
        amount (str):
        type_ (Type005Enum): * `income` - Income
            * `expense` - Expense
        transaction_date (datetime.date):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        category (int | None | Unset):
    """

    id: int
    user: int
    title: str
    amount: str
    type_: Type005Enum
    transaction_date: datetime.date
    created_at: datetime.datetime
    updated_at: datetime.datetime
    category: int | None | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        user = self.user

        title = self.title

        amount = self.amount

        type_ = self.type_.value

        transaction_date = self.transaction_date.isoformat()

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        category: int | None | Unset
        if isinstance(self.category, Unset):
            category = UNSET
        else:
            category = self.category

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "user": user,
                "title": title,
                "amount": amount,
                "type": type_,
                "transaction_date": transaction_date,
                "created_at": created_at,
                "updated_at": updated_at,
            }
        )
        if category is not UNSET:
            field_dict["category"] = category

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        id = d.pop("id")

        user = d.pop("user")

        title = d.pop("title")

        amount = d.pop("amount")

        type_ = Type005Enum(d.pop("type"))

        transaction_date = datetime.date.fromisoformat(d.pop("transaction_date"))

        created_at = datetime.datetime.fromisoformat(d.pop("created_at"))

        updated_at = datetime.datetime.fromisoformat(d.pop("updated_at"))

        def _parse_category(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        category = _parse_category(d.pop("category", UNSET))

        transaction = cls(
            id=id,
            user=user,
            title=title,
            amount=amount,
            type_=type_,
            transaction_date=transaction_date,
            created_at=created_at,
            updated_at=updated_at,
            category=category,
        )

        transaction.additional_properties = d
        return transaction

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

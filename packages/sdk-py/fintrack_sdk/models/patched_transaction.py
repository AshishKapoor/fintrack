from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..models.type_005_enum import Type005Enum
from ..types import UNSET, Unset

T = TypeVar("T", bound="PatchedTransaction")


@_attrs_define
class PatchedTransaction:
    """
    Attributes:
        id (int | Unset):
        user (int | Unset):
        title (str | Unset):
        amount (str | Unset):
        type_ (Type005Enum | Unset): * `income` - Income
            * `expense` - Expense
        category (int | None | Unset):
        transaction_date (datetime.date | Unset):
        created_at (datetime.datetime | Unset):
        updated_at (datetime.datetime | Unset):
    """

    id: int | Unset = UNSET
    user: int | Unset = UNSET
    title: str | Unset = UNSET
    amount: str | Unset = UNSET
    type_: Type005Enum | Unset = UNSET
    category: int | None | Unset = UNSET
    transaction_date: datetime.date | Unset = UNSET
    created_at: datetime.datetime | Unset = UNSET
    updated_at: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        user = self.user

        title = self.title

        amount = self.amount

        type_: str | Unset = UNSET
        if not isinstance(self.type_, Unset):
            type_ = self.type_.value

        category: int | None | Unset
        if isinstance(self.category, Unset):
            category = UNSET
        else:
            category = self.category

        transaction_date: str | Unset = UNSET
        if not isinstance(self.transaction_date, Unset):
            transaction_date = self.transaction_date.isoformat()

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
        if user is not UNSET:
            field_dict["user"] = user
        if title is not UNSET:
            field_dict["title"] = title
        if amount is not UNSET:
            field_dict["amount"] = amount
        if type_ is not UNSET:
            field_dict["type"] = type_
        if category is not UNSET:
            field_dict["category"] = category
        if transaction_date is not UNSET:
            field_dict["transaction_date"] = transaction_date
        if created_at is not UNSET:
            field_dict["created_at"] = created_at
        if updated_at is not UNSET:
            field_dict["updated_at"] = updated_at

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        id = d.pop("id", UNSET)

        user = d.pop("user", UNSET)

        title = d.pop("title", UNSET)

        amount = d.pop("amount", UNSET)

        _type_ = d.pop("type", UNSET)
        type_: Type005Enum | Unset
        if isinstance(_type_, Unset):
            type_ = UNSET
        else:
            type_ = Type005Enum(_type_)

        def _parse_category(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        category = _parse_category(d.pop("category", UNSET))

        _transaction_date = d.pop("transaction_date", UNSET)
        transaction_date: datetime.date | Unset
        if isinstance(_transaction_date, Unset):
            transaction_date = UNSET
        else:
            transaction_date = datetime.date.fromisoformat(_transaction_date)

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

        patched_transaction = cls(
            id=id,
            user=user,
            title=title,
            amount=amount,
            type_=type_,
            category=category,
            transaction_date=transaction_date,
            created_at=created_at,
            updated_at=updated_at,
        )

        patched_transaction.additional_properties = d
        return patched_transaction

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

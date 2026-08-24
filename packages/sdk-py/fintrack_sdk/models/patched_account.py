from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..models.account_type_enum import AccountTypeEnum
from ..types import UNSET, Unset

T = TypeVar("T", bound="PatchedAccount")


@_attrs_define
class PatchedAccount:
    """
    Attributes:
        id (int | Unset):
        budget_file (int | Unset):
        name (str | Unset):
        type_ (AccountTypeEnum | Unset): * `checking` - Checking
            * `savings` - Savings
            * `cash` - Cash
            * `credit` - Credit Card
            * `asset` - Asset
            * `liability` - Liability
        opening_balance (str | Unset):
        currency_code (str | Unset):
        current_balance (str | Unset):
        is_archived (bool | Unset):
        created_at (datetime.datetime | Unset):
        updated_at (datetime.datetime | Unset):
    """

    id: int | Unset = UNSET
    budget_file: int | Unset = UNSET
    name: str | Unset = UNSET
    type_: AccountTypeEnum | Unset = UNSET
    opening_balance: str | Unset = UNSET
    currency_code: str | Unset = UNSET
    current_balance: str | Unset = UNSET
    is_archived: bool | Unset = UNSET
    created_at: datetime.datetime | Unset = UNSET
    updated_at: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        budget_file = self.budget_file

        name = self.name

        type_: str | Unset = UNSET
        if not isinstance(self.type_, Unset):
            type_ = self.type_.value

        opening_balance = self.opening_balance

        currency_code = self.currency_code

        current_balance = self.current_balance

        is_archived = self.is_archived

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
        if type_ is not UNSET:
            field_dict["type"] = type_
        if opening_balance is not UNSET:
            field_dict["opening_balance"] = opening_balance
        if currency_code is not UNSET:
            field_dict["currency_code"] = currency_code
        if current_balance is not UNSET:
            field_dict["current_balance"] = current_balance
        if is_archived is not UNSET:
            field_dict["is_archived"] = is_archived
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

        _type_ = d.pop("type", UNSET)
        type_: AccountTypeEnum | Unset
        if isinstance(_type_, Unset):
            type_ = UNSET
        else:
            type_ = AccountTypeEnum(_type_)

        opening_balance = d.pop("opening_balance", UNSET)

        currency_code = d.pop("currency_code", UNSET)

        current_balance = d.pop("current_balance", UNSET)

        is_archived = d.pop("is_archived", UNSET)

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

        patched_account = cls(
            id=id,
            budget_file=budget_file,
            name=name,
            type_=type_,
            opening_balance=opening_balance,
            currency_code=currency_code,
            current_balance=current_balance,
            is_archived=is_archived,
            created_at=created_at,
            updated_at=updated_at,
        )

        patched_account.additional_properties = d
        return patched_account

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

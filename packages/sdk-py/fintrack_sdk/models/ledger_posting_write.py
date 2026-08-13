from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..types import UNSET, Unset

T = TypeVar("T", bound="LedgerPostingWrite")


@_attrs_define
class LedgerPostingWrite:
    """
    Attributes:
        id (int):
        amount (str):
        account (int | None | Unset):
        category (int | None | Unset):
        memo (str | Unset):
        sort_order (int | Unset):
    """

    id: int
    amount: str
    account: int | None | Unset = UNSET
    category: int | None | Unset = UNSET
    memo: str | Unset = UNSET
    sort_order: int | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        amount = self.amount

        account: int | None | Unset
        if isinstance(self.account, Unset):
            account = UNSET
        else:
            account = self.account

        category: int | None | Unset
        if isinstance(self.category, Unset):
            category = UNSET
        else:
            category = self.category

        memo = self.memo

        sort_order = self.sort_order

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "amount": amount,
            }
        )
        if account is not UNSET:
            field_dict["account"] = account
        if category is not UNSET:
            field_dict["category"] = category
        if memo is not UNSET:
            field_dict["memo"] = memo
        if sort_order is not UNSET:
            field_dict["sort_order"] = sort_order

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        id = d.pop("id")

        amount = d.pop("amount")

        def _parse_account(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        account = _parse_account(d.pop("account", UNSET))

        def _parse_category(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        category = _parse_category(d.pop("category", UNSET))

        memo = d.pop("memo", UNSET)

        sort_order = d.pop("sort_order", UNSET)

        ledger_posting_write = cls(
            id=id,
            amount=amount,
            account=account,
            category=category,
            memo=memo,
            sort_order=sort_order,
        )

        ledger_posting_write.additional_properties = d
        return ledger_posting_write

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

from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..types import UNSET, Unset

T = TypeVar("T", bound="SavingsGoal")


@_attrs_define
class SavingsGoal:
    """
    Attributes:
        id (int):
        budget_file (int):
        account (int):
        account_name (str):
        name (str):
        target_amount (str):
        current_amount (str):
        progress_percent (str):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        target_date (datetime.date | None | Unset):
        is_archived (bool | Unset):
    """

    id: int
    budget_file: int
    account: int
    account_name: str
    name: str
    target_amount: str
    current_amount: str
    progress_percent: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    target_date: datetime.date | None | Unset = UNSET
    is_archived: bool | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        budget_file = self.budget_file

        account = self.account

        account_name = self.account_name

        name = self.name

        target_amount = self.target_amount

        current_amount = self.current_amount

        progress_percent = self.progress_percent

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        target_date: None | str | Unset
        if isinstance(self.target_date, Unset):
            target_date = UNSET
        elif isinstance(self.target_date, datetime.date):
            target_date = self.target_date.isoformat()
        else:
            target_date = self.target_date

        is_archived = self.is_archived

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "budget_file": budget_file,
                "account": account,
                "account_name": account_name,
                "name": name,
                "target_amount": target_amount,
                "current_amount": current_amount,
                "progress_percent": progress_percent,
                "created_at": created_at,
                "updated_at": updated_at,
            }
        )
        if target_date is not UNSET:
            field_dict["target_date"] = target_date
        if is_archived is not UNSET:
            field_dict["is_archived"] = is_archived

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        id = d.pop("id")

        budget_file = d.pop("budget_file")

        account = d.pop("account")

        account_name = d.pop("account_name")

        name = d.pop("name")

        target_amount = d.pop("target_amount")

        current_amount = d.pop("current_amount")

        progress_percent = d.pop("progress_percent")

        created_at = datetime.datetime.fromisoformat(d.pop("created_at"))

        updated_at = datetime.datetime.fromisoformat(d.pop("updated_at"))

        def _parse_target_date(data: object) -> datetime.date | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                target_date_type_0 = datetime.date.fromisoformat(data)

                return target_date_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None | Unset, data)

        target_date = _parse_target_date(d.pop("target_date", UNSET))

        is_archived = d.pop("is_archived", UNSET)

        savings_goal = cls(
            id=id,
            budget_file=budget_file,
            account=account,
            account_name=account_name,
            name=name,
            target_amount=target_amount,
            current_amount=current_amount,
            progress_percent=progress_percent,
            created_at=created_at,
            updated_at=updated_at,
            target_date=target_date,
            is_archived=is_archived,
        )

        savings_goal.additional_properties = d
        return savings_goal

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

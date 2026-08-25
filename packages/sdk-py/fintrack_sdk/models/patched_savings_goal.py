from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..types import UNSET, Unset

T = TypeVar("T", bound="PatchedSavingsGoal")


@_attrs_define
class PatchedSavingsGoal:
    """
    Attributes:
        id (int | Unset):
        budget_file (int | Unset):
        account (int | Unset):
        account_name (str | Unset):
        name (str | Unset):
        target_amount (str | Unset):
        target_date (datetime.date | None | Unset):
        current_amount (str | Unset):
        progress_percent (str | Unset):
        is_archived (bool | Unset):
        created_at (datetime.datetime | Unset):
        updated_at (datetime.datetime | Unset):
    """

    id: int | Unset = UNSET
    budget_file: int | Unset = UNSET
    account: int | Unset = UNSET
    account_name: str | Unset = UNSET
    name: str | Unset = UNSET
    target_amount: str | Unset = UNSET
    target_date: datetime.date | None | Unset = UNSET
    current_amount: str | Unset = UNSET
    progress_percent: str | Unset = UNSET
    is_archived: bool | Unset = UNSET
    created_at: datetime.datetime | Unset = UNSET
    updated_at: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        budget_file = self.budget_file

        account = self.account

        account_name = self.account_name

        name = self.name

        target_amount = self.target_amount

        target_date: None | str | Unset
        if isinstance(self.target_date, Unset):
            target_date = UNSET
        elif isinstance(self.target_date, datetime.date):
            target_date = self.target_date.isoformat()
        else:
            target_date = self.target_date

        current_amount = self.current_amount

        progress_percent = self.progress_percent

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
        if account is not UNSET:
            field_dict["account"] = account
        if account_name is not UNSET:
            field_dict["account_name"] = account_name
        if name is not UNSET:
            field_dict["name"] = name
        if target_amount is not UNSET:
            field_dict["target_amount"] = target_amount
        if target_date is not UNSET:
            field_dict["target_date"] = target_date
        if current_amount is not UNSET:
            field_dict["current_amount"] = current_amount
        if progress_percent is not UNSET:
            field_dict["progress_percent"] = progress_percent
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

        account = d.pop("account", UNSET)

        account_name = d.pop("account_name", UNSET)

        name = d.pop("name", UNSET)

        target_amount = d.pop("target_amount", UNSET)

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

        current_amount = d.pop("current_amount", UNSET)

        progress_percent = d.pop("progress_percent", UNSET)

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

        patched_savings_goal = cls(
            id=id,
            budget_file=budget_file,
            account=account,
            account_name=account_name,
            name=name,
            target_amount=target_amount,
            target_date=target_date,
            current_amount=current_amount,
            progress_percent=progress_percent,
            is_archived=is_archived,
            created_at=created_at,
            updated_at=updated_at,
        )

        patched_savings_goal.additional_properties = d
        return patched_savings_goal

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

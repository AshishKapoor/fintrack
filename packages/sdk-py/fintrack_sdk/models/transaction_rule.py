from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..types import UNSET, Unset

T = TypeVar("T", bound="TransactionRule")


@_attrs_define
class TransactionRule:
    """
    Attributes:
        id (int):
        budget_file (int):
        name (str):
        created_at (datetime.datetime):
        updated_at (datetime.datetime):
        is_active (bool | Unset):
        priority (int | Unset):
        conditions (Any | Unset):
        actions (Any | Unset):
    """

    id: int
    budget_file: int
    name: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    is_active: bool | Unset = UNSET
    priority: int | Unset = UNSET
    conditions: Any | Unset = UNSET
    actions: Any | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        budget_file = self.budget_file

        name = self.name

        created_at = self.created_at.isoformat()

        updated_at = self.updated_at.isoformat()

        is_active = self.is_active

        priority = self.priority

        conditions = self.conditions

        actions = self.actions

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "budget_file": budget_file,
                "name": name,
                "created_at": created_at,
                "updated_at": updated_at,
            }
        )
        if is_active is not UNSET:
            field_dict["is_active"] = is_active
        if priority is not UNSET:
            field_dict["priority"] = priority
        if conditions is not UNSET:
            field_dict["conditions"] = conditions
        if actions is not UNSET:
            field_dict["actions"] = actions

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        id = d.pop("id")

        budget_file = d.pop("budget_file")

        name = d.pop("name")

        created_at = datetime.datetime.fromisoformat(d.pop("created_at"))

        updated_at = datetime.datetime.fromisoformat(d.pop("updated_at"))

        is_active = d.pop("is_active", UNSET)

        priority = d.pop("priority", UNSET)

        conditions = d.pop("conditions", UNSET)

        actions = d.pop("actions", UNSET)

        transaction_rule = cls(
            id=id,
            budget_file=budget_file,
            name=name,
            created_at=created_at,
            updated_at=updated_at,
            is_active=is_active,
            priority=priority,
            conditions=conditions,
            actions=actions,
        )

        transaction_rule.additional_properties = d
        return transaction_rule

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

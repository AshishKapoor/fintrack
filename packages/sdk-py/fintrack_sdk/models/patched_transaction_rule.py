from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..types import UNSET, Unset

T = TypeVar("T", bound="PatchedTransactionRule")


@_attrs_define
class PatchedTransactionRule:
    """
    Attributes:
        id (int | Unset):
        budget_file (int | Unset):
        name (str | Unset):
        is_active (bool | Unset):
        priority (int | Unset):
        conditions (Any | Unset):
        actions (Any | Unset):
        created_at (datetime.datetime | Unset):
        updated_at (datetime.datetime | Unset):
    """

    id: int | Unset = UNSET
    budget_file: int | Unset = UNSET
    name: str | Unset = UNSET
    is_active: bool | Unset = UNSET
    priority: int | Unset = UNSET
    conditions: Any | Unset = UNSET
    actions: Any | Unset = UNSET
    created_at: datetime.datetime | Unset = UNSET
    updated_at: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        budget_file = self.budget_file

        name = self.name

        is_active = self.is_active

        priority = self.priority

        conditions = self.conditions

        actions = self.actions

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
        if is_active is not UNSET:
            field_dict["is_active"] = is_active
        if priority is not UNSET:
            field_dict["priority"] = priority
        if conditions is not UNSET:
            field_dict["conditions"] = conditions
        if actions is not UNSET:
            field_dict["actions"] = actions
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

        is_active = d.pop("is_active", UNSET)

        priority = d.pop("priority", UNSET)

        conditions = d.pop("conditions", UNSET)

        actions = d.pop("actions", UNSET)

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

        patched_transaction_rule = cls(
            id=id,
            budget_file=budget_file,
            name=name,
            is_active=is_active,
            priority=priority,
            conditions=conditions,
            actions=actions,
            created_at=created_at,
            updated_at=updated_at,
        )

        patched_transaction_rule.additional_properties = d
        return patched_transaction_rule

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

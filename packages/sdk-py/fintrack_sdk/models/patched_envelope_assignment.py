from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar, cast

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..models.goal_type_enum import GoalTypeEnum
from ..types import UNSET, Unset

T = TypeVar("T", bound="PatchedEnvelopeAssignment")


@_attrs_define
class PatchedEnvelopeAssignment:
    """
    Attributes:
        id (int | Unset):
        budget_month (int | Unset):
        category (int | Unset):
        assigned_amount (str | Unset):
        carryover_amount (str | Unset):
        goal_type (GoalTypeEnum | Unset): * `none` - None
            * `target_balance` - Target Balance
            * `monthly_contribution` - Monthly Contribution
            * `percent_income` - Percent Income
            * `remainder` - Remainder
            * `by_date` - By Date
            * `by_schedule` - By Schedule
        goal_value (None | str | Unset):
        goal_date (datetime.date | None | Unset):
        goal_schedule (str | Unset):
        priority (int | Unset):
        notes_md (str | Unset):
        created_at (datetime.datetime | Unset):
        updated_at (datetime.datetime | Unset):
    """

    id: int | Unset = UNSET
    budget_month: int | Unset = UNSET
    category: int | Unset = UNSET
    assigned_amount: str | Unset = UNSET
    carryover_amount: str | Unset = UNSET
    goal_type: GoalTypeEnum | Unset = UNSET
    goal_value: None | str | Unset = UNSET
    goal_date: datetime.date | None | Unset = UNSET
    goal_schedule: str | Unset = UNSET
    priority: int | Unset = UNSET
    notes_md: str | Unset = UNSET
    created_at: datetime.datetime | Unset = UNSET
    updated_at: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        budget_month = self.budget_month

        category = self.category

        assigned_amount = self.assigned_amount

        carryover_amount = self.carryover_amount

        goal_type: str | Unset = UNSET
        if not isinstance(self.goal_type, Unset):
            goal_type = self.goal_type.value

        goal_value: None | str | Unset
        if isinstance(self.goal_value, Unset):
            goal_value = UNSET
        else:
            goal_value = self.goal_value

        goal_date: None | str | Unset
        if isinstance(self.goal_date, Unset):
            goal_date = UNSET
        elif isinstance(self.goal_date, datetime.date):
            goal_date = self.goal_date.isoformat()
        else:
            goal_date = self.goal_date

        goal_schedule = self.goal_schedule

        priority = self.priority

        notes_md = self.notes_md

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
        if budget_month is not UNSET:
            field_dict["budget_month"] = budget_month
        if category is not UNSET:
            field_dict["category"] = category
        if assigned_amount is not UNSET:
            field_dict["assigned_amount"] = assigned_amount
        if carryover_amount is not UNSET:
            field_dict["carryover_amount"] = carryover_amount
        if goal_type is not UNSET:
            field_dict["goal_type"] = goal_type
        if goal_value is not UNSET:
            field_dict["goal_value"] = goal_value
        if goal_date is not UNSET:
            field_dict["goal_date"] = goal_date
        if goal_schedule is not UNSET:
            field_dict["goal_schedule"] = goal_schedule
        if priority is not UNSET:
            field_dict["priority"] = priority
        if notes_md is not UNSET:
            field_dict["notes_md"] = notes_md
        if created_at is not UNSET:
            field_dict["created_at"] = created_at
        if updated_at is not UNSET:
            field_dict["updated_at"] = updated_at

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        id = d.pop("id", UNSET)

        budget_month = d.pop("budget_month", UNSET)

        category = d.pop("category", UNSET)

        assigned_amount = d.pop("assigned_amount", UNSET)

        carryover_amount = d.pop("carryover_amount", UNSET)

        _goal_type = d.pop("goal_type", UNSET)
        goal_type: GoalTypeEnum | Unset
        if isinstance(_goal_type, Unset):
            goal_type = UNSET
        else:
            goal_type = GoalTypeEnum(_goal_type)

        def _parse_goal_value(data: object) -> None | str | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(None | str | Unset, data)

        goal_value = _parse_goal_value(d.pop("goal_value", UNSET))

        def _parse_goal_date(data: object) -> datetime.date | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                goal_date_type_0 = datetime.date.fromisoformat(data)

                return goal_date_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(datetime.date | None | Unset, data)

        goal_date = _parse_goal_date(d.pop("goal_date", UNSET))

        goal_schedule = d.pop("goal_schedule", UNSET)

        priority = d.pop("priority", UNSET)

        notes_md = d.pop("notes_md", UNSET)

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

        patched_envelope_assignment = cls(
            id=id,
            budget_month=budget_month,
            category=category,
            assigned_amount=assigned_amount,
            carryover_amount=carryover_amount,
            goal_type=goal_type,
            goal_value=goal_value,
            goal_date=goal_date,
            goal_schedule=goal_schedule,
            priority=priority,
            notes_md=notes_md,
            created_at=created_at,
            updated_at=updated_at,
        )

        patched_envelope_assignment.additional_properties = d
        return patched_envelope_assignment

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

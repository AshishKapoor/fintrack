from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..models.department_enum import DepartmentEnum
from ..models.role_enum import RoleEnum
from ..types import UNSET, Unset

T = TypeVar("T", bound="UserProfile")


@_attrs_define
class UserProfile:
    """
    Attributes:
        id (int):
        email (str):
        role (RoleEnum): * `admin` - Admin
            * `manager` - Manager
            * `employee` - Employee
        first_name (str | Unset):
        last_name (str | Unset):
        phone_number (str | Unset):
        location (str | Unset):
        bio (str | Unset):
        department (DepartmentEnum | Unset): * `engineering` - Engineering
            * `finance` - Finance
            * `hr` - HR
            * `marketing` - Marketing
            * `sales` - Sales
            * `other` - Other
    """

    id: int
    email: str
    role: RoleEnum
    first_name: str | Unset = UNSET
    last_name: str | Unset = UNSET
    phone_number: str | Unset = UNSET
    location: str | Unset = UNSET
    bio: str | Unset = UNSET
    department: DepartmentEnum | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        email = self.email

        role = self.role.value

        first_name = self.first_name

        last_name = self.last_name

        phone_number = self.phone_number

        location = self.location

        bio = self.bio

        department: str | Unset = UNSET
        if not isinstance(self.department, Unset):
            department = self.department.value

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "email": email,
                "role": role,
            }
        )
        if first_name is not UNSET:
            field_dict["first_name"] = first_name
        if last_name is not UNSET:
            field_dict["last_name"] = last_name
        if phone_number is not UNSET:
            field_dict["phone_number"] = phone_number
        if location is not UNSET:
            field_dict["location"] = location
        if bio is not UNSET:
            field_dict["bio"] = bio
        if department is not UNSET:
            field_dict["department"] = department

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        id = d.pop("id")

        email = d.pop("email")

        role = RoleEnum(d.pop("role"))

        first_name = d.pop("first_name", UNSET)

        last_name = d.pop("last_name", UNSET)

        phone_number = d.pop("phone_number", UNSET)

        location = d.pop("location", UNSET)

        bio = d.pop("bio", UNSET)

        _department = d.pop("department", UNSET)
        department: DepartmentEnum | Unset
        if isinstance(_department, Unset):
            department = UNSET
        else:
            department = DepartmentEnum(_department)

        user_profile = cls(
            id=id,
            email=email,
            role=role,
            first_name=first_name,
            last_name=last_name,
            phone_number=phone_number,
            location=location,
            bio=bio,
            department=department,
        )

        user_profile.additional_properties = d
        return user_profile

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

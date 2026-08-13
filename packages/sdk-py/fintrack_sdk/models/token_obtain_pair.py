from __future__ import annotations

from collections.abc import Mapping
from typing import Any, TypeVar

from ..types import UNSET
from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

T = TypeVar("T", bound="TokenObtainPair")


@_attrs_define
class TokenObtainPair:
    """
    Attributes:
        email (str):
        password (str):
        access (str):
        refresh (str):
    """

    email: str
    password: str
    access: str
    refresh: str
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        email = self.email

        password = self.password

        access = self.access

        refresh = self.refresh

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "email": email,
                "password": password,
                "access": access,
                "refresh": refresh,
            }
        )

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        email = d.pop("email", UNSET)

        password = d.pop("password", UNSET)

        access = d.pop("access", UNSET)

        refresh = d.pop("refresh", UNSET)

        token_obtain_pair = cls(
            email=email,
            password=password,
            access=access,
            refresh=refresh,
        )

        token_obtain_pair.additional_properties = d
        return token_obtain_pair

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

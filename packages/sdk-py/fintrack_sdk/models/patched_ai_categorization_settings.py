from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..models.ai_categorization_settings_provider_enum import (
    AICategorizationSettingsProviderEnum,
)
from ..types import UNSET, Unset

T = TypeVar("T", bound="PatchedAICategorizationSettings")


@_attrs_define
class PatchedAICategorizationSettings:
    """
    Attributes:
        id (int | Unset):
        budget_file (int | Unset):
        is_enabled (bool | Unset):
        provider (AICategorizationSettingsProviderEnum | Unset): * `openai_compatible` - OpenAI-compatible (bring your
            own key)
            * `ollama` - Ollama (local)
        base_url (str | Unset):
        model_name (str | Unset):
        has_api_key (str | Unset):
        created_at (datetime.datetime | Unset):
        updated_at (datetime.datetime | Unset):
    """

    id: int | Unset = UNSET
    budget_file: int | Unset = UNSET
    is_enabled: bool | Unset = UNSET
    provider: AICategorizationSettingsProviderEnum | Unset = UNSET
    base_url: str | Unset = UNSET
    model_name: str | Unset = UNSET
    has_api_key: str | Unset = UNSET
    created_at: datetime.datetime | Unset = UNSET
    updated_at: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        budget_file = self.budget_file

        is_enabled = self.is_enabled

        provider: str | Unset = UNSET
        if not isinstance(self.provider, Unset):
            provider = self.provider.value

        base_url = self.base_url

        model_name = self.model_name

        has_api_key = self.has_api_key

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
        if is_enabled is not UNSET:
            field_dict["is_enabled"] = is_enabled
        if provider is not UNSET:
            field_dict["provider"] = provider
        if base_url is not UNSET:
            field_dict["base_url"] = base_url
        if model_name is not UNSET:
            field_dict["model_name"] = model_name
        if has_api_key is not UNSET:
            field_dict["has_api_key"] = has_api_key
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

        is_enabled = d.pop("is_enabled", UNSET)

        _provider = d.pop("provider", UNSET)
        provider: AICategorizationSettingsProviderEnum | Unset
        if isinstance(_provider, Unset):
            provider = UNSET
        else:
            provider = AICategorizationSettingsProviderEnum(_provider)

        base_url = d.pop("base_url", UNSET)

        model_name = d.pop("model_name", UNSET)

        has_api_key = d.pop("has_api_key", UNSET)

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

        patched_ai_categorization_settings = cls(
            id=id,
            budget_file=budget_file,
            is_enabled=is_enabled,
            provider=provider,
            base_url=base_url,
            model_name=model_name,
            has_api_key=has_api_key,
            created_at=created_at,
            updated_at=updated_at,
        )

        patched_ai_categorization_settings.additional_properties = d
        return patched_ai_categorization_settings

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

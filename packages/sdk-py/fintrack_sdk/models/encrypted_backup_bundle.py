from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..types import UNSET, Unset

T = TypeVar("T", bound="EncryptedBackupBundle")


@_attrs_define
class EncryptedBackupBundle:
    """
    Attributes:
        id (int):
        bundle_id (UUID):
        budget_file (int):
        salt (str):
        nonce (str):
        ciphertext (str):
        created_at (datetime.datetime):
        encryption_algorithm (str | Unset):
        key_derivation (str | Unset):
        metadata (Any | Unset):
    """

    id: int
    bundle_id: UUID
    budget_file: int
    salt: str
    nonce: str
    ciphertext: str
    created_at: datetime.datetime
    encryption_algorithm: str | Unset = UNSET
    key_derivation: str | Unset = UNSET
    metadata: Any | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        bundle_id = str(self.bundle_id)

        budget_file = self.budget_file

        salt = self.salt

        nonce = self.nonce

        ciphertext = self.ciphertext

        created_at = self.created_at.isoformat()

        encryption_algorithm = self.encryption_algorithm

        key_derivation = self.key_derivation

        metadata = self.metadata

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update(
            {
                "id": id,
                "bundle_id": bundle_id,
                "budget_file": budget_file,
                "salt": salt,
                "nonce": nonce,
                "ciphertext": ciphertext,
                "created_at": created_at,
            }
        )
        if encryption_algorithm is not UNSET:
            field_dict["encryption_algorithm"] = encryption_algorithm
        if key_derivation is not UNSET:
            field_dict["key_derivation"] = key_derivation
        if metadata is not UNSET:
            field_dict["metadata"] = metadata

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        id = d.pop("id")

        bundle_id = UUID(d.pop("bundle_id"))

        budget_file = d.pop("budget_file")

        salt = d.pop("salt")

        nonce = d.pop("nonce")

        ciphertext = d.pop("ciphertext")

        created_at = datetime.datetime.fromisoformat(d.pop("created_at"))

        encryption_algorithm = d.pop("encryption_algorithm", UNSET)

        key_derivation = d.pop("key_derivation", UNSET)

        metadata = d.pop("metadata", UNSET)

        encrypted_backup_bundle = cls(
            id=id,
            bundle_id=bundle_id,
            budget_file=budget_file,
            salt=salt,
            nonce=nonce,
            ciphertext=ciphertext,
            created_at=created_at,
            encryption_algorithm=encryption_algorithm,
            key_derivation=key_derivation,
            metadata=metadata,
        )

        encrypted_backup_bundle.additional_properties = d
        return encrypted_backup_bundle

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

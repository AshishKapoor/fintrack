from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import Any, TypeVar
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..types import UNSET, Unset

T = TypeVar("T", bound="PatchedEncryptedBackupBundle")


@_attrs_define
class PatchedEncryptedBackupBundle:
    """
    Attributes:
        id (int | Unset):
        bundle_id (UUID | Unset):
        budget_file (int | Unset):
        encryption_algorithm (str | Unset):
        key_derivation (str | Unset):
        salt (str | Unset):
        nonce (str | Unset):
        ciphertext (str | Unset):
        metadata (Any | Unset):
        created_at (datetime.datetime | Unset):
    """

    id: int | Unset = UNSET
    bundle_id: UUID | Unset = UNSET
    budget_file: int | Unset = UNSET
    encryption_algorithm: str | Unset = UNSET
    key_derivation: str | Unset = UNSET
    salt: str | Unset = UNSET
    nonce: str | Unset = UNSET
    ciphertext: str | Unset = UNSET
    metadata: Any | Unset = UNSET
    created_at: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        bundle_id: str | Unset = UNSET
        if not isinstance(self.bundle_id, Unset):
            bundle_id = str(self.bundle_id)

        budget_file = self.budget_file

        encryption_algorithm = self.encryption_algorithm

        key_derivation = self.key_derivation

        salt = self.salt

        nonce = self.nonce

        ciphertext = self.ciphertext

        metadata = self.metadata

        created_at: str | Unset = UNSET
        if not isinstance(self.created_at, Unset):
            created_at = self.created_at.isoformat()

        field_dict: dict[str, Any] = {}
        field_dict.update(self.additional_properties)
        field_dict.update({})
        if id is not UNSET:
            field_dict["id"] = id
        if bundle_id is not UNSET:
            field_dict["bundle_id"] = bundle_id
        if budget_file is not UNSET:
            field_dict["budget_file"] = budget_file
        if encryption_algorithm is not UNSET:
            field_dict["encryption_algorithm"] = encryption_algorithm
        if key_derivation is not UNSET:
            field_dict["key_derivation"] = key_derivation
        if salt is not UNSET:
            field_dict["salt"] = salt
        if nonce is not UNSET:
            field_dict["nonce"] = nonce
        if ciphertext is not UNSET:
            field_dict["ciphertext"] = ciphertext
        if metadata is not UNSET:
            field_dict["metadata"] = metadata
        if created_at is not UNSET:
            field_dict["created_at"] = created_at

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        d = dict(src_dict)
        id = d.pop("id", UNSET)

        _bundle_id = d.pop("bundle_id", UNSET)
        bundle_id: UUID | Unset
        if isinstance(_bundle_id, Unset):
            bundle_id = UNSET
        else:
            bundle_id = UUID(_bundle_id)

        budget_file = d.pop("budget_file", UNSET)

        encryption_algorithm = d.pop("encryption_algorithm", UNSET)

        key_derivation = d.pop("key_derivation", UNSET)

        salt = d.pop("salt", UNSET)

        nonce = d.pop("nonce", UNSET)

        ciphertext = d.pop("ciphertext", UNSET)

        metadata = d.pop("metadata", UNSET)

        _created_at = d.pop("created_at", UNSET)
        created_at: datetime.datetime | Unset
        if isinstance(_created_at, Unset):
            created_at = UNSET
        else:
            created_at = datetime.datetime.fromisoformat(_created_at)

        patched_encrypted_backup_bundle = cls(
            id=id,
            bundle_id=bundle_id,
            budget_file=budget_file,
            encryption_algorithm=encryption_algorithm,
            key_derivation=key_derivation,
            salt=salt,
            nonce=nonce,
            ciphertext=ciphertext,
            metadata=metadata,
            created_at=created_at,
        )

        patched_encrypted_backup_bundle.additional_properties = d
        return patched_encrypted_backup_bundle

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

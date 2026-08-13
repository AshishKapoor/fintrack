from __future__ import annotations

import datetime
from collections.abc import Mapping
from typing import TYPE_CHECKING, Any, TypeVar, cast
from uuid import UUID

from attrs import define as _attrs_define
from attrs import field as _attrs_field
from typing_extensions import Self

from ..models.source_type_enum import SourceTypeEnum
from ..types import UNSET, Unset

if TYPE_CHECKING:
    from ..models.ledger_posting_read import LedgerPostingRead
    from ..models.ledger_posting_write import LedgerPostingWrite


T = TypeVar("T", bound="PatchedLedgerTransaction")


@_attrs_define
class PatchedLedgerTransaction:
    """
    Attributes:
        id (int | Unset):
        budget_file (int | Unset):
        transaction_date (datetime.date | Unset):
        payee (int | None | Unset):
        memo (str | Unset):
        source_type (SourceTypeEnum | Unset): * `manual` - Manual
            * `import` - Import
            * `rule` - Rule
            * `scheduled` - Scheduled
            * `transfer` - Transfer
        cleared (bool | Unset):
        imported (bool | Unset):
        match_key (str | Unset):
        transfer_group (None | Unset | UUID):
        postings (list[LedgerPostingWrite] | Unset):
        posting_lines (list[LedgerPostingRead] | Unset):
        tags (list[int] | Unset):
        created_at (datetime.datetime | Unset):
        updated_at (datetime.datetime | Unset):
    """

    id: int | Unset = UNSET
    budget_file: int | Unset = UNSET
    transaction_date: datetime.date | Unset = UNSET
    payee: int | None | Unset = UNSET
    memo: str | Unset = UNSET
    source_type: SourceTypeEnum | Unset = UNSET
    cleared: bool | Unset = UNSET
    imported: bool | Unset = UNSET
    match_key: str | Unset = UNSET
    transfer_group: None | Unset | UUID = UNSET
    postings: list[LedgerPostingWrite] | Unset = UNSET
    posting_lines: list[LedgerPostingRead] | Unset = UNSET
    tags: list[int] | Unset = UNSET
    created_at: datetime.datetime | Unset = UNSET
    updated_at: datetime.datetime | Unset = UNSET
    additional_properties: dict[str, Any] = _attrs_field(init=False, factory=dict)

    def to_dict(self) -> dict[str, Any]:
        id = self.id

        budget_file = self.budget_file

        transaction_date: str | Unset = UNSET
        if not isinstance(self.transaction_date, Unset):
            transaction_date = self.transaction_date.isoformat()

        payee: int | None | Unset
        if isinstance(self.payee, Unset):
            payee = UNSET
        else:
            payee = self.payee

        memo = self.memo

        source_type: str | Unset = UNSET
        if not isinstance(self.source_type, Unset):
            source_type = self.source_type.value

        cleared = self.cleared

        imported = self.imported

        match_key = self.match_key

        transfer_group: None | str | Unset
        if isinstance(self.transfer_group, Unset):
            transfer_group = UNSET
        elif isinstance(self.transfer_group, UUID):
            transfer_group = str(self.transfer_group)
        else:
            transfer_group = self.transfer_group

        postings: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.postings, Unset):
            postings = []
            for postings_item_data in self.postings:
                postings_item = postings_item_data.to_dict()
                postings.append(postings_item)

        posting_lines: list[dict[str, Any]] | Unset = UNSET
        if not isinstance(self.posting_lines, Unset):
            posting_lines = []
            for posting_lines_item_data in self.posting_lines:
                posting_lines_item = posting_lines_item_data.to_dict()
                posting_lines.append(posting_lines_item)

        tags: list[int] | Unset = UNSET
        if not isinstance(self.tags, Unset):
            tags = self.tags

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
        if transaction_date is not UNSET:
            field_dict["transaction_date"] = transaction_date
        if payee is not UNSET:
            field_dict["payee"] = payee
        if memo is not UNSET:
            field_dict["memo"] = memo
        if source_type is not UNSET:
            field_dict["source_type"] = source_type
        if cleared is not UNSET:
            field_dict["cleared"] = cleared
        if imported is not UNSET:
            field_dict["imported"] = imported
        if match_key is not UNSET:
            field_dict["match_key"] = match_key
        if transfer_group is not UNSET:
            field_dict["transfer_group"] = transfer_group
        if postings is not UNSET:
            field_dict["postings"] = postings
        if posting_lines is not UNSET:
            field_dict["posting_lines"] = posting_lines
        if tags is not UNSET:
            field_dict["tags"] = tags
        if created_at is not UNSET:
            field_dict["created_at"] = created_at
        if updated_at is not UNSET:
            field_dict["updated_at"] = updated_at

        return field_dict

    @classmethod
    def from_dict(cls, src_dict: Mapping[str, Any]) -> Self:
        from ..models.ledger_posting_read import LedgerPostingRead
        from ..models.ledger_posting_write import LedgerPostingWrite

        d = dict(src_dict)
        id = d.pop("id", UNSET)

        budget_file = d.pop("budget_file", UNSET)

        _transaction_date = d.pop("transaction_date", UNSET)
        transaction_date: datetime.date | Unset
        if isinstance(_transaction_date, Unset):
            transaction_date = UNSET
        else:
            transaction_date = datetime.date.fromisoformat(_transaction_date)

        def _parse_payee(data: object) -> int | None | Unset:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            return cast(int | None | Unset, data)

        payee = _parse_payee(d.pop("payee", UNSET))

        memo = d.pop("memo", UNSET)

        _source_type = d.pop("source_type", UNSET)
        source_type: SourceTypeEnum | Unset
        if isinstance(_source_type, Unset):
            source_type = UNSET
        else:
            source_type = SourceTypeEnum(_source_type)

        cleared = d.pop("cleared", UNSET)

        imported = d.pop("imported", UNSET)

        match_key = d.pop("match_key", UNSET)

        def _parse_transfer_group(data: object) -> None | Unset | UUID:
            if data is None:
                return data
            if isinstance(data, Unset):
                return data
            try:
                if not isinstance(data, str):
                    raise TypeError()
                transfer_group_type_0 = UUID(data)

                return transfer_group_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            return cast(None | Unset | UUID, data)

        transfer_group = _parse_transfer_group(d.pop("transfer_group", UNSET))

        _postings = d.pop("postings", UNSET)
        postings: list[LedgerPostingWrite] | Unset = UNSET
        if _postings is not UNSET:
            postings = []
            for postings_item_data in _postings:
                postings_item = LedgerPostingWrite.from_dict(postings_item_data)

                postings.append(postings_item)

        _posting_lines = d.pop("posting_lines", UNSET)
        posting_lines: list[LedgerPostingRead] | Unset = UNSET
        if _posting_lines is not UNSET:
            posting_lines = []
            for posting_lines_item_data in _posting_lines:
                posting_lines_item = LedgerPostingRead.from_dict(
                    posting_lines_item_data
                )

                posting_lines.append(posting_lines_item)

        tags = cast(list[int], d.pop("tags", UNSET))

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

        patched_ledger_transaction = cls(
            id=id,
            budget_file=budget_file,
            transaction_date=transaction_date,
            payee=payee,
            memo=memo,
            source_type=source_type,
            cleared=cleared,
            imported=imported,
            match_key=match_key,
            transfer_group=transfer_group,
            postings=postings,
            posting_lines=posting_lines,
            tags=tags,
            created_at=created_at,
            updated_at=updated_at,
        )

        patched_ledger_transaction.additional_properties = d
        return patched_ledger_transaction

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

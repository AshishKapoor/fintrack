#!/usr/bin/env python3
"""Post-generation fixes for openapi-python-client output.

Two generator quirks, applied idempotently so `regenerate + patch` is the
documented, reproducible workflow:

1. Files annotate with `Unset` while importing only the UNSET sentinel.
2. Write-only request fields (passwords) are demanded back when parsing the
   response that echoes the request model.
"""

import pathlib
import re

ROOT = pathlib.Path(__file__).parent / "fintrack_sdk"

WRITE_ONLY = {
    "user_registration.py": ["password", "confirm_password"],
    "token_obtain_pair.py": ["email", "password", "access", "refresh"],
}

# Write-only collections: absent from responses, default to empty.
LIST_DEFAULTS = {
    "ledger_transaction.py": ["postings"],
}

# Read-only annotations that some payload shapes omit; default to empty string.
STRING_DEFAULTS = {
    "ledger_posting_write.py": ["account_name", "category_name"],
    "ledger_posting_read.py": ["account_name", "category_name"],
}


def ensure_sentinel_import(source: str) -> str:
    """UNSET (the sentinel) for files that reference it with no types import."""
    if "UNSET" in source and "types import" not in source:
        return source.replace(
            "from attrs import", "from ..types import UNSET\nfrom attrs import", 1
        )
    match = re.search(r"from (\.+)types import ([^\n]+)", source)
    if match and "UNSET" not in match.group(2):
        return source.replace(
            match.group(0), f"from {match.group(1)}types import UNSET, {match.group(2)}", 1
        )
    return source


def ensure_unset_import(source: str) -> str:
    match = re.search(r"from (\.+)types import ([^\n]+)", source)
    if match and "Unset" not in match.group(2):
        return source.replace(match.group(0), f"from {match.group(1)}types import Unset, {match.group(2)}", 1)
    if not match and re.search(r"\bUnset\b", source):
        return source.replace("from attrs import", "from ..types import UNSET, Unset\nfrom attrs import", 1)
    return source


def main() -> None:
    patched = 0
    for path in ROOT.rglob("*.py"):
        if path.name == "types.py":
            continue
        source = path.read_text()
        updated = source
        if re.search(r"\bUnset\b", updated) and "import Unset" not in updated:
            updated = ensure_unset_import(updated)
        if path.name in LIST_DEFAULTS:
            for field in LIST_DEFAULTS[path.name]:
                updated = updated.replace(
                    f'd.pop("{field}")', f'd.pop("{field}", [])'
                )
        if path.name in STRING_DEFAULTS:
            for field in STRING_DEFAULTS[path.name]:
                updated = updated.replace(
                    f'd.pop("{field}")', f'd.pop("{field}", "")'
                )
        if path.name in WRITE_ONLY:
            updated = ensure_sentinel_import(updated)
            for field in WRITE_ONLY[path.name]:
                updated = updated.replace(
                    f'{field} = d.pop("{field}")', f'{field} = d.pop("{field}", UNSET)'
                )
        if updated != source:
            path.write_text(updated)
            patched += 1
    print(f"patched {patched} files")


if __name__ == "__main__":
    main()

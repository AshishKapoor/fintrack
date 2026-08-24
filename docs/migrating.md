# Migrating from another tool

FinTrack has documented, tested import paths from the three tools people
actually ask about. Each one goes through the same import pipeline
([Transactions → Import](../README.md)) — a preview pass shows what will be
created before anything touches your ledger, and duplicate re-imports are
skipped automatically ([ARCHITECTURE.md](../ARCHITECTURE.md)'s `match_key`).

None of these require the source tool to still be running - they all work
from a file you export once.

## From YNAB

Already supported, and the most direct path of the three: YNAB's own
**Register → Export** produces a CSV with `Date`, `Payee`, `Category`, `Memo`,
`Outflow`, `Inflow` columns. Pick **YNAB4** or **nYNAB** as the import format
depending on which YNAB generation exported the file - both are parsed the
same way (`Inflow` minus `Outflow` becomes a signed amount).

Import one account's register at a time, same as YNAB itself organizes them.

## From Actual Budget

Open the account you want to bring over, then use its register's **Export**
toolbar action. That produces a CSV with `Date`, `Payee`, `Notes`, `Category`,
`Amount` columns (older Actual versions call the notes column `Memo` instead -
FinTrack accepts either).

Pick **Actual Budget** as the import format. Column names are matched
case-insensitively, so a re-ordered export still works. Repeat per account.

Note: Actual's full **File → Export** produces a `.zip` of its entire
internal database, not this register CSV - that's a backup format for Actual
itself, not something FinTrack (or most other tools) can read. Use the
per-account register export instead.

## From Firefly III

**Settings → Export data → Export** produces a CSV covering every account at
once, with `date`, `amount`, `type`, `source_name`, `destination_name`,
`description`, `notes` columns (among others FinTrack ignores). Pick
**Firefly III** as the import format.

`type` (`withdrawal` / `deposit` / `transfer`) decides both the sign and which
side of the transaction becomes the payee: a withdrawal's payee is
`destination_name` (where the money went), a deposit's is `source_name`
(where it came from). `description` and `notes` are combined into the memo.

## If the shape doesn't match

All three parsers are tolerant of column order and case, but not of a
genuinely different export shape - a tool version that renamed a column, or a
plugin that changed the export layout. If preview shows zero detected rows,
open the file and check its header row against the columns listed above; the
generic **CSV** format (`date`/`payee`/`memo`/`amount` headers, or
`transaction_date`/`title` as aliases) is the fallback for anything that
doesn't fit one of the three named parsers, and is often a five-minute column
rename away in a spreadsheet.

## An ongoing connection instead of a one-time import

If the reason you're switching is wanting your bank to feed FinTrack directly
rather than re-exporting every so often, see
[self-hosting.md#bank-sync](self-hosting.md#bank-sync) - GoCardless (EU/UK)
and SimpleFIN (US/CA) both sync automatically once connected, through the
same dedup and rules pipeline described above.

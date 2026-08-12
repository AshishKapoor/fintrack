# How double-entry bookkeeping works, for developers

*The mental model behind FinTrack's ledger, explained without accounting jargon.*

Most finance apps store money the way a to-do app stores tasks: one row per
transaction, with an amount and a sign. Spent £40 on groceries? Insert
`{amount: -40, category: "Food"}`. It works — right up until it doesn't, and
the ways it stops working are the reason double-entry bookkeeping has survived
five centuries of better ideas.

This post explains the model FinTrack is built on, why the single-row approach
breaks, and what the invariant buys you in practice.

## The single-row model, and where it lies to you

Say you track transactions as signed amounts:

```
date        memo             amount   category
2026-03-01  Salary          +4200.00  Income
2026-03-03  Groceries         -82.45  Food
2026-03-07  Metro pass        -55.00  Transport
```

Now answer a simple question: **how much money is in your checking account?**

You can't. The rows record *flows* but not *where the money sits*. So you add
an `account` column. Fine — until you move £500 from checking to savings.
That's not income and it's not spending, but your schema forces a choice:

- Record it once against checking (`-500`): savings is now wrong.
- Record it twice (`-500` checking, `+500` savings): your "total spending"
  reports now double-count every transfer unless every query remembers to
  exclude them.
- Add a special `is_transfer` flag: congratulations, you have grown a second
  schema inside your first one, and every report needs to know about it.

Credit cards make it worse. Paying a £300 credit-card bill from checking is a
transfer between two accounts — but the £300 of spending already happened,
last month, at the point of purchase. Single-row schemas routinely count it in
both places, which is why so many budgeting apps quietly show spending numbers
that don't add up.

The root problem: **every movement of money has two ends**, and a single-row
schema records only one of them.

## The double-entry model

Double-entry makes the two ends explicit. A *transaction* is a container; the
money lives in its *postings*, and every posting says where value came from or
went to. The one rule — the entire system, really — is:

> **The postings of a transaction must sum to zero.**

Buying £82.45 of groceries from checking:

```
Transaction: "Green Grocer", 2026-03-03
  Posting 1:  account = Checking     amount = -82.45
  Posting 2:  category = Food        amount = +82.45
                                     ─────────────────
                                     sum    =   0.00
```

Money left the checking account (−) and was "consumed" by the Food category
(+). Nothing appeared or vanished; it moved.

Your salary:

```
Transaction: "Acme Corp", 2026-03-01
  Posting 1:  account = Checking     amount = +4200.00
  Posting 2:  category = Salary      amount = -4200.00
```

And the transfer that broke the single-row model:

```
Transaction: "Move to savings", 2026-03-10
  Posting 1:  account = Checking     amount = -500.00
  Posting 2:  account = Savings      amount = +500.00
```

Two *account* postings, no category at all. It is structurally obvious that
this is neither income nor spending — no flag, no special case, no report that
needs to remember to exclude it.

## What the invariant buys you

**Balances are derived, never stored.** An account's balance is its opening
balance plus the sum of its postings. There is no `balance` column to drift out
of sync, no cache to invalidate, no reconciliation job to run at 3am. If the
zero-sum rule holds, the balances *cannot* be wrong relative to the
transactions.

**Errors become loud instead of silent.** In a single-row schema, a bug that
drops a row just… loses money, invisibly. In double-entry, a bug that writes
half a transaction violates the invariant and can be rejected *at write time*.
The failure mode changes from "the numbers drift and nobody notices for six
months" to "the write fails and you fix the bug today".

**Reports stop being special-cased.** Spending is the sum of postings against
expense categories. Income is the sum against income categories. Net worth is
the sum of account balances. Cash flow is postings grouped by month. Every
report is a filter and a sum over one table — no `is_transfer` exclusions, no
credit-card double counting.

**Credit cards just work.** A card purchase posts against the card account
(a liability) and an expense category — spending recorded once, at purchase
time. Paying the bill is an account-to-account transfer. The two events that
single-row schemas conflate are two different transactions, because they *are*
two different events.

## How FinTrack implements it

FinTrack's ledger (see [ARCHITECTURE.md](../../ARCHITECTURE.md) for the full
model) maps the concepts above almost one-to-one:

- **`LedgerTransaction`** is the container — date, payee, memo, cleared flag.
- **`LedgerPosting`** carries the money. Each posting references *exactly one*
  of an account or a category — enforced by a database check constraint, not
  application code.
- The **zero-sum rule** is validated on every write through the API
  (`finance_serializers._validate_postings`). Moving it into the database
  itself, so that *no* write path can violate it, is tracked in
  [#49](https://github.com/AshishKapoor/fintrack/issues/49).
- **Transfers** are two account postings sharing a `transfer_group` id.
- Accounts are typed (checking, savings, cash, credit, asset, liability), so
  net worth can subtract liabilities without guessing.

A worked example, as the API sees it:

```json
POST /api/v1/finance/transactions/
{
  "budget_file": 1,
  "transaction_date": "2026-03-03",
  "memo": "Green Grocer",
  "postings": [
    { "account": 1,  "amount": "-82.45" },
    { "category": 7, "amount": "82.45" }
  ]
}
```

Send postings that don't sum to zero and you get a 400, not a quietly corrupt
ledger.

## "Isn't this overkill for personal finance?"

The honest answer: for *recording* your coffee purchases, yes, a signed-amount
row would do. The model earns its keep at the exact moments personal finance
stops being trivial — the second account, the first credit card, the first
transfer, the first time you ask "why doesn't my total match my bank?" —
which, empirically, is about week three of using any finance app seriously.

FinTrack's UI hides the mechanics for the common case: you type "£82.45,
Groceries" and the app writes the two postings for you. The double-entry
structure is there when you need it, invisible when you don't. That's the
design goal — the correctness of a ledger with the ergonomics of an expense
tracker.

## Further reading

- [ARCHITECTURE.md](../../ARCHITECTURE.md) — FinTrack's data model, invariants
  and where they are enforced
- Martin Fowler's *Accounting Patterns* — the classic treatment of
  transactions and postings as a design pattern
- The plain-text accounting community (ledger-cli, hledger, beancount) — the
  same model, driven from text files

*Questions or corrections? [Open a discussion](https://github.com/AshishKapoor/fintrack/discussions).*

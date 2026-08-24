"""Firefly III and Actual Budget import formats - ROADMAP.md Phase 2's
"Migration guides" item. See docs/migrating.md, which documents exactly the
export menu path and column shape these parsers accept.
"""

from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from pft.finance_services import _parse_actual_rows, _parse_firefly3_rows
from pft.models import BudgetFile, ImportJob, LedgerTransaction

User = get_user_model()

FIREFLY3_CSV = (
    "user_id,transaction_journal_id,description,date,type,amount,currency_code,"
    "source_name,destination_name,category,notes\n"
    "1,101,Grocery run,2026-03-01,withdrawal,54.32,USD,Checking Account,"
    "Whole Foods,Groceries,Weekly shop\n"
    "1,102,Paycheck,2026-03-02,deposit,2000.00,USD,Employer Inc,"
    "Checking Account,Salary,\n"
    "1,103,Transfer to savings,2026-03-03,transfer,300.00,USD,Checking Account,"
    "Savings Account,,\n"
)

ACTUAL_CSV = (
    "Date,Payee,Notes,Category,Amount\n"
    "2026-03-01,Trader Joe's,Weekly groceries,Food,-64.20\n"
    "2026-03-05,Employer,,Income,1500.00\n"
)


class Firefly3ParserTests(APITestCase):
    def test_withdrawal_is_negative_and_payee_is_the_destination(self):
        rows = _parse_firefly3_rows(FIREFLY3_CSV)
        withdrawal = rows[0]
        self.assertEqual(withdrawal.transaction_date, date(2026, 3, 1))
        self.assertEqual(withdrawal.amount, Decimal("-54.32"))
        self.assertEqual(withdrawal.payee, "Whole Foods")
        self.assertEqual(withdrawal.memo, "Grocery run - Weekly shop")

    def test_deposit_is_positive_and_payee_is_the_source(self):
        deposit = _parse_firefly3_rows(FIREFLY3_CSV)[1]
        self.assertEqual(deposit.amount, Decimal("2000.00"))
        self.assertEqual(deposit.payee, "Employer Inc")
        self.assertEqual(deposit.memo, "Paycheck")

    def test_transfer_falls_back_to_destination_as_payee(self):
        transfer = _parse_firefly3_rows(FIREFLY3_CSV)[2]
        self.assertEqual(transfer.payee, "Savings Account")

    def test_header_matching_is_case_insensitive(self):
        upper = FIREFLY3_CSV.replace("date,type,amount", "DATE,TYPE,AMOUNT")
        rows = _parse_firefly3_rows(upper)
        self.assertEqual(len(rows), 3)

    def test_end_to_end_via_import_api(self):
        user = User.objects.create_user(
            email="firefly@example.com", username="firefly@example.com", password="StrongPass123!"
        )
        self.client.force_authenticate(user=user)
        budget_file = BudgetFile.objects.get(user=user, is_default=True)

        create_response = self.client.post(
            "/api/v1/finance/imports/",
            {
                "budget_file": budget_file.id,
                "format": ImportJob.FORMAT_FIREFLY3,
                "source_filename": "firefly-export.csv",
                "source_payload": FIREFLY3_CSV,
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        job_id = create_response.data["id"]

        preview = self.client.post(f"/api/v1/finance/imports/{job_id}/preview/", {}, format="json")
        self.assertEqual(preview.data["detected_rows"], 3)

        self.client.post(f"/api/v1/finance/imports/{job_id}/execute/", {}, format="json")
        job = self.client.get(f"/api/v1/finance/imports/{job_id}/")
        self.assertEqual(job.data["status"], ImportJob.STATUS_COMPLETED)
        self.assertEqual(job.data["preview_summary"]["created"], 3)
        self.assertTrue(
            LedgerTransaction.objects.filter(
                budget_file=budget_file, memo__icontains="Grocery run"
            ).exists()
        )


class ActualBudgetParserTests(APITestCase):
    def test_parses_expense_and_income_rows(self):
        rows = _parse_actual_rows(ACTUAL_CSV)
        self.assertEqual(len(rows), 2)

        expense = rows[0]
        self.assertEqual(expense.transaction_date, date(2026, 3, 1))
        self.assertEqual(expense.payee, "Trader Joe's")
        self.assertEqual(expense.memo, "Weekly groceries")
        self.assertEqual(expense.amount, Decimal("-64.20"))

        income = rows[1]
        self.assertEqual(income.payee, "Employer")
        self.assertEqual(income.memo, "")
        self.assertEqual(income.amount, Decimal("1500.00"))

    def test_falls_back_to_memo_header_for_older_actual_exports(self):
        legacy = ACTUAL_CSV.replace("Notes", "Memo")
        rows = _parse_actual_rows(legacy)
        self.assertEqual(rows[0].memo, "Weekly groceries")

    def test_end_to_end_via_import_api(self):
        user = User.objects.create_user(
            email="actual@example.com", username="actual@example.com", password="StrongPass123!"
        )
        self.client.force_authenticate(user=user)
        budget_file = BudgetFile.objects.get(user=user, is_default=True)

        create_response = self.client.post(
            "/api/v1/finance/imports/",
            {
                "budget_file": budget_file.id,
                "format": ImportJob.FORMAT_ACTUAL,
                "source_filename": "actual-register.csv",
                "source_payload": ACTUAL_CSV,
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        job_id = create_response.data["id"]

        self.client.post(f"/api/v1/finance/imports/{job_id}/preview/", {}, format="json")
        self.client.post(f"/api/v1/finance/imports/{job_id}/execute/", {}, format="json")
        job = self.client.get(f"/api/v1/finance/imports/{job_id}/")
        self.assertEqual(job.data["status"], ImportJob.STATUS_COMPLETED)
        self.assertEqual(job.data["preview_summary"]["created"], 2)

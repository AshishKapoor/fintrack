from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from pft.models import Account, BudgetFile, CategoryV2, ImportJob, LedgerPosting, LedgerTransaction


User = get_user_model()


class V2FinanceApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="v2-user@example.com",
            username="v2-user@example.com",
            password="StrongPass123!",
        )
        self.client.force_authenticate(user=self.user)

        self.budget_file = BudgetFile.objects.get(user=self.user, is_default=True)
        self.account = Account.objects.get(budget_file=self.budget_file, name="Cash")
        self.expense_category = CategoryV2.objects.filter(
            budget_file=self.budget_file,
            kind=CategoryV2.KIND_EXPENSE,
        ).first()
        self.income_category = CategoryV2.objects.filter(
            budget_file=self.budget_file,
            kind=CategoryV2.KIND_INCOME,
        ).first()

    def test_user_bootstrap_creates_default_v2_objects(self):
        self.assertEqual(BudgetFile.objects.filter(user=self.user).count(), 1)
        self.assertEqual(Account.objects.filter(budget_file=self.budget_file).count(), 1)
        self.assertGreaterEqual(
            CategoryV2.objects.filter(budget_file=self.budget_file).count(),
            10,
        )

    def test_create_balanced_ledger_transaction(self):
        payload = {
            "budget_file": self.budget_file.id,
            "transaction_date": "2026-03-10",
            "memo": "Coffee",
            "postings": [
                {
                    "account": self.account.id,
                    "category": None,
                    "amount": "-10.00",
                    "memo": "cash out",
                    "sort_order": 0,
                },
                {
                    "account": None,
                    "category": self.expense_category.id,
                    "amount": "10.00",
                    "memo": "expense leg",
                    "sort_order": 1,
                },
            ],
        }
        response = self.client.post("/api/v2/transactions/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(LedgerTransaction.objects.filter(budget_file=self.budget_file).count(), 1)
        self.assertEqual(LedgerPosting.objects.filter(transaction_id=response.data["id"]).count(), 2)

    def test_reject_unbalanced_ledger_transaction(self):
        payload = {
            "budget_file": self.budget_file.id,
            "transaction_date": "2026-03-10",
            "memo": "Broken",
            "postings": [
                {
                    "account": self.account.id,
                    "category": None,
                    "amount": "-10.00",
                    "sort_order": 0,
                },
                {
                    "account": None,
                    "category": self.expense_category.id,
                    "amount": "5.00",
                    "sort_order": 1,
                },
            ],
        }
        response = self.client.post("/api/v2/transactions/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_budget_month_snapshot_and_helpers(self):
        budget_month_response = self.client.post(
            "/api/v2/budget-months/",
            {
                "budget_file": self.budget_file.id,
                "year": 2026,
                "month": 3,
                "mode": "envelope",
            },
            format="json",
        )
        self.assertEqual(budget_month_response.status_code, status.HTTP_201_CREATED)
        budget_month_id = budget_month_response.data["id"]

        assignment_response = self.client.post(
            "/api/v2/envelope-assignments/",
            {
                "budget_month": budget_month_id,
                "category": self.expense_category.id,
                "assigned_amount": "300.00",
                "carryover_amount": "25.00",
                "goal_type": "monthly_contribution",
                "goal_value": "100.00",
                "priority": 1,
            },
            format="json",
        )
        self.assertEqual(assignment_response.status_code, status.HTTP_201_CREATED)

        snapshot_response = self.client.get(f"/api/v2/budget-months/{budget_month_id}/snapshot/")
        self.assertEqual(snapshot_response.status_code, status.HTTP_200_OK)
        self.assertIn("available_to_budget", snapshot_response.data)

        zero_out_response = self.client.post(
            f"/api/v2/budget-months/{budget_month_id}/zero-out/",
            {},
            format="json",
        )
        self.assertEqual(zero_out_response.status_code, status.HTTP_200_OK)

    def test_export_job_and_download_csv(self):
        create_tx = {
            "budget_file": self.budget_file.id,
            "transaction_date": "2026-03-10",
            "memo": "Lunch",
            "postings": [
                {
                    "account": self.account.id,
                    "category": None,
                    "amount": "-20.00",
                    "sort_order": 0,
                },
                {
                    "account": None,
                    "category": self.expense_category.id,
                    "amount": "20.00",
                    "sort_order": 1,
                },
            ],
        }
        self.client.post("/api/v2/transactions/", create_tx, format="json")

        export_response = self.client.post(
            "/api/v2/exports/",
            {
                "budget_file": self.budget_file.id,
                "format": "csv",
                "filters": {},
            },
            format="json",
        )
        self.assertEqual(export_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(export_response.data["status"], "completed")

        download_response = self.client.get(
            f"/api/v2/exports/{export_response.data['id']}/download/"
        )
        self.assertEqual(download_response.status_code, status.HTTP_200_OK)
        self.assertIn("text/csv", download_response["Content-Type"])

    def test_backup_bundle_create_and_latest(self):
        backup_response = self.client.post(
            "/api/v2/backups/",
            {
                "budget_file": self.budget_file.id,
                "salt": "salt-base64",
                "nonce": "nonce-base64",
                "ciphertext": "ciphertext-base64",
                "metadata": {"version": 1},
            },
            format="json",
        )
        self.assertEqual(backup_response.status_code, status.HTTP_201_CREATED)

        latest_response = self.client.get(
            f"/api/v2/backups/latest/?budget_file={self.budget_file.id}"
        )
        self.assertEqual(latest_response.status_code, status.HTTP_200_OK)
        self.assertEqual(latest_response.data["budget_file"], self.budget_file.id)

    def test_import_preview_and_execute_csv(self):
        source_payload = "date,payee,memo,amount\n2026-03-01,Employer,Salary,500.00\n2026-03-02,Cafe,Coffee,-5.00\n"

        import_response = self.client.post(
            "/api/v2/imports/",
            {
                "budget_file": self.budget_file.id,
                "format": ImportJob.FORMAT_CSV,
                "source_filename": "sample.csv",
                "source_payload": source_payload,
            },
            format="json",
        )
        self.assertEqual(import_response.status_code, status.HTTP_201_CREATED)
        import_job_id = import_response.data["id"]

        preview_response = self.client.post(
            f"/api/v2/imports/{import_job_id}/preview/",
            {},
            format="json",
        )
        self.assertEqual(preview_response.status_code, status.HTTP_200_OK)
        self.assertEqual(preview_response.data["detected_rows"], 2)

        execute_response = self.client.post(
            f"/api/v2/imports/{import_job_id}/execute/",
            {},
            format="json",
        )
        self.assertEqual(execute_response.status_code, status.HTTP_200_OK)
        self.assertEqual(execute_response.data["created"], 2)

    def test_import_preview_supports_qif_camt_and_ynab(self):
        qif_payload = "!Type:Bank\nD03/03/2026\nT-12.50\nPCoffee Shop\nMMorning coffee\n^\n"
        camt_payload = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.02">'
            "<BkToCstmrStmt><Stmt><Ntry>"
            "<Amt Ccy=\"USD\">150.00</Amt><CdtDbtInd>CRDT</CdtDbtInd>"
            "<BookgDt><Dt>2026-03-04</Dt></BookgDt>"
            "<NtryDtls><TxDtls><RmtInf><Ustrd>Transfer In</Ustrd></RmtInf></TxDtls></NtryDtls>"
            "</Ntry></Stmt></BkToCstmrStmt></Document>"
        )
        ynab_payload = (
            "Date,Payee,Memo,Outflow,Inflow\n"
            "2026-03-05,Employer,Paycheck,0.00,1000.00\n"
            "2026-03-06,Grocer,Food,50.00,0.00\n"
        )

        for fmt, payload in [
            (ImportJob.FORMAT_QIF, qif_payload),
            (ImportJob.FORMAT_CAMT053, camt_payload),
            (ImportJob.FORMAT_NYNAB, ynab_payload),
        ]:
            import_response = self.client.post(
                "/api/v2/imports/",
                {
                    "budget_file": self.budget_file.id,
                    "format": fmt,
                    "source_filename": f"sample.{fmt}",
                    "source_payload": payload,
                },
                format="json",
            )
            self.assertEqual(import_response.status_code, status.HTTP_201_CREATED)

            preview_response = self.client.post(
                f"/api/v2/imports/{import_response.data['id']}/preview/",
                {},
                format="json",
            )
            self.assertEqual(preview_response.status_code, status.HTTP_200_OK)
            self.assertGreaterEqual(preview_response.data["detected_rows"], 1)
            self.assertFalse(preview_response.data["unsupported"])

    def test_reports_endpoint_net_worth_and_cash_flow(self):
        # Income leg
        self.client.post(
            "/api/v2/transactions/",
            {
                "budget_file": self.budget_file.id,
                "transaction_date": "2026-03-01",
                "memo": "salary",
                "postings": [
                    {
                        "account": self.account.id,
                        "category": None,
                        "amount": "500.00",
                        "sort_order": 0,
                    },
                    {
                        "account": None,
                        "category": self.income_category.id,
                        "amount": "-500.00",
                        "sort_order": 1,
                    },
                ],
            },
            format="json",
        )
        # Expense leg
        self.client.post(
            "/api/v2/transactions/",
            {
                "budget_file": self.budget_file.id,
                "transaction_date": "2026-03-02",
                "memo": "rent",
                "postings": [
                    {
                        "account": self.account.id,
                        "category": None,
                        "amount": "-100.00",
                        "sort_order": 0,
                    },
                    {
                        "account": None,
                        "category": self.expense_category.id,
                        "amount": "100.00",
                        "sort_order": 1,
                    },
                ],
            },
            format="json",
        )

        cash_flow_response = self.client.post(
            "/api/v2/reports/run/",
            {
                "budget_file": self.budget_file.id,
                "report_type": "cash_flow",
                "start_date": "2026-03-01",
                "end_date": "2026-03-31",
            },
            format="json",
        )
        self.assertEqual(cash_flow_response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(cash_flow_response.data["income"]), Decimal("500.00"))
        self.assertEqual(Decimal(cash_flow_response.data["expenses"]), Decimal("100.00"))

        net_worth_response = self.client.post(
            "/api/v2/reports/run/",
            {
                "budget_file": self.budget_file.id,
                "report_type": "net_worth",
                "as_of": date(2026, 3, 31).isoformat(),
            },
            format="json",
        )
        self.assertEqual(net_worth_response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(net_worth_response.data["total"]), Decimal("400.00"))

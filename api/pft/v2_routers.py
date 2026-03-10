from rest_framework.routers import DefaultRouter

from .v2_views import (
    AccountViewSet,
    BackupBundleViewSet,
    BudgetFileViewSet,
    BudgetMonthViewSet,
    CategoryGroupViewSet,
    CategoryV2ViewSet,
    EnvelopeAssignmentViewSet,
    ExportJobViewSet,
    ImportJobViewSet,
    LedgerTransactionViewSet,
    PayeeViewSet,
    PostingViewSet,
    ReportViewSet,
    ScheduledTransactionViewSet,
    TagViewSet,
    TransactionRuleViewSet,
)

router = DefaultRouter()
router.register("budget-files", BudgetFileViewSet, basename="v2-budget-file")
router.register("accounts", AccountViewSet, basename="v2-account")
router.register("category-groups", CategoryGroupViewSet, basename="v2-category-group")
router.register("categories", CategoryV2ViewSet, basename="v2-category")
router.register("payees", PayeeViewSet, basename="v2-payee")
router.register("tags", TagViewSet, basename="v2-tag")
router.register("transactions", LedgerTransactionViewSet, basename="v2-transaction")
router.register("postings", PostingViewSet, basename="v2-posting")
router.register("budget-months", BudgetMonthViewSet, basename="v2-budget-month")
router.register("envelope-assignments", EnvelopeAssignmentViewSet, basename="v2-envelope-assignment")
router.register(
    "scheduled-transactions", ScheduledTransactionViewSet, basename="v2-scheduled-transaction"
)
router.register("rules", TransactionRuleViewSet, basename="v2-rule")
router.register("reports", ReportViewSet, basename="v2-report")
router.register("exports", ExportJobViewSet, basename="v2-export")
router.register("backups", BackupBundleViewSet, basename="v2-backup")
router.register("imports", ImportJobViewSet, basename="v2-import")

urlpatterns = router.urls

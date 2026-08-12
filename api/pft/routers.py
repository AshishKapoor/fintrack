from rest_framework.routers import DefaultRouter

from .views import (
    BudgetViewSet,
    CategoryViewSet,
    TransactionViewSet,
)

router = DefaultRouter()
router.register("transactions", TransactionViewSet, basename="transaction")
router.register("categories", CategoryViewSet, basename="category")
router.register("budgets", BudgetViewSet, basename="budget")

urlpatterns = router.urls

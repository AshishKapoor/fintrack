from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet,TransactionViewSet, BudgetViewSet,
)

router = DefaultRouter()
router.register("transactions", TransactionViewSet, basename="transaction")
router.register("categories", CategoryViewSet, basename="category")
router.register("budgets", BudgetViewSet, basename="budget")

urlpatterns = router.urls

from enum import Enum


class GoalTypeEnum(str, Enum):
    BY_DATE = "by_date"
    BY_SCHEDULE = "by_schedule"
    MONTHLY_CONTRIBUTION = "monthly_contribution"
    NONE = "none"
    PERCENT_INCOME = "percent_income"
    REMAINDER = "remainder"
    TARGET_BALANCE = "target_balance"

    def __str__(self) -> str:
        return str(self.value)

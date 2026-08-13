from enum import Enum


class FrequencyEnum(str, Enum):
    CUSTOM = "custom"
    DAILY = "daily"
    MONTHLY = "monthly"
    WEEKLY = "weekly"
    YEARLY = "yearly"

    def __str__(self) -> str:
        return str(self.value)

from enum import Enum


class TypeEnum(str, Enum):
    ASSET = "asset"
    CASH = "cash"
    CHECKING = "checking"
    CREDIT = "credit"
    LIABILITY = "liability"
    SAVINGS = "savings"

    def __str__(self) -> str:
        return str(self.value)

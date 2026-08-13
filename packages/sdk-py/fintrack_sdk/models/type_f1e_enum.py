from enum import Enum


class TypeF1EEnum(str, Enum):
    EXPENSE = "expense"
    INCOME = "income"

    def __str__(self) -> str:
        return str(self.value)

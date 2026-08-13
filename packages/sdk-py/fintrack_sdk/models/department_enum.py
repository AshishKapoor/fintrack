from enum import Enum


class DepartmentEnum(str, Enum):
    ENGINEERING = "engineering"
    FINANCE = "finance"
    HR = "hr"
    MARKETING = "marketing"
    OTHER = "other"
    SALES = "sales"

    def __str__(self) -> str:
        return str(self.value)

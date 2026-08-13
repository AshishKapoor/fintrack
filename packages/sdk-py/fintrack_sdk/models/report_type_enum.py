from enum import Enum


class ReportTypeEnum(str, Enum):
    CASH_FLOW = "cash_flow"
    CUSTOM = "custom"
    NET_WORTH = "net_worth"
    SPENDING = "spending"

    def __str__(self) -> str:
        return str(self.value)

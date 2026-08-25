from enum import Enum


class ReportTypeEnum(str, Enum):
    CASH_FLOW = "cash_flow"
    CASH_FLOW_SANKEY = "cash_flow_sankey"
    CUSTOM = "custom"
    NET_WORTH = "net_worth"
    NET_WORTH_SERIES = "net_worth_series"
    SPENDING = "spending"

    def __str__(self) -> str:
        return str(self.value)

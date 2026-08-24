from enum import Enum


class ImportJobFormatEnum(str, Enum):
    ACTUAL = "actual"
    CAMT053 = "camt053"
    CSV = "csv"
    FIREFLY3 = "firefly3"
    NYNAB = "nynab"
    OFX = "ofx"
    QFX = "qfx"
    QIF = "qif"
    YNAB4 = "ynab4"

    def __str__(self) -> str:
        return str(self.value)

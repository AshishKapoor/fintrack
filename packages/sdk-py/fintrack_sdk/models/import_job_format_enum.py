from enum import Enum


class ImportJobFormatEnum(str, Enum):
    CAMT053 = "camt053"
    CSV = "csv"
    NYNAB = "nynab"
    OFX = "ofx"
    QFX = "qfx"
    QIF = "qif"
    YNAB4 = "ynab4"

    def __str__(self) -> str:
        return str(self.value)

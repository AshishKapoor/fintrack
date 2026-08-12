"""Money as a value object: integer minor units plus an ISO 4217 currency.

This module is deliberately framework-free - no Django imports - because it is
the seed of a future standalone ledger-core package (strategy memo §6,
issue #48). Everything financial that can be represented here should be, so the
arithmetic rules live in exactly one place.

Why integer minor units rather than Decimal columns:

- Decimal invites arithmetic in whatever layer happens to hold the value, with
  whatever rounding that layer defaults to. An integer count of cents cannot be
  half a cent.
- Different currencies have different exponents. JPY has no minor unit, KWD has
  three. Code that assumes two decimal places is wrong in ~30 countries; here
  the exponent travels with the value.
- Cross-currency arithmetic becomes a type error at the boundary instead of a
  silent bug: Money(GBP) + Money(USD) raises.

Nothing in this module rounds implicitly. Conversions from Decimal reject
values with more precision than the currency carries, and splitting an amount
uses largest-remainder allocation so the parts always sum exactly to the whole.
"""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from decimal import ROUND_HALF_EVEN, Decimal, InvalidOperation

# ISO 4217 minor-unit exponents. 2 is the default; only the exceptions are
# listed. Sources: ISO 4217 amendment list.
_EXPONENT_EXCEPTIONS = {
    # Zero-decimal currencies
    "BIF": 0, "CLP": 0, "DJF": 0, "GNF": 0, "ISK": 0, "JPY": 0, "KMF": 0,
    "KRW": 0, "PYG": 0, "RWF": 0, "UGX": 0, "VND": 0, "VUV": 0, "XAF": 0,
    "XOF": 0, "XPF": 0,
    # Three-decimal currencies
    "BHD": 3, "IQD": 3, "JOD": 3, "KWD": 3, "LYD": 3, "OMR": 3, "TND": 3,
}

DEFAULT_EXPONENT = 2


def currency_exponent(currency: str) -> int:
    """Number of minor-unit digits for an ISO 4217 currency code."""
    return _EXPONENT_EXCEPTIONS.get(currency.upper(), DEFAULT_EXPONENT)


class CurrencyMismatch(TypeError):
    """Raised when arithmetic mixes two different currencies."""


class PrecisionError(ValueError):
    """Raised when a decimal has more precision than the currency carries."""


@dataclass(frozen=True, slots=True)
class Money:
    """An exact amount of one currency, counted in minor units.

    Money(1234, "GBP") is £12.34. Money(1234, "JPY") is ¥1234.
    Instances are immutable and hashable; arithmetic returns new instances.
    """

    minor: int
    currency: str

    def __post_init__(self):
        if not isinstance(self.minor, int) or isinstance(self.minor, bool):
            raise TypeError(f"minor units must be an int, got {type(self.minor).__name__}")
        code = self.currency.upper()
        if len(code) != 3 or not code.isalpha():
            raise ValueError(f"not an ISO 4217 currency code: {self.currency!r}")
        object.__setattr__(self, "currency", code)

    # ---- Constructors -----------------------------------------------------

    @classmethod
    def from_decimal(cls, amount: Decimal | str, currency: str) -> Money:
        """Exact conversion. Rejects excess precision rather than rounding.

        Money.from_decimal("12.34", "GBP") -> 1234 minor
        Money.from_decimal("12.345", "GBP") -> PrecisionError
        Use `from_decimal_rounded` when rounding is the caller's explicit intent.
        """
        exponent = currency_exponent(currency)
        try:
            quantised = Decimal(amount).scaleb(exponent)
        except InvalidOperation as exc:
            raise ValueError(f"not a decimal amount: {amount!r}") from exc
        if quantised != quantised.to_integral_value():
            raise PrecisionError(
                f"{amount} has more precision than {currency.upper()} carries "
                f"({exponent} minor digits)"
            )
        return cls(int(quantised), currency)

    @classmethod
    def from_decimal_rounded(cls, amount: Decimal | str, currency: str) -> Money:
        """Convert with banker's rounding, for external data that may be dirty."""
        exponent = currency_exponent(currency)
        quantised = Decimal(amount).scaleb(exponent).quantize(
            Decimal(1), rounding=ROUND_HALF_EVEN
        )
        return cls(int(quantised), currency)

    @classmethod
    def zero(cls, currency: str) -> Money:
        return cls(0, currency)

    # ---- Representation ---------------------------------------------------

    @property
    def decimal(self) -> Decimal:
        return Decimal(self.minor).scaleb(-currency_exponent(self.currency))

    def __str__(self) -> str:
        exponent = currency_exponent(self.currency)
        if exponent == 0:
            return f"{self.minor} {self.currency}"
        return f"{self.decimal:.{exponent}f} {self.currency}"

    # ---- Arithmetic (same-currency only) ----------------------------------

    def _check(self, other: Money) -> None:
        if not isinstance(other, Money):
            raise TypeError(f"cannot combine Money with {type(other).__name__}")
        if other.currency != self.currency:
            raise CurrencyMismatch(
                f"cannot combine {self.currency} with {other.currency}; "
                "convert explicitly first"
            )

    def __add__(self, other: Money) -> Money:
        self._check(other)
        return Money(self.minor + other.minor, self.currency)

    def __sub__(self, other: Money) -> Money:
        self._check(other)
        return Money(self.minor - other.minor, self.currency)

    def __neg__(self) -> Money:
        return Money(-self.minor, self.currency)

    def __abs__(self) -> Money:
        return Money(abs(self.minor), self.currency)

    def __bool__(self) -> bool:
        return self.minor != 0

    def __lt__(self, other: Money) -> bool:
        self._check(other)
        return self.minor < other.minor

    def __le__(self, other: Money) -> bool:
        self._check(other)
        return self.minor <= other.minor

    def __gt__(self, other: Money) -> bool:
        self._check(other)
        return self.minor > other.minor

    def __ge__(self, other: Money) -> bool:
        self._check(other)
        return self.minor >= other.minor

    def __mul__(self, factor: int) -> Money:
        if not isinstance(factor, int) or isinstance(factor, bool):
            raise TypeError(
                "Money can only be multiplied by an int; for proportional splits "
                "use allocate(), which never loses a minor unit"
            )
        return Money(self.minor * factor, self.currency)

    __rmul__ = __mul__

    # ---- Allocation -------------------------------------------------------

    def allocate(self, weights: Sequence[int]) -> list[Money]:
        """Split by integer weights with largest-remainder distribution.

        The parts always sum exactly to self - no minor unit is ever created
        or lost. Ten pounds across [1, 1, 1]:

            Money(1000, "GBP").allocate([1, 1, 1])
            -> [334, 333, 333]  (not 333.33... anywhere)

        Remainders go to the largest fractional parts first; ties break toward
        earlier positions, so the result is deterministic.
        """
        if not weights:
            raise ValueError("weights must be non-empty")
        if any((not isinstance(w, int)) or isinstance(w, bool) or w < 0 for w in weights):
            raise ValueError("weights must be non-negative ints")
        total_weight = sum(weights)
        if total_weight == 0:
            raise ValueError("weights must not all be zero")

        sign = -1 if self.minor < 0 else 1
        magnitude = abs(self.minor)

        base_parts, fractions = [], []
        for index, weight in enumerate(weights):
            exact = magnitude * weight
            base, remainder = divmod(exact, total_weight)
            base_parts.append(base)
            fractions.append((-(remainder), index))  # most-owed first, stable

        shortfall = magnitude - sum(base_parts)
        for _, index in sorted(fractions)[:shortfall]:
            base_parts[index] += 1

        return [Money(sign * part, self.currency) for part in base_parts]

    def split(self, parts: int) -> list[Money]:
        """Split into `parts` near-equal pieces. Sugar for allocate([1] * parts)."""
        if parts < 1:
            raise ValueError("parts must be >= 1")
        return self.allocate([1] * parts)


def total(items: Iterable[Money], currency: str | None = None) -> Money:
    """Sum an iterable of Money, which may be empty if `currency` is given."""
    result: Money | None = None
    for item in items:
        result = item if result is None else result + item
    if result is None:
        if currency is None:
            raise ValueError("cannot sum an empty iterable without a currency")
        return Money.zero(currency)
    return result

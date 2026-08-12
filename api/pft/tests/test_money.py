"""Property tests for the Money value object.

The claims worth proving, per strategy memo §6:

- conversion is exact: Decimal -> minor units -> Decimal round-trips
- excess precision is an error, never a silent rounding
- cross-currency arithmetic is a type error
- allocation never creates or destroys a minor unit, for any amount and any
  weights - the defect class where "£10 across 3 envelopes" leaks a penny
"""

from decimal import Decimal
from unittest import TestCase

from hypothesis import given, settings
from hypothesis import strategies as st

from pft.money import (
    CurrencyMismatch,
    Money,
    PrecisionError,
    currency_exponent,
    total,
)

MINOR = st.integers(min_value=-10**12, max_value=10**12)
CURRENCIES = st.sampled_from(["GBP", "USD", "EUR", "INR", "JPY", "KWD", "CLP", "BHD"])
WEIGHTS = st.lists(st.integers(min_value=0, max_value=1000), min_size=1, max_size=12).filter(
    lambda ws: sum(ws) > 0
)


class ConstructionTests(TestCase):
    def test_exact_decimal_conversion(self):
        self.assertEqual(Money.from_decimal("12.34", "GBP").minor, 1234)
        self.assertEqual(Money.from_decimal("1234", "JPY").minor, 1234)
        self.assertEqual(Money.from_decimal("1.234", "KWD").minor, 1234)

    def test_excess_precision_is_an_error_not_a_rounding(self):
        with self.assertRaises(PrecisionError):
            Money.from_decimal("12.345", "GBP")
        with self.assertRaises(PrecisionError):
            Money.from_decimal("1.5", "JPY")

    def test_explicit_rounding_constructor_exists_for_dirty_data(self):
        self.assertEqual(Money.from_decimal_rounded("12.345", "GBP").minor, 1234)
        self.assertEqual(Money.from_decimal_rounded("12.355", "GBP").minor, 1236)

    def test_currency_code_is_validated_and_normalised(self):
        self.assertEqual(Money(1, "gbp").currency, "GBP")
        with self.assertRaises(ValueError):
            Money(1, "POUNDS")
        with self.assertRaises(TypeError):
            Money(Decimal("1"), "GBP")

    def test_known_exponents(self):
        self.assertEqual(currency_exponent("GBP"), 2)
        self.assertEqual(currency_exponent("JPY"), 0)
        self.assertEqual(currency_exponent("KWD"), 3)

    @settings(max_examples=200)
    @given(minor=MINOR, currency=CURRENCIES)
    def test_decimal_round_trip(self, minor, currency):
        money = Money(minor, currency)
        self.assertEqual(Money.from_decimal(money.decimal, currency), money)


class ArithmeticTests(TestCase):
    def test_cross_currency_addition_raises(self):
        with self.assertRaises(CurrencyMismatch):
            Money(100, "GBP") + Money(100, "USD")
        with self.assertRaises(CurrencyMismatch):
            _ = Money(100, "GBP") < Money(100, "USD")

    def test_adding_a_bare_number_raises(self):
        with self.assertRaises(TypeError):
            Money(100, "GBP") + 5  # type: ignore[operator]

    def test_float_multiplication_is_rejected(self):
        with self.assertRaises(TypeError):
            Money(100, "GBP") * 0.5  # type: ignore[operator]

    @settings(max_examples=200)
    @given(a=MINOR, b=MINOR, currency=CURRENCIES)
    def test_addition_matches_integer_addition(self, a, b, currency):
        self.assertEqual((Money(a, currency) + Money(b, currency)).minor, a + b)

    @settings(max_examples=100)
    @given(minor=MINOR, currency=CURRENCIES)
    def test_negation_is_involutive(self, minor, currency):
        money = Money(minor, currency)
        self.assertEqual(money.__neg__().__neg__(), money)

    def test_total_of_empty_needs_a_currency(self):
        self.assertEqual(total([], currency="GBP"), Money.zero("GBP"))
        with self.assertRaises(ValueError):
            total([])


class AllocationTests(TestCase):
    def test_the_ten_pound_example(self):
        parts = Money(1000, "GBP").allocate([1, 1, 1])
        self.assertEqual([p.minor for p in parts], [334, 333, 333])

    def test_zero_weight_gets_nothing(self):
        parts = Money(100, "GBP").allocate([1, 0, 1])
        self.assertEqual([p.minor for p in parts], [50, 0, 50])

    def test_all_zero_weights_rejected(self):
        with self.assertRaises(ValueError):
            Money(100, "GBP").allocate([0, 0])

    @settings(max_examples=300)
    @given(minor=MINOR, currency=CURRENCIES, weights=WEIGHTS)
    def test_allocation_conserves_every_minor_unit(self, minor, currency, weights):
        money = Money(minor, currency)
        parts = money.allocate(weights)
        self.assertEqual(sum(p.minor for p in parts), minor)
        self.assertEqual(len(parts), len(weights))

    @settings(max_examples=200)
    @given(minor=MINOR, currency=CURRENCIES, parts=st.integers(min_value=1, max_value=24))
    def test_split_parts_differ_by_at_most_one_minor_unit(self, minor, currency, parts):
        pieces = Money(minor, currency).split(parts)
        self.assertEqual(sum(p.minor for p in pieces), minor)
        magnitudes = [p.minor for p in pieces]
        self.assertLessEqual(max(magnitudes) - min(magnitudes), 1)

    @settings(max_examples=200)
    @given(minor=MINOR, currency=CURRENCIES, weights=WEIGHTS)
    def test_allocation_is_deterministic(self, minor, currency, weights):
        money = Money(minor, currency)
        self.assertEqual(money.allocate(weights), money.allocate(weights))

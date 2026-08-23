"""Tests for DATABASE_URL support (app/settings/base.py).

Render, Railway and Heroku-style platforms hand over one DATABASE_URL rather
than discrete DATABASE_NAME/USER/PASSWORD/HOST/PORT - this is what lets
deploy/render.yaml wire up Render Postgres without a settings change per
target platform.
"""

from unittest import mock

from django.test import SimpleTestCase

from app.settings.base import database_config_from_env


class DatabaseUrlConfigTests(SimpleTestCase):
    def test_parses_a_full_database_url(self):
        with mock.patch.dict(
            "os.environ",
            {
                "DATABASE_URL": "postgresql://appuser:s3cret@db.example.com:6543/fintrack_prod"
            },
            clear=False,
        ):
            config = database_config_from_env()

        self.assertEqual(config["ENGINE"], "django.db.backends.postgresql")
        self.assertEqual(config["NAME"], "fintrack_prod")
        self.assertEqual(config["USER"], "appuser")
        self.assertEqual(config["PASSWORD"], "s3cret")
        self.assertEqual(config["HOST"], "db.example.com")
        self.assertEqual(config["PORT"], "6543")

    def test_defaults_the_port_when_the_url_omits_it(self):
        with mock.patch.dict(
            "os.environ",
            {
                "DATABASE_URL": "postgresql://appuser:s3cret@db.example.com/fintrack_prod"
            },
            clear=False,
        ):
            config = database_config_from_env()

        self.assertEqual(config["PORT"], "5432")

    def test_falls_back_to_discrete_vars_without_a_database_url(self):
        # clear=True: a real DATABASE_URL in the outer environment (this test
        # suite's own DB connection was already established at import time,
        # before this test ever runs, so clearing it here is safe) must not
        # leak in and hide a regression in the fallback path.
        env = {
            "DATABASE_NAME": "fintrack",
            "DATABASE_USER": "fintrack",
            "DATABASE_PASSWORD": "hunter2",
            "DATABASE_HOST": "db",
            "DATABASE_PORT": "5432",
        }
        with mock.patch.dict("os.environ", env, clear=True):
            config = database_config_from_env()

        self.assertEqual(config["NAME"], "fintrack")
        self.assertEqual(config["HOST"], "db")

    def test_falls_back_to_postgres_prefixed_vars(self):
        env = {
            "POSTGRES_DB": "fintrack",
            "POSTGRES_USER": "fintrack",
            "POSTGRES_PASSWORD": "hunter2",
        }
        with mock.patch.dict("os.environ", env, clear=True):
            config = database_config_from_env()

        self.assertEqual(config["NAME"], "fintrack")
        self.assertEqual(config["USER"], "fintrack")
        self.assertEqual(config["PASSWORD"], "hunter2")
        self.assertEqual(config["HOST"], "localhost")
        self.assertEqual(config["PORT"], "5432")

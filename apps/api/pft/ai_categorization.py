"""Opt-in payee -> category suggestions via an LLM - ROADMAP.md Phase 3.

Complements PayeeViewSet.suggested_category's existing history-based lookup
(finance_views.py) rather than replacing it: that function stays the primary
suggestion, and only calls into suggest_category_via_ai as a fallback when a
payee has no categorized history yet. Off by default, per budget file (see
AICategorizationSettings), and never required - every call site must keep
working exactly as it does today when this is disabled or unconfigured.

Both supported providers speak the same OpenAI-compatible chat-completions
shape - Ollama has documented compatibility with it at /v1/chat/completions,
the same path OpenAI itself uses - so one request/response code path serves
both; only the base URL, default model, and whether an Authorization header
is sent differ per provider.

Like every outbound channel in pft/notifications.py, a call here is
best-effort and must never raise: a slow or broken AI provider must never
break transaction entry. Failures are logged and treated as "no suggestion",
exactly like a payee with no history today.
"""

import json
import logging
import urllib.error
import urllib.request

from .crypto import DecryptionError, decrypt_json
from .models import AICategorizationSettings
from .notifications import is_safe_local_service_url, is_safe_outbound_url

logger = logging.getLogger(__name__)

HTTP_TIMEOUT_SECONDS = 15

DEFAULT_BASE_URL = {
    AICategorizationSettings.PROVIDER_OPENAI_COMPATIBLE: "https://api.openai.com/v1",
    AICategorizationSettings.PROVIDER_OLLAMA: "http://localhost:11434/v1",
}
DEFAULT_MODEL = {
    AICategorizationSettings.PROVIDER_OPENAI_COMPATIBLE: "gpt-4o-mini",
    AICategorizationSettings.PROVIDER_OLLAMA: "llama3.2",
}

_NONE_SENTINEL = "NONE"

_SYSTEM_PROMPT = (
    "You categorize personal finance transactions. Given a payee name and a "
    "list of allowed categories, reply with the single best-matching category "
    f'name exactly as given, and nothing else. If none fit, reply "{_NONE_SENTINEL}".'
)


def _resolve_base_url(settings_obj: AICategorizationSettings) -> str:
    return settings_obj.base_url.strip() or DEFAULT_BASE_URL[settings_obj.provider]


def _resolve_model(settings_obj: AICategorizationSettings) -> str:
    return settings_obj.model_name.strip() or DEFAULT_MODEL[settings_obj.provider]


def _resolve_api_key(settings_obj: AICategorizationSettings) -> str | None:
    if not settings_obj.encrypted_api_key:
        return None
    try:
        return decrypt_json(settings_obj.encrypted_api_key).get("api_key") or None
    except DecryptionError as exc:
        logger.warning(
            "AI categorization API key for budget file %s could not be decrypted: %s",
            settings_obj.budget_file_id,
            exc,
        )
        return None


def suggest_category_via_ai(
    settings_obj: AICategorizationSettings, payee_name: str, candidates: list[dict]
) -> dict | None:
    """Ask the configured LLM to pick one of `candidates` ({id, name} dicts)
    for `payee_name`. Returns the matching candidate dict, or None on any
    failure, any "no good match" response, or any response that doesn't
    exactly name one of the candidates - the model's raw output is never
    trusted as a category id or name on its own.
    """
    if not settings_obj.is_enabled or not candidates:
        return None

    base_url = _resolve_base_url(settings_obj)
    url = f"{base_url.rstrip('/')}/chat/completions"

    is_ollama = settings_obj.provider == AICategorizationSettings.PROVIDER_OLLAMA
    safe = is_safe_local_service_url(url) if is_ollama else is_safe_outbound_url(url)
    if not safe:
        logger.warning(
            "AI categorization base URL for budget file %s is not a safe outbound target",
            settings_obj.budget_file_id,
        )
        return None

    api_key = _resolve_api_key(settings_obj)
    if not is_ollama and not api_key:
        # A cloud provider with no key configured is just "not set up yet" -
        # not an error worth logging.
        return None

    category_names = [candidate["name"] for candidate in candidates]
    user_prompt = f'Payee: "{payee_name}"\nCategories: {", ".join(category_names)}\nBest category:'
    payload = json.dumps(
        {
            "model": _resolve_model(settings_obj),
            "temperature": 0,
            "messages": [
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
        }
    ).encode("utf-8")

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    request = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=HTTP_TIMEOUT_SECONDS) as response:
            body = json.loads(response.read().decode("utf-8"))
        content = body["choices"][0]["message"]["content"].strip()
    except (
        urllib.error.URLError,
        OSError,
        ValueError,
        KeyError,
        IndexError,
        TypeError,
    ) as exc:
        logger.warning(
            "AI categorization request for budget file %s failed: %s",
            settings_obj.budget_file_id,
            exc,
        )
        return None

    if content.strip().upper() == _NONE_SENTINEL:
        return None
    for candidate in candidates:
        if candidate["name"].strip().lower() == content.strip().lower():
            return candidate
    logger.info(
        "AI categorization for budget file %s returned an unrecognized category name - ignored",
        settings_obj.budget_file_id,
    )
    return None


def test_connection(settings_obj: AICategorizationSettings) -> dict:
    """Fire a trivial real request now, for the settings UI's "test" button -
    bypasses is_enabled (you're testing before turning it on) but not the
    SSRF guard or the same failure handling as a real call.
    """
    probe_candidates = [{"id": 0, "name": "Groceries"}, {"id": 1, "name": "Rent"}]
    enabled_backup = settings_obj.is_enabled
    settings_obj.is_enabled = True
    try:
        result = suggest_category_via_ai(settings_obj, "Test Payee", probe_candidates)
    finally:
        settings_obj.is_enabled = enabled_backup
    if result is None:
        return {
            "ok": False,
            "detail": "No response, or the provider couldn't be reached.",
        }
    return {
        "ok": True,
        "detail": f'Reached the provider - it replied with "{result["name"]}".',
    }

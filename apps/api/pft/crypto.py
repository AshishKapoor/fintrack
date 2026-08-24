"""Symmetric encryption for secrets FinTrack must be able to read back itself.

EncryptedBackupBundle's ciphertext is zero-knowledge - encrypted in the
browser, opaque to the server, keyed by a passphrase only the user holds.
Bank sync credentials (pft/bank_sync.py's SyncConnection.secret_data) are the
opposite case: an unattended Celery beat sweep (tasks.sync_bank_connections_task)
has to present them to GoCardless/SimpleFIN with nobody around to type a
passphrase, so a server-held key is unavoidable. This is protection against a
database-only compromise (a stolen dump, a misconfigured backup target), not
a full-server one - anyone with code execution on the server can always read
settings.FINTRACK_SYNC_ENCRYPTION_KEY and decrypt.
"""

import base64
import hashlib
import json

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings


class DecryptionError(Exception):
    pass


def _fernet() -> Fernet:
    # Fernet requires a url-safe base64-encoded 32-byte key. Hashing whatever
    # string is configured into one means self-hosters do not have to
    # generate and separately manage a second secret in the shape Fernet
    # wants - see FINTRACK_SYNC_ENCRYPTION_KEY in app/settings/base.py.
    key = settings.FINTRACK_SYNC_ENCRYPTION_KEY
    digest = hashlib.sha256(key.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_json(payload: dict) -> str:
    return _fernet().encrypt(json.dumps(payload).encode("utf-8")).decode("ascii")


def decrypt_json(token: str) -> dict:
    if not token:
        return {}
    try:
        raw = _fernet().decrypt(token.encode("ascii"))
    except InvalidToken as exc:
        raise DecryptionError(
            "Stored bank sync credentials could not be decrypted - "
            "FINTRACK_SYNC_ENCRYPTION_KEY (or SECRET_KEY, if that key was "
            "never set) may have changed since they were saved."
        ) from exc
    return json.loads(raw.decode("utf-8"))

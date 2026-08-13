# fintrack-sdk

Typed Python client for the [FinTrack](https://github.com/AshishKapoor/fintrack)
API, generated from the server's OpenAPI schema with
[openapi-python-client](https://github.com/openapi-generators/openapi-python-client).

## Install

```bash
pip install fintrack-sdk
```

## Use

```python
from fintrack_sdk import AuthenticatedClient, Client
from fintrack_sdk.api.token import token_create
from fintrack_sdk.api.v1 import v1_me_retrieve, v1_finance_transactions_list
from fintrack_sdk.models import TokenObtainPair

base = "https://fintrack.example.com"

# Read-only response fields (access/refresh) are required by the generated
# constructor; pass placeholders on requests - the server ignores them.
tokens = token_create.sync(
    client=Client(base_url=base),
    body=TokenObtainPair(email="you@example.com", password="...", access="", refresh=""),
)

client = AuthenticatedClient(base_url=base, token=tokens.access)
page = v1_finance_transactions_list.sync(client=client, page_size=50)
for tx in page.results:
    print(tx.transaction_date, tx.memo, [(l.category_name, l.amount) for l in tx.posting_lines])
```

Every operation has `sync`, `sync_detailed`, `asyncio` and `asyncio_detailed`
variants; `*_detailed` returns the status code and parsed body.

## Regenerating

```bash
uvx openapi-python-client generate \
  --path ../../apps/web/schema/pft.yaml \
  --output-path fintrack_sdk --meta none --overwrite
python3 post_generate.py
```

`post_generate.py` applies two mechanical fixes to the generator's output
(missing `Unset` imports, and response parsing of write-only request fields);
it is idempotent and CI enforces that the committed client matches
schema + generation + patch.

CI keeps the schema in lockstep with the backend, and the committed client in
lockstep with the schema.

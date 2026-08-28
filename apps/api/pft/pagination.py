"""The one pagination class, applied to every list endpoint.

Before this, only `/api/v1/finance/transactions/` and `/api/v1/audit-log/`
paginated. Everything else returned a bare JSON array, which is fine right up
until somebody's ledger has 40,000 postings in it and a single GET tries to
serialize all of them - and the client, having no idea there was more, shows
whatever arrived as if it were everything. ROADMAP.md Phase 4.

Two consequences worth being explicit about:

- Every list response is now the envelope `{count, next, previous, results}`.
  That is a breaking change for anything that indexed the response directly,
  which is why it lands before v1.0.0.
- A caller that wants everything has to follow `next`. `page_size` is
  adjustable up to `max_page_size` for callers that would rather make one
  larger request than several small ones.
"""

from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """Page-number pagination with an opt-in, capped page size.

    50 rather than something larger because the heaviest list in the app -
    ledger transactions with their postings inlined - is what sets the cost of
    a page, and it is the list people scroll. `max_page_size` exists so a
    script syncing a whole budget file does not have to make 800 requests, and
    is capped so it cannot ask for the whole table either.
    """

    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 500

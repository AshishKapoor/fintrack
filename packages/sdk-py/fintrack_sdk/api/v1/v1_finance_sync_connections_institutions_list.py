from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.paginated_bank_sync_institution_list import (
    PaginatedBankSyncInstitutionList,
)
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    page: int | Unset = UNSET,
    page_size: int | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["page"] = page

    params["page_size"] = page_size

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/v1/finance/sync-connections/institutions/",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> PaginatedBankSyncInstitutionList | None:
    if response.status_code == 200:
        response_200 = PaginatedBankSyncInstitutionList.from_dict(response.json())

        return response_200

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[PaginatedBankSyncInstitutionList]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    page: int | Unset = UNSET,
    page_size: int | Unset = UNSET,
) -> Response[PaginatedBankSyncInstitutionList]:
    r"""Bank sync connections - ROADMAP.md Phase 2. See pft/bank_sync.py for
    the provider-agnostic contract and pft/bank_sync_gocardless.py /
    bank_sync_simplefin.py for the two shipped providers.

    Every mutating action here is already unreachable on a demo instance:
    DemoModeMiddleware blocks all non-GET requests outside a small allowlist
    that does not include any of these, so bank sync needs no separate demo
    guard - the same \"guarded by construction\" property notifications and
    imports already get for free.

    Args:
        page (int | Unset):
        page_size (int | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[PaginatedBankSyncInstitutionList]
    """

    kwargs = _get_kwargs(
        page=page,
        page_size=page_size,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    page: int | Unset = UNSET,
    page_size: int | Unset = UNSET,
) -> PaginatedBankSyncInstitutionList | None:
    r"""Bank sync connections - ROADMAP.md Phase 2. See pft/bank_sync.py for
    the provider-agnostic contract and pft/bank_sync_gocardless.py /
    bank_sync_simplefin.py for the two shipped providers.

    Every mutating action here is already unreachable on a demo instance:
    DemoModeMiddleware blocks all non-GET requests outside a small allowlist
    that does not include any of these, so bank sync needs no separate demo
    guard - the same \"guarded by construction\" property notifications and
    imports already get for free.

    Args:
        page (int | Unset):
        page_size (int | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        PaginatedBankSyncInstitutionList
    """

    return sync_detailed(
        client=client,
        page=page,
        page_size=page_size,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    page: int | Unset = UNSET,
    page_size: int | Unset = UNSET,
) -> Response[PaginatedBankSyncInstitutionList]:
    r"""Bank sync connections - ROADMAP.md Phase 2. See pft/bank_sync.py for
    the provider-agnostic contract and pft/bank_sync_gocardless.py /
    bank_sync_simplefin.py for the two shipped providers.

    Every mutating action here is already unreachable on a demo instance:
    DemoModeMiddleware blocks all non-GET requests outside a small allowlist
    that does not include any of these, so bank sync needs no separate demo
    guard - the same \"guarded by construction\" property notifications and
    imports already get for free.

    Args:
        page (int | Unset):
        page_size (int | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[PaginatedBankSyncInstitutionList]
    """

    kwargs = _get_kwargs(
        page=page,
        page_size=page_size,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    page: int | Unset = UNSET,
    page_size: int | Unset = UNSET,
) -> PaginatedBankSyncInstitutionList | None:
    r"""Bank sync connections - ROADMAP.md Phase 2. See pft/bank_sync.py for
    the provider-agnostic contract and pft/bank_sync_gocardless.py /
    bank_sync_simplefin.py for the two shipped providers.

    Every mutating action here is already unreachable on a demo instance:
    DemoModeMiddleware blocks all non-GET requests outside a small allowlist
    that does not include any of these, so bank sync needs no separate demo
    guard - the same \"guarded by construction\" property notifications and
    imports already get for free.

    Args:
        page (int | Unset):
        page_size (int | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        PaginatedBankSyncInstitutionList
    """

    return (
        await asyncio_detailed(
            client=client,
            page=page,
            page_size=page_size,
        )
    ).parsed

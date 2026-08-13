from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.paginated_transaction_list import PaginatedTransactionList
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    ordering: str | Unset = UNSET,
    page: int | Unset = UNSET,
    search: str | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["ordering"] = ordering

    params["page"] = page

    params["search"] = search

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/v1/transactions/",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> PaginatedTransactionList | None:
    if response.status_code == 200:
        response_200 = PaginatedTransactionList.from_dict(response.json())

        return response_200

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[PaginatedTransactionList]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    ordering: str | Unset = UNSET,
    page: int | Unset = UNSET,
    search: str | Unset = UNSET,
) -> Response[PaginatedTransactionList]:
    """Deprecated legacy resource; use /api/v1/finance/ instead.

    Args:
        ordering (str | Unset):
        page (int | Unset):
        search (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[PaginatedTransactionList]
    """

    kwargs = _get_kwargs(
        ordering=ordering,
        page=page,
        search=search,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient,
    ordering: str | Unset = UNSET,
    page: int | Unset = UNSET,
    search: str | Unset = UNSET,
) -> PaginatedTransactionList | None:
    """Deprecated legacy resource; use /api/v1/finance/ instead.

    Args:
        ordering (str | Unset):
        page (int | Unset):
        search (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        PaginatedTransactionList
    """

    return sync_detailed(
        client=client,
        ordering=ordering,
        page=page,
        search=search,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    ordering: str | Unset = UNSET,
    page: int | Unset = UNSET,
    search: str | Unset = UNSET,
) -> Response[PaginatedTransactionList]:
    """Deprecated legacy resource; use /api/v1/finance/ instead.

    Args:
        ordering (str | Unset):
        page (int | Unset):
        search (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[PaginatedTransactionList]
    """

    kwargs = _get_kwargs(
        ordering=ordering,
        page=page,
        search=search,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient,
    ordering: str | Unset = UNSET,
    page: int | Unset = UNSET,
    search: str | Unset = UNSET,
) -> PaginatedTransactionList | None:
    """Deprecated legacy resource; use /api/v1/finance/ instead.

    Args:
        ordering (str | Unset):
        page (int | Unset):
        search (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        PaginatedTransactionList
    """

    return (
        await asyncio_detailed(
            client=client,
            ordering=ordering,
            page=page,
            search=search,
        )
    ).parsed

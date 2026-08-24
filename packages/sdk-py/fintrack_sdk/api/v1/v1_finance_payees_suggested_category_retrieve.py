from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.suggested_category import SuggestedCategory
from ...types import Response


def _get_kwargs(
    id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/api/v1/finance/payees/{id}/suggested-category/".format(
            id=quote(str(id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> SuggestedCategory | None:
    if response.status_code == 200:
        response_200 = SuggestedCategory.from_dict(response.json())

        return response_200

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[SuggestedCategory]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    id: str,
    *,
    client: AuthenticatedClient,
) -> Response[SuggestedCategory]:
    """The category most often used with this payee - powers quick-add's
    amount -> payee -> (suggested) category -> done flow (ROADMAP.md
    Phase 1). Ties broken by whichever was used most recently, so a
    payee's habits can drift over time instead of getting stuck on
    whatever was most common historically.

    Args:
        id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[SuggestedCategory]
    """

    kwargs = _get_kwargs(
        id=id,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    id: str,
    *,
    client: AuthenticatedClient,
) -> SuggestedCategory | None:
    """The category most often used with this payee - powers quick-add's
    amount -> payee -> (suggested) category -> done flow (ROADMAP.md
    Phase 1). Ties broken by whichever was used most recently, so a
    payee's habits can drift over time instead of getting stuck on
    whatever was most common historically.

    Args:
        id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        SuggestedCategory
    """

    return sync_detailed(
        id=id,
        client=client,
    ).parsed


async def asyncio_detailed(
    id: str,
    *,
    client: AuthenticatedClient,
) -> Response[SuggestedCategory]:
    """The category most often used with this payee - powers quick-add's
    amount -> payee -> (suggested) category -> done flow (ROADMAP.md
    Phase 1). Ties broken by whichever was used most recently, so a
    payee's habits can drift over time instead of getting stuck on
    whatever was most common historically.

    Args:
        id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[SuggestedCategory]
    """

    kwargs = _get_kwargs(
        id=id,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    id: str,
    *,
    client: AuthenticatedClient,
) -> SuggestedCategory | None:
    """The category most often used with this payee - powers quick-add's
    amount -> payee -> (suggested) category -> done flow (ROADMAP.md
    Phase 1). Ties broken by whichever was used most recently, so a
    payee's habits can drift over time instead of getting stuck on
    whatever was most common historically.

    Args:
        id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        SuggestedCategory
    """

    return (
        await asyncio_detailed(
            id=id,
            client=client,
        )
    ).parsed

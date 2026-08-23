from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    x_use_refresh_cookie: str | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}
    if not isinstance(x_use_refresh_cookie, Unset):
        headers["X-Use-Refresh-Cookie"] = x_use_refresh_cookie

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/token/logout/",
    }

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Any | None:
    if response.status_code == 200:
        return None

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Any]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient,
    x_use_refresh_cookie: str | Unset = UNSET,
) -> Response[Any]:
    r"""Revoke a refresh token.

    POST {\"refresh\": \"<token>\"} revokes that token; the `pft_refresh` HttpOnly
    cookie is used instead when present. POST {\"all\": true} revokes every
    session for the current user. Either way, any refresh cookie is cleared.

    Args:
        x_use_refresh_cookie (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any]
    """

    kwargs = _get_kwargs(
        x_use_refresh_cookie=x_use_refresh_cookie,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


async def asyncio_detailed(
    *,
    client: AuthenticatedClient,
    x_use_refresh_cookie: str | Unset = UNSET,
) -> Response[Any]:
    r"""Revoke a refresh token.

    POST {\"refresh\": \"<token>\"} revokes that token; the `pft_refresh` HttpOnly
    cookie is used instead when present. POST {\"all\": true} revokes every
    session for the current user. Either way, any refresh cookie is cleared.

    Args:
        x_use_refresh_cookie (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any]
    """

    kwargs = _get_kwargs(
        x_use_refresh_cookie=x_use_refresh_cookie,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)

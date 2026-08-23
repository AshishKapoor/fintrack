from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.token_obtain_pair import TokenObtainPair
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    body: TokenObtainPair,
    x_use_refresh_cookie: str | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}
    if not isinstance(x_use_refresh_cookie, Unset):
        headers["X-Use-Refresh-Cookie"] = x_use_refresh_cookie

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/token/",
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> TokenObtainPair | None:
    if response.status_code == 200:
        response_200 = TokenObtainPair.from_dict(response.json())

        return response_200

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[TokenObtainPair]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: TokenObtainPair,
    x_use_refresh_cookie: str | Unset = UNSET,
) -> Response[TokenObtainPair]:
    """Login, rate limited per IP so the password field cannot be brute forced.

    Browser clients that send `X-Use-Refresh-Cookie` get the refresh token
    back as an HttpOnly cookie instead of in the response body - see
    pft/auth_cookies.py. Everyone else keeps the plain {access, refresh} body.

    Args:
        x_use_refresh_cookie (str | Unset):
        body (TokenObtainPair):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[TokenObtainPair]
    """

    kwargs = _get_kwargs(
        body=body,
        x_use_refresh_cookie=x_use_refresh_cookie,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    body: TokenObtainPair,
    x_use_refresh_cookie: str | Unset = UNSET,
) -> TokenObtainPair | None:
    """Login, rate limited per IP so the password field cannot be brute forced.

    Browser clients that send `X-Use-Refresh-Cookie` get the refresh token
    back as an HttpOnly cookie instead of in the response body - see
    pft/auth_cookies.py. Everyone else keeps the plain {access, refresh} body.

    Args:
        x_use_refresh_cookie (str | Unset):
        body (TokenObtainPair):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        TokenObtainPair
    """

    return sync_detailed(
        client=client,
        body=body,
        x_use_refresh_cookie=x_use_refresh_cookie,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: TokenObtainPair,
    x_use_refresh_cookie: str | Unset = UNSET,
) -> Response[TokenObtainPair]:
    """Login, rate limited per IP so the password field cannot be brute forced.

    Browser clients that send `X-Use-Refresh-Cookie` get the refresh token
    back as an HttpOnly cookie instead of in the response body - see
    pft/auth_cookies.py. Everyone else keeps the plain {access, refresh} body.

    Args:
        x_use_refresh_cookie (str | Unset):
        body (TokenObtainPair):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[TokenObtainPair]
    """

    kwargs = _get_kwargs(
        body=body,
        x_use_refresh_cookie=x_use_refresh_cookie,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    body: TokenObtainPair,
    x_use_refresh_cookie: str | Unset = UNSET,
) -> TokenObtainPair | None:
    """Login, rate limited per IP so the password field cannot be brute forced.

    Browser clients that send `X-Use-Refresh-Cookie` get the refresh token
    back as an HttpOnly cookie instead of in the response body - see
    pft/auth_cookies.py. Everyone else keeps the plain {access, refresh} body.

    Args:
        x_use_refresh_cookie (str | Unset):
        body (TokenObtainPair):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        TokenObtainPair
    """

    return (
        await asyncio_detailed(
            client=client,
            body=body,
            x_use_refresh_cookie=x_use_refresh_cookie,
        )
    ).parsed

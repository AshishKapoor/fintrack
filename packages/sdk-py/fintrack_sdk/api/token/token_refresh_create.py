from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.token_refresh import TokenRefresh
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    body: TokenRefresh,
    x_use_refresh_cookie: str | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}
    if not isinstance(x_use_refresh_cookie, Unset):
        headers["X-Use-Refresh-Cookie"] = x_use_refresh_cookie

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/api/token/refresh/",
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> TokenRefresh | None:
    if response.status_code == 200:
        response_200 = TokenRefresh.from_dict(response.json())

        return response_200

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[TokenRefresh]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: TokenRefresh,
    x_use_refresh_cookie: str | Unset = UNSET,
) -> Response[TokenRefresh]:
    """Refresh an access token.

    Reads the refresh token from the `pft_refresh` HttpOnly cookie when
    present (the browser flow), falling back to a `refresh` field in the body
    for the SDKs and anything else that does not carry cookies. Once a refresh
    token arrives via the cookie, the rotated replacement goes back into a
    cookie too, even if the caller forgets to resend the opt-in header -
    cookie-in implies cookie-out.

    Subclasses SimpleJWT's TokenViewBase (rather than a plain APIView) to
    inherit its `get_authenticate_header` override - without it, DRF coerces
    an invalid-token 401 into a 403 whenever authentication_classes is empty.

    Args:
        x_use_refresh_cookie (str | Unset):
        body (TokenRefresh):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[TokenRefresh]
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
    body: TokenRefresh,
    x_use_refresh_cookie: str | Unset = UNSET,
) -> TokenRefresh | None:
    """Refresh an access token.

    Reads the refresh token from the `pft_refresh` HttpOnly cookie when
    present (the browser flow), falling back to a `refresh` field in the body
    for the SDKs and anything else that does not carry cookies. Once a refresh
    token arrives via the cookie, the rotated replacement goes back into a
    cookie too, even if the caller forgets to resend the opt-in header -
    cookie-in implies cookie-out.

    Subclasses SimpleJWT's TokenViewBase (rather than a plain APIView) to
    inherit its `get_authenticate_header` override - without it, DRF coerces
    an invalid-token 401 into a 403 whenever authentication_classes is empty.

    Args:
        x_use_refresh_cookie (str | Unset):
        body (TokenRefresh):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        TokenRefresh
    """

    return sync_detailed(
        client=client,
        body=body,
        x_use_refresh_cookie=x_use_refresh_cookie,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: TokenRefresh,
    x_use_refresh_cookie: str | Unset = UNSET,
) -> Response[TokenRefresh]:
    """Refresh an access token.

    Reads the refresh token from the `pft_refresh` HttpOnly cookie when
    present (the browser flow), falling back to a `refresh` field in the body
    for the SDKs and anything else that does not carry cookies. Once a refresh
    token arrives via the cookie, the rotated replacement goes back into a
    cookie too, even if the caller forgets to resend the opt-in header -
    cookie-in implies cookie-out.

    Subclasses SimpleJWT's TokenViewBase (rather than a plain APIView) to
    inherit its `get_authenticate_header` override - without it, DRF coerces
    an invalid-token 401 into a 403 whenever authentication_classes is empty.

    Args:
        x_use_refresh_cookie (str | Unset):
        body (TokenRefresh):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[TokenRefresh]
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
    body: TokenRefresh,
    x_use_refresh_cookie: str | Unset = UNSET,
) -> TokenRefresh | None:
    """Refresh an access token.

    Reads the refresh token from the `pft_refresh` HttpOnly cookie when
    present (the browser flow), falling back to a `refresh` field in the body
    for the SDKs and anything else that does not carry cookies. Once a refresh
    token arrives via the cookie, the rotated replacement goes back into a
    cookie too, even if the caller forgets to resend the opt-in header -
    cookie-in implies cookie-out.

    Subclasses SimpleJWT's TokenViewBase (rather than a plain APIView) to
    inherit its `get_authenticate_header` override - without it, DRF coerces
    an invalid-token 401 into a 403 whenever authentication_classes is empty.

    Args:
        x_use_refresh_cookie (str | Unset):
        body (TokenRefresh):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        TokenRefresh
    """

    return (
        await asyncio_detailed(
            client=client,
            body=body,
            x_use_refresh_cookie=x_use_refresh_cookie,
        )
    ).parsed

import os
from dataclasses import dataclass
from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

REGION = os.environ.get("COGNITO_REGION", "us-east-1")
USER_POOL_ID = os.environ["COGNITO_USER_POOL_ID"]
CLIENT_ID = os.environ["COGNITO_CLIENT_ID"]
ISSUER = f"https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}"

bearer_scheme = HTTPBearer(auto_error=False)


@lru_cache(maxsize=1)
def jwk_client() -> PyJWKClient:
    return PyJWKClient(f"{ISSUER}/.well-known/jwks.json", cache_keys=True)


@dataclass(frozen=True)
class User:
    sub: str
    email: str | None
    groups: list[str]


def unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=401,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> User:
    if credentials is None:
        raise unauthorized("Se requiere iniciar sesión.")

    token = credentials.credentials

    try:
        signing_key = jwk_client().get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=CLIENT_ID,
            issuer=ISSUER,
            leeway=30,
            options={"require": ["exp", "iat", "iss", "aud", "sub"]},
        )
    except jwt.PyJWKClientConnectionError as error:
        raise HTTPException(
            status_code=503,
            detail="No fue posible verificar la sesión.",
        ) from error
    except jwt.PyJWTError as error:
        raise unauthorized("La sesión no es válida o ya expiró.") from error

    if claims.get("token_use") != "id":
        raise unauthorized("Tipo de token no válido.")

    groups = claims.get("cognito:groups", [])

    if not isinstance(groups, list):
        groups = []

    return User(
        sub=claims["sub"],
        email=claims.get("email"),
        groups=[str(group) for group in groups],
    )


def require_group(group: str):
    def dependency(user: User = Depends(get_current_user)) -> User:
        if group not in user.groups:
            raise HTTPException(
                status_code=403,
                detail="No tienes permiso para realizar esta acción.",
            )
        return user

    return dependency
"""Shared rate limiter instance. Lives in its own module so both
server.py and routes.py/addon_routes/*.py can import it without a
circular import (server.py imports `router` from routes.py, so routes.py
can't import back from server.py).

Known compatibility issue between slowapi and newer FastAPI/Pydantic versions (v0.1.10 is fairly old — last released for older FastAPI). 
The @limiter.limit(...) decorator wraps your endpoint using *args, **kwargs internally and doesn't fully preserve the original 
parameter annotations the way FastAPI's route-registration step needs — so FastAPI's dependency-injection introspection sometimes 
falls back to treating a body param as a query param when the wrapper obscures its type. This is a documented open issue in the slowapi repo, 
not something specific to your code.

Recommended path: finish removing it everywhere, keep nginx as your rate limiter

Apply the same fix (comment out the decorator, keep request: Request in the signature) to the rest:

@/app/backend/routes.py

@router.post("/auth/logout")
# @limiter.limit("20/minute")
async def logout(request: Request, response: Response, user: dict = Depends(get_current_user)):
    ...

@router.post("/auth/refresh")
# @limiter.limit("20/minute")
async def refresh(request: Request, response: Response):
    ...

@router.post("/auth/register-magic")
# @limiter.limit("5/minute")
async def register_magic(request: Request, payload: MagicRegisterIn, response: Response):
    ...

@router.post("/auth/forgot-password")
# @limiter.limit("3/minute")
async def forgot_password(request: Request, payload: ForgotPasswordIn):
    ...

@router.post("/auth/reset-password")
# @limiter.limit("5/minute")
async def reset_password(request: Request, payload: ResetPasswordIn):
    ...

@router.post("/signup-requests")
# @limiter.limit("3/minute")
async def create_signup_request(request: Request, payload: SignupRequestIn):
    ...

"""

from __future__ import annotations

from slowapi import Limiter


def _rate_limit_key(request):
    """Prefer nginx's X-Real-IP (set from $remote_addr, unspoofable) over
    request.client.host, which would just be nginx's own address since
    it's the direct TCP peer of uvicorn in this deployment."""
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[-1].strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=_rate_limit_key)

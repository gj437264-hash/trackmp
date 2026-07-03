"""Pydantic models for API contracts."""
from __future__ import annotations

from typing import Any, List, Optional

from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ---------- USER ----------
class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: Optional[str] = None
    role: str
    country_code: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None
    deleted_at: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class AdminCreateIn(BaseModel):
    email: EmailStr
    name: str
    password: str


class AdminUpdateIn(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = Field(default=None, pattern="^(admin|user)$")


class MagicRegisterIn(BaseModel):
    token: str
    password: str
    name: Optional[str] = None


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    password: str


# ---------- SIGNUP REQUEST ----------
class SignupRequestIn(BaseModel):
    full_name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    country_code: str = Field(min_length=2, max_length=2)


class SignupDecisionIn(BaseModel):
    note: Optional[str] = None


# ---------- REFERENCE DATA ----------
class CountryIn(BaseModel):
    code: str = Field(min_length=2, max_length=2)
    name: str


class CountryUpdateIn(BaseModel):
    name: Optional[str] = None


class StateIn(BaseModel):
    country_code: str
    name: str


class StateUpdateIn(BaseModel):
    name: Optional[str] = None


class CityIn(BaseModel):
    state_id: str
    name: str


class CityUpdateIn(BaseModel):
    name: Optional[str] = None


class ConstituencyIn(BaseModel):
    state_id: str
    city_id: Optional[str] = None
    name: str


class ConstituencyUpdateIn(BaseModel):
    name: Optional[str] = None
    city_id: Optional[str] = None


# ---------- POLITICIAN ----------
class PoliticianIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    party: Optional[str] = None
    role: Optional[str] = None
    brief_intro: Optional[str] = None
    image_url: Optional[str] = None
    country_code: str
    state_id: Optional[str] = None
    city_id: Optional[str] = None
    constituency_id: Optional[str] = None
    date_of_birth: Optional[str] = None
    education: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class PoliticianUpdateIn(PoliticianIn):
    name: Optional[str] = None
    country_code: Optional[str] = None


class WealthEntryIn(BaseModel):
    year: int
    assets: float = 0.0
    liabilities: float = 0.0
    net_worth: Optional[float] = None
    notes: Optional[str] = None
    source_urls: List[str] = Field(default_factory=list)


class RelativeIn(BaseModel):
    name: str
    relationship: str
    description: Optional[str] = None


# ---------- TRASH ----------
class RestoreIn(BaseModel):
    entity_type: str
    entity_id: str


class PurgeIn(BaseModel):
    entity_type: str
    entity_id: str
    confirm_name: str  # must match entity primary name/label


# ---------- AUDIT ----------
class AuditFilterOut(BaseModel):
    actor: Optional[str] = None
    entity_type: Optional[str] = None
    action: Optional[str] = None
    from_date: Optional[str] = None
    to_date: Optional[str] = None

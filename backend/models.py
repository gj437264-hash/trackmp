"""Pydantic models for API contracts."""
from __future__ import annotations

from typing import Any, List, Optional

from pydantic import BaseModel, EmailStr, Field, ConfigDict

from enum import Enum

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
    captcha_token: str


class GeoScopeRuleIn(BaseModel):
    level: str  # "country" | "state" | "city" | "constituency"
    value: str
    label: Optional[str] = None


class GeoScopeIn(BaseModel):
    unrestricted: bool = True
    rules: List[GeoScopeRuleIn] = Field(default_factory=list)


class AdminCreateIn(BaseModel):
    email: EmailStr
    name: str
    password: str
    permissions: Optional[dict] = None
    geo_scope: Optional[GeoScopeIn] = None


class AdminUpdateIn(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = Field(default=None, pattern="^(admin|user)$")
    permissions: Optional[dict] = None
    geo_scope: Optional[GeoScopeIn] = None


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
    captcha_token: str


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
class SocialLinksIn(BaseModel):
    twitter: Optional[str] = None
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    youtube: Optional[str] = None


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
    profession: Optional[str] = None
    gender: Optional[str] = None
    currency: str = "USD"
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    official_website: Optional[str] = None
    social_links: Optional[SocialLinksIn] = None
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

class PromiseStatus(str, Enum):
    pending = "pending"
    stalled = "stalled"
    in_progress = "in_progress"
    compromised = "compromised"
    delivered = "delivered"
    broken = "broken"

class PromiseLinkIn(BaseModel):
    name: Optional[str] = None
    url: str

class PromiseIn(BaseModel):
    title: str
    description: Optional[str] = ""
    status: PromiseStatus = PromiseStatus.pending
    date_made: Optional[str] = None
    source_url: Optional[str] = None
    source_links: Optional[List[PromiseLinkIn]] = None

class PromiseUpdateIn(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[PromiseStatus] = None
    date_made: Optional[str] = None
    source_url: Optional[str] = None

class PartyHistoryIn(BaseModel):
    party: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    note: Optional[str] = None
    source_url: Optional[str] = None


class PartyHistoryUpdateIn(BaseModel):
    party: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    note: Optional[str] = None
    source_url: Optional[str] = None


class PositionHistoryIn(BaseModel):
    position: str
    country_code: Optional[str] = None
    state_id: Optional[str] = None
    city_id: Optional[str] = None
    constituency_id: Optional[str] = None
    party: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: bool = False
    election_year: Optional[int] = None
    note: Optional[str] = None


class PositionHistoryUpdateIn(BaseModel):
    position: Optional[str] = None
    country_code: Optional[str] = None
    state_id: Optional[str] = None
    city_id: Optional[str] = None
    constituency_id: Optional[str] = None
    party: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: Optional[bool] = None
    election_year: Optional[int] = None
    note: Optional[str] = None

class RelativeIn(BaseModel):
    name: str
    relationship: str
    description: Optional[str] = None
    is_political: bool = False
    political_role: Optional[str] = None
    linked_politician_id: Optional[str] = None

# ---------- TRASH ----------
class RestoreIn(BaseModel):
    entity_type: str
    entity_id: str


class BioIn(BaseModel):
    html: str


class ContactIn(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    captcha_token: str
    country_code: Optional[str] = None
    subject: str
    message: str
    source_page: Optional[str] = None


class UpdateRequestIn(BaseModel):
    request_type: str  # "update_existing" | "add_new"
    first_name: str
    last_name: str
    email: EmailStr
    captcha_token: str
    country_code: Optional[str] = None
    organization: Optional[str] = None

    # update_existing fields
    politician_id: Optional[str] = None
    update_type: Optional[str] = None
    description: Optional[str] = None

    # add_new fields (flexible, admin-reviewed before being applied)
    new_politician_data: Optional[dict] = None

    evidence_urls: List[str] = Field(default_factory=list)
    notes: Optional[str] = None


class TicketMessageIn(BaseModel):
    body: str
    is_internal: bool = False


class TicketStatusIn(BaseModel):
    status: str


class TicketApproveIn(BaseModel):
    applied_changes: Optional[dict] = None
    politician_data: Optional[dict] = None


class TicketRejectIn(BaseModel):
    reason: Optional[str] = None


class TicketAssignIn(BaseModel):
    admin_email: Optional[str] = None


class TicketMergeIn(BaseModel):
    merge_ticket_ids: List[str]


class ArticleIn(BaseModel):
    title: str
    category: str
    excerpt: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    author: Optional[str] = None


class ArticleUpdateIn(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    excerpt: Optional[str] = None
    tags: Optional[List[str]] = None
    author: Optional[str] = None


class ArticleBodyIn(BaseModel):
    html: str


class PurgeIn(BaseModel):
    entity_type: str
    entity_id: str
    confirm_name: str  # must match entity primary name/label

# ==========================================================================
# Voice / discussion models
# ==========================================================================

class VoiceCommentIn(BaseModel):
    body: str = Field(..., min_length=1, max_length=500)
    parent_id: Optional[str] = None          # set when posting a reply
    website: Optional[str] = ""              # honeypot — must stay empty
    form_rendered_at: Optional[str] = None   # ISO timestamp, soft anti-bot check


class VoiceReportIn(BaseModel):
    reason: str = Field(..., min_length=1, max_length=200)


class BlockedIpIn(BaseModel):
    ip: str = Field(..., min_length=3, max_length=45)
    reason: Optional[str] = None

# ---------- AUDIT ----------
class AuditFilterOut(BaseModel):
    actor: Optional[str] = None
    entity_type: Optional[str] = None
    action: Optional[str] = None
    from_date: Optional[str] = None
    to_date: Optional[str] = None

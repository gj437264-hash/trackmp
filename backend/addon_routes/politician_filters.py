from fastapi import APIRouter, Depends

from routes import get_db, require_section, NOT_DELETED
from countries import COUNTRIES
from reference_data import ROLES, PARTIES

router = APIRouter(prefix="/api")

_COUNTRY_NAME_BY_CODE = dict(COUNTRIES)


@router.get("/admin/politicians/filter-options")
async def get_politician_filter_options(user: dict = Depends(require_section("politicians"))):
    db = get_db()
    db_country_codes, db_parties, db_roles = await _distinct_all(db)

    countries = sorted(
        (
            {"code": code, "name": _COUNTRY_NAME_BY_CODE.get(code, code)}
            for code in db_country_codes
            if code
        ),
        key=lambda c: c["name"],
    )
    parties = sorted({p for p in db_parties if p} | set(PARTIES))
    roles = sorted({r for r in db_roles if r} | set(ROLES))

    return {
        "countries": countries,
        "parties": parties,
        "roles": roles,
    }


async def _distinct_all(db):
    country_codes = await db.politicians.distinct("country_code", NOT_DELETED)
    parties = await db.politicians.distinct("party", NOT_DELETED)
    roles = await db.politicians.distinct("role", NOT_DELETED)
    return country_codes, parties, roles

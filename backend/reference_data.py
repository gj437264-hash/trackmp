"""Curated reference data for the admin Politicians filter dropdowns.

This file is standalone — edit these lists any time to add/remove roles
or parties. It does not touch routes.py, models.py, or any DB schema.
Country names come from countries.py (existing ISO list).

HOW TO ADD:
- New role: add a string to ROLES below.
- New party: add a string to PARTIES below.
Both lists are merged with whatever already exists in the database, so
politicians already tagged with a role/party not listed here still show
up correctly in the dropdown — nothing gets hidden.
"""

ROLES = [
    "Prime Minister",
    "President",
    "Vice President",
    "Deputy Prime Minister",
    "Minister",
    "Deputy Minister",
    "Member of Parliament",
    "Senator",
    "Member of Legislative Assembly",
    "Member of Legislative Council",
    "Governor",
    "Lieutenant Governor",
    "Chief Minister",
    "Deputy Chief Minister",
    "Speaker",
    "Deputy Speaker",
    "Mayor",
    "Deputy Mayor",
    "Councillor",
    "Party Leader",
]

PARTIES = [
    "Independent",
]

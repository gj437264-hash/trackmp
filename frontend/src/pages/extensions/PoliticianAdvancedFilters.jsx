import React, { useEffect, useState } from "react";
import { MapPin, Building2, Landmark } from "lucide-react";
import { api } from "@/lib/api";

/**
 * Extra admin filters for the Politicians list: State, City, Party.
 *
 * Fully controlled by the parent (PoliticiansList.jsx owns the actual
 * filter state via the URL search params). This component only fetches
 * the *dependent* dropdown options -- states for the chosen country,
 * cities for the chosen state -- using the existing public reference-data
 * endpoints (/ref/states, /ref/cities), and reports any change back to
 * the parent via onChange(patch).
 *
 * The parent is responsible for clearing state_id/city_id when the
 * country changes (see the country <select>'s onChange in
 * PoliticiansList.jsx) so this component never has to guess whether a
 * previously-selected state/city is still valid.
 */
export default function PoliticianAdvancedFilters({
  countryCode,
  stateId,
  cityId,
  party,
  parties,
  onChange,
}) {
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    if (!countryCode) {
      setStates([]);
      return;
    }
    let active = true;
    setLoadingStates(true);
    api
      .get("/ref/states", { params: { country_code: countryCode } })
      .then(({ data }) => {
        if (active) setStates(data.items || []);
      })
      .catch(() => {
        if (active) setStates([]);
      })
      .finally(() => {
        if (active) setLoadingStates(false);
      });
    return () => {
      active = false;
    };
  }, [countryCode]);

  useEffect(() => {
    if (!stateId) {
      setCities([]);
      return;
    }
    let active = true;
    setLoadingCities(true);
    api
      .get("/ref/cities", { params: { state_id: stateId } })
      .then(({ data }) => {
        if (active) setCities(data.items || []);
      })
      .catch(() => {
        if (active) setCities([]);
      })
      .finally(() => {
        if (active) setLoadingCities(false);
      });
    return () => {
      active = false;
    };
  }, [stateId]);

  return (
    <>
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5">
          <MapPin size={12} className="inline mr-1" /> State
        </label>
        <select
          data-testid="filter-state"
          value={stateId}
          disabled={!countryCode || loadingStates}
          onChange={(e) => onChange({ state_id: e.target.value, city_id: "", page: 1 })}
          className="soft-input w-full text-sm py-2.5 disabled:opacity-50"
        >
          <option value="">{countryCode ? "All States" : "Select a country first"}</option>
          {states.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5">
          <Building2 size={12} className="inline mr-1" /> City
        </label>
        <select
          data-testid="filter-city"
          value={cityId}
          disabled={!stateId || loadingCities}
          onChange={(e) => onChange({ city_id: e.target.value, page: 1 })}
          className="soft-input w-full text-sm py-2.5 disabled:opacity-50"
        >
          <option value="">{stateId ? "All Cities" : "Select a state first"}</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5">
          <Landmark size={12} className="inline mr-1" /> Party
        </label>
        <select
          data-testid="filter-party"
          value={party}
          onChange={(e) => onChange({ party: e.target.value, page: 1 })}
          className="soft-input w-full text-sm py-2.5"
        >
          <option value="">All Parties</option>
          {(parties || []).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
    </>
  );
}

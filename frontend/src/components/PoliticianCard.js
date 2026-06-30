import { Link } from "react-router-dom";
import { MapPin, Star, BadgeCheck, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { tenure, fmtMoney } from "@/lib/format";

const DEFAULT_AVATAR = "https://images.pexels.com/photos/11655430/pexels-photo-11655430.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=400";

export default function PoliticianCard({ p }) {
  const total = p.promises_count || 0;
  const delivered = p.delivered_count || 0;
  const deliveredPct = total ? Math.round((delivered / total) * 100) : 0;
  const growth = p.net_worth_growth_pct;

  return (
    <Link to={`/politicians/${p.id}`} data-testid={`politician-card-${p.id}`} className="block border border-zinc-200 rounded-md p-5 hover-lift bg-white">
      <div className="flex gap-4 items-start">
        <img src={p.photo_url || DEFAULT_AVATAR} alt={p.name} className="h-16 w-16 rounded-md object-cover border border-zinc-200 bg-zinc-100 shrink-0" onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-lg text-zinc-950 truncate">{p.name}</h3>
            {p.verified && <BadgeCheck className="h-4 w-4 text-blue-600" />}
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-600 mt-0.5">
            <span className="px-1.5 py-0.5 text-xs border border-zinc-200 rounded bg-zinc-50">{p.party}</span>
            <span className="text-zinc-400">•</span>
            <span className="truncate">{p.position}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-zinc-500 mt-1">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">
              {[p.city, p.constituency, p.state, p.country].filter(Boolean).join(", ")}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-1">
            <Clock className="h-3 w-3" />
            <span>In position: <span className="text-zinc-700 font-medium">{tenure(p.position_since)}</span></span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 text-center border-t border-zinc-100 pt-4">
        <div><div className="text-[10px] uppercase tracking-wider text-zinc-500">Promises</div><div className="font-display font-bold text-lg tabular-nums">{total}</div></div>
        <div><div className="text-[10px] uppercase tracking-wider text-zinc-500">Delivered</div><div className="font-display font-bold text-lg tabular-nums text-green-700">{deliveredPct}%</div></div>
        <div className="flex flex-col items-center"><div className="text-[10px] uppercase tracking-wider text-zinc-500">Rating</div><div className="font-display font-bold text-lg tabular-nums flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{p.rating_count > 0 ? p.rating_avg : "—"}</div></div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Net worth</div>
          <div className="font-display font-bold text-sm tabular-nums">{fmtMoney(p.latest_net_worth)}</div>
          {growth != null && (
            <div className={`text-[10px] tabular-nums flex items-center justify-center gap-0.5 ${growth >= 0 ? "text-green-700" : "text-red-700"}`}>
              {growth >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {growth >= 0 ? "+" : ""}{growth}%
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

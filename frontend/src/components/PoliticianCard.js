import { Link } from "react-router-dom";
import { MapPin, Star, BadgeCheck } from "lucide-react";

const DEFAULT_AVATAR = "https://images.pexels.com/photos/11655430/pexels-photo-11655430.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=400";

export default function PoliticianCard({ p }) {
  const total = p.promises_count || 0;
  const delivered = p.delivered_count || 0;
  const broken = p.broken_count || 0;
  const deliveredPct = total ? Math.round((delivered / total) * 100) : 0;
  const brokenPct = total ? Math.round((broken / total) * 100) : 0;

  return (
    <Link
      to={`/politicians/${p.id}`}
      data-testid={`politician-card-${p.id}`}
      className="block border border-zinc-200 rounded-md p-5 hover-lift bg-white"
    >
      <div className="flex gap-4 items-start">
        <img
          src={p.photo_url || DEFAULT_AVATAR}
          alt={p.name}
          className="h-16 w-16 rounded-md object-cover border border-zinc-200 bg-zinc-100 shrink-0"
          onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
        />
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
            <span className="truncate">{p.constituency}, {p.state}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center border-t border-zinc-100 pt-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-500">Promises</div>
          <div className="font-display font-bold text-xl tabular-nums">{total}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-500">Delivered</div>
          <div className="font-display font-bold text-xl tabular-nums text-green-700">{deliveredPct}%</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-500">Broken</div>
          <div className="font-display font-bold text-xl tabular-nums text-red-700">{brokenPct}%</div>
        </div>
      </div>

      {p.rating_count > 0 && (
        <div className="mt-3 flex items-center gap-1 text-sm text-zinc-600">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span className="tabular-nums font-medium">{p.rating_avg}</span>
          <span className="text-zinc-400">({p.rating_count})</span>
        </div>
      )}
    </Link>
  );
}

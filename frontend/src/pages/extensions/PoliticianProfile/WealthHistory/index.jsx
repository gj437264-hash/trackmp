import React from "react";
import WealthChart from "./WealthChart";
import WealthTable from "./WealthTable";

export default function WealthHistory({ wealth, currency }) {
  return (
    <div>
      <WealthChart entries={wealth || []} currency={currency} />
      <WealthTable entries={wealth || []} currency={currency} />
    </div>
  );
}

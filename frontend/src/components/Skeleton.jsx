import React from "react";

export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-surfaceAlt rounded-xl ${className}`} />;
}

export function SkeletonGrid({ count = 6, className = "" }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-80" />
      ))}
    </div>
  );
}

export function SkeletonLines({ count = 3, className = "" }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-20" />
      ))}
    </div>
  );
}

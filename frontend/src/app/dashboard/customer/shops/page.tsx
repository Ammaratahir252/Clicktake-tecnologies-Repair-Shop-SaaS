"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState, useEffect, useCallback } from "react";
import {
  Store, MapPin, Phone, Clock, Search, Filter,
  Smartphone, ChevronRight, Loader2, AlertCircle, Star
} from "lucide-react";

interface Shop {
  _id: string;
  name: string;
  subdomain: string;
  tagline?: string;
  description?: string;
  logo?: string;
  city?: string;
  postcode?: string;
  phone?: string;
  acceptedDevices: string[];
  servicesOffered: string[];
  openingHours?: string;
}

const DEVICE_OPTIONS = [
  "iPhone", "Samsung", "iPad", "MacBook", "Laptop",
  "Android", "Tablet", "PlayStation", "Xbox",
];

function ShopCard({ shop }: { shop: Shop }) {
  const initials = shop.name.slice(0, 2).toUpperCase();

  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 hover:shadow-md hover:border-primary/30 transition-all">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary font-black text-sm">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-card-foreground text-base leading-tight">{shop.name}</h3>
          {shop.tagline && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{shop.tagline}</p>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2">
        {shop.city && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin size={13} className="shrink-0" />
            <span>{shop.city}{shop.postcode ? `, ${shop.postcode}` : ""}</span>
          </div>
        )}
        {shop.phone && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone size={13} className="shrink-0" />
            <span>{shop.phone}</span>
          </div>
        )}
        {shop.openingHours && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock size={13} className="shrink-0" />
            <span>{shop.openingHours}</span>
          </div>
        )}
      </div>

      {/* Accepted devices */}
      {shop.acceptedDevices.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {shop.acceptedDevices.slice(0, 4).map((d) => (
            <span
              key={d}
              className="text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full"
            >
              {d}
            </span>
          ))}
          {shop.acceptedDevices.length > 4 && (
            <span className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5">
              +{shop.acceptedDevices.length - 4} more
            </span>
          )}
        </div>
      )}

      {/* Services */}
      {shop.servicesOffered.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {shop.servicesOffered.slice(0, 3).map((s) => (
            <span
              key={s}
              className="text-[10px] font-semibold bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-full"
            >
              {s}
            </span>
          ))}
          {shop.servicesOffered.length > 3 && (
            <span className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5">
              +{shop.servicesOffered.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* CTA */}
      <a
        href={`/dashboard/customer/book-repair?shop=${encodeURIComponent(shop.subdomain)}&shopName=${encodeURIComponent(shop.name)}`}
        className="mt-auto flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-bold py-2.5 rounded-xl hover:opacity-90 transition-opacity"
      >
        Book a Repair
        <ChevronRight size={15} />
      </a>
    </div>
  );
}

function ShopsContent() {
  const [shops, setShops]         = useState<Shop[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [city, setCity]           = useState("");
  const [device, setDevice]       = useState("");
  const [searched, setSearched]   = useState(false);

  const fetchShops = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (city.trim())   params.set("city", city.trim());
      if (device.trim()) params.set("device", device.trim());
      const res = await fetch(`/api/shops?${params.toString()}`);
      const json = await res.json();
      setShops(Array.isArray(json.data) ? json.data : []);
      setSearched(true);
    } catch {
      setError("Could not load shops. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [city, device]);

  // Load all shops on mount
  useEffect(() => {
    fetchShops();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-foreground">Find a Repair Shop</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse registered repair shops near you and book your device repair.
        </p>
      </div>

      {/* Search bar */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="City (e.g. Lahore, Karachi)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchShops()}
              className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="relative">
            <Smartphone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <select
              value={device}
              onChange={(e) => setDevice(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none"
            >
              <option value="">All devices</option>
              {DEVICE_OPTIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={fetchShops}
          disabled={loading}
          className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-bold px-5 py-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          {loading ? "Searching…" : "Search Shops"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-xl p-4">
          <AlertCircle size={16} className="text-destructive" />
          <p className="text-sm font-semibold text-destructive">{error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 space-y-3 animate-pulse">
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-xl bg-muted" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded w-2/3" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
              <div className="h-9 bg-muted rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && searched && shops.length === 0 && (
        <div className="text-center py-16 bg-card border border-border rounded-2xl">
          <Store className="mx-auto text-muted-foreground/30 w-10 h-10 mb-3" />
          <p className="font-bold text-muted-foreground">No shops found</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Try searching with a different city or device type.
          </p>
        </div>
      )}

      {!loading && shops.length > 0 && (
        <>
          <p className="text-xs font-semibold text-muted-foreground">
            {shops.length} shop{shops.length !== 1 ? "s" : ""} found
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shops.map((shop) => (
              <ShopCard key={shop._id} shop={shop} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function ShopsPage() {
  return (
    <DashboardShell requiredRole="customer">
      {() => <ShopsContent />}
    </DashboardShell>
  );
}

"use client";

import DashboardShell from "@/components/DashboardShell";
import GpsMap from "@/components/GpsMap";
import { useState, useCallback } from "react";
import api from "@/lib/api";
import {
  MapPin, Loader2, Navigation, Phone, Star, Search,
  Satellite, AlertCircle, Smartphone, Clock, ExternalLink,
} from "lucide-react";

// ── GPS (Module: Global GPS) ────────────────────────────────────────────
// Works anywhere in the world — UK, USA, Pakistan, wherever the customer's
// device reports itself. No country-specific address parsing needed: we
// just ask the browser for lat/lng and let MongoDB's $geoNear do the rest.

type LocState = "idle" | "locating" | "done" | "denied" | "error";

export default function NearbyShopsPage() {
  return (
    <DashboardShell requiredRole="customer">
      {() => <NearbyShopsContent />}
    </DashboardShell>
  );
}

function NearbyShopsContent() {
  const [locState, setLocState] = useState<LocState>("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [shops, setShops] = useState<any[]>([]);
  const [loadingShops, setLoadingShops] = useState(false);
  const [radiusKm, setRadiusKm] = useState(50);
  const [manualCity, setManualCity] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchNearby = useCallback(async (lat: number, lng: number, radius: number) => {
    setLoadingShops(true);
    setError(null);
    try {
      const res = await api.get(`/api/shops?lat=${lat}&lng=${lng}&radius=${radius}`);
      setShops(res.data?.data ?? []);
    } catch {
      setError("Couldn't load nearby shops. Please try again.");
    } finally {
      setLoadingShops(false);
    }
  }, []);

  const locateMe = () => {
    if (!navigator.geolocation) {
      setLocState("error");
      setError("GPS is not supported on this device/browser.");
      return;
    }
    setLocState("locating");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        setLocState("done");
        fetchNearby(latitude, longitude, radiusKm);
      },
      (err) => {
        setLocState(err.code === err.PERMISSION_DENIED ? "denied" : "error");
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location access denied. You can still search by city below."
            : err.message || "Unable to get your location."
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  const searchByCity = async () => {
    if (!manualCity.trim()) return;
    setLoadingShops(true);
    setError(null);
    try {
      const res = await api.get(`/api/shops?city=${encodeURIComponent(manualCity.trim())}`);
      setShops(res.data?.data ?? []);
      setCoords(null);
    } catch {
      setError("Couldn't search shops. Please try again.");
    } finally {
      setLoadingShops(false);
    }
  };

  const changeRadius = (radius: number) => {
    setRadiusKm(radius);
    if (coords) fetchNearby(coords.lat, coords.lng, radius);
  };

  const openInMaps = (shop: any) => {
    const c = shop?.location?.coordinates; // [lng, lat]
    const query = c ? `${c[1]},${c[0]}` : encodeURIComponent(`${shop.name} ${shop.city ?? ""}`);
    window.open(`https://maps.google.com/?q=${query}`, "_blank");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center">
          <MapPin size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground">Find Nearby Repair Shops</h1>
          <p className="text-muted-foreground text-sm font-medium">
            Works anywhere in the world — UK, USA, Pakistan, or wherever you are.
          </p>
        </div>
      </div>

      {/* Locate button */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <button
            onClick={locateMe}
            disabled={locState === "locating"}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-primary to-primary/80 text-white font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg disabled:opacity-70"
          >
            {locState === "locating" ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Satellite size={18} />
            )}
            {locState === "locating" ? "Finding your location…" : "Use my current location"}
          </button>

          {coords && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Search radius:</span>
              {[10, 25, 50, 100].map((r) => (
                <button
                  key={r}
                  onClick={() => changeRadius(r)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    radiusKm === r ? "bg-primary text-white" : "bg-muted hover:bg-muted/70 text-foreground"
                  }`}
                >
                  {r}km
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Manual city fallback — works if GPS is denied or unavailable */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={manualCity}
              onChange={(e) => setManualCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchByCity()}
              placeholder="Or search by city (e.g. London, New York, Lahore)"
              className="w-full pl-9 pr-3 py-2 text-sm bg-muted/50 border border-border/50 rounded-lg outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            onClick={searchByCity}
            className="px-4 py-2 text-sm font-bold bg-muted hover:bg-muted/70 rounded-lg transition-all"
          >
            Search
          </button>
        </div>
      </div>

      {/* Map view */}
      {!loadingShops && shops.length > 0 && (
        <GpsMap
          height={320}
          markers={[
            ...(coords ? [{ lng: coords.lng, lat: coords.lat, color: "#6366f1", popupText: "You", pulse: true }] : []),
            ...shops
              .filter((s: any) => s?.location?.coordinates)
              .map((s: any) => ({
                lng: s.location.coordinates[0],
                lat: s.location.coordinates[1],
                color: "#ef4444",
                popupText: s.name,
              })),
          ]}
        />
      )}

      {/* Results */}
      {loadingShops && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="animate-spin w-6 h-6 mr-3" />
          <span className="font-medium">Searching for repair shops…</span>
        </div>
      )}

      {!loadingShops && shops.length === 0 && locState !== "idle" && (
        <div className="text-center py-16">
          <MapPin size={40} className="text-muted-foreground mx-auto mb-3" />
          <p className="font-bold text-foreground">No shops found nearby</p>
          <p className="text-sm text-muted-foreground mt-1">Try increasing the search radius or search by city instead.</p>
        </div>
      )}

      {!loadingShops && shops.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shops.map((shop: any) => (
            <div
              key={shop._id}
              className="bg-card border border-border rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-foreground">{shop.name}</p>
                  {shop.tagline && <p className="text-xs text-muted-foreground mt-0.5">{shop.tagline}</p>}
                </div>
                {typeof shop.distanceKm === "number" && (
                  <span className="flex-shrink-0 text-xs font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                    {shop.distanceKm} km
                  </span>
                )}
              </div>

              <div className="space-y-1.5 text-sm text-muted-foreground">
                {(shop.city || shop.country) && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="flex-shrink-0" />
                    <span>{[shop.city, shop.country].filter(Boolean).join(", ")}</span>
                  </div>
                )}
                {shop.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="flex-shrink-0" />
                    <a href={`tel:${shop.phone}`} className="hover:text-primary transition-colors">{shop.phone}</a>
                  </div>
                )}
                {shop.openingHours && (
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="flex-shrink-0" />
                    <span>{shop.openingHours}</span>
                  </div>
                )}
              </div>

              {Array.isArray(shop.acceptedDevices) && shop.acceptedDevices.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <Smartphone size={12} className="text-muted-foreground" />
                  {shop.acceptedDevices.slice(0, 4).map((d: string) => (
                    <span key={d} className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded-full text-foreground">
                      {d}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-border/50">
                <button
                  onClick={() => openInMaps(shop)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold rounded-lg text-xs transition-all"
                >
                  <Navigation size={14} />
                  Directions
                </button>
                <a
                  href={`/${shop.subdomain ?? ""}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-muted hover:bg-muted/70 text-foreground font-bold rounded-lg text-xs transition-all"
                >
                  <ExternalLink size={14} />
                  Visit Shop
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {locState === "idle" && shops.length === 0 && !loadingShops && (
        <div className="text-center py-16 text-muted-foreground">
          <Star size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">Tap "Use my current location" to find repair shops near you.</p>
        </div>
      )}
    </div>
  );
}

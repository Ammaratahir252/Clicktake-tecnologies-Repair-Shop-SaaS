"use client";

import { useEffect, useRef, useState } from "react";

/**
 * components/GpsMap.tsx
 *
 * Reusable live map for the Global GPS module. Loads Mapbox GL JS from the
 * CDN (no npm dependency required — keeps the project install-free for this
 * feature) and renders markers + an optional route line.
 *
 * Requires NEXT_PUBLIC_MAPBOX_TOKEN to be set in .env.local. If it's not
 * configured, a friendly placeholder is shown instead of a blank/broken map.
 */

const MAPBOX_GL_JS = "https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.js";
const MAPBOX_GL_CSS = "https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.css";

let loadPromise: Promise<any> | null = null;

function loadMapboxGl(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if ((window as any).mapboxgl) return Promise.resolve((window as any).mapboxgl);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${MAPBOX_GL_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = MAPBOX_GL_CSS;
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = MAPBOX_GL_JS;
    script.async = true;
    script.onload = () => resolve((window as any).mapboxgl);
    script.onerror = () => reject(new Error("Failed to load Mapbox GL JS"));
    document.head.appendChild(script);
  });

  return loadPromise;
}

export interface GpsMapMarker {
  lng: number;
  lat: number;
  color?: string;
  popupText?: string;
  pulse?: boolean; // e.g. for a "live" driver marker
}

export interface GpsMapRoute {
  type: "LineString";
  coordinates: [number, number][]; // [lng, lat][]
}

interface GpsMapProps {
  markers: GpsMapMarker[];
  route?: GpsMapRoute | null;
  height?: number | string;
  className?: string;
  zoom?: number;
}

type Status = "loading" | "ready" | "error" | "no-token";

export default function GpsMap({ markers, route, height = 280, className = "", zoom = 12 }: GpsMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [status, setStatus] = useState<Status>("loading");

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // ── Init map once ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!token || token.startsWith("REPLACE_WITH")) {
      setStatus("no-token");
      return;
    }
    let cancelled = false;

    loadMapboxGl()
      .then((mapboxgl) => {
        if (cancelled || !containerRef.current) return;
        mapboxgl.accessToken = token;
        const center = markers[0] ? [markers[0].lng, markers[0].lat] : [0, 20];
        mapRef.current = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center,
          zoom,
        });
        mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");
        mapRef.current.on("load", () => {
          if (!cancelled) setStatus("ready");
        });
      })
      .catch(() => setStatus("error"));

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ── Update markers + route + fit bounds whenever data changes ──────────
  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;
    const mapboxgl = (window as any).mapboxgl;
    const map = mapRef.current;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    markers.forEach((m) => {
      const el = document.createElement("div");
      el.style.width = "16px";
      el.style.height = "16px";
      el.style.borderRadius = "50%";
      el.style.background = m.color ?? "#6366f1";
      el.style.border = "3px solid white";
      el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.35)";
      if (m.pulse) {
        el.style.boxShadow = `0 0 0 6px ${m.color ?? "#6366f1"}33, 0 2px 8px rgba(0,0,0,0.35)`;
      }

      const marker = new mapboxgl.Marker({ element: el }).setLngLat([m.lng, m.lat]).addTo(map);
      if (m.popupText) {
        marker.setPopup(new mapboxgl.Popup({ offset: 20 }).setText(m.popupText));
      }
      markersRef.current.push(marker);
    });

    const routeSourceId = "gps-route";
    if (map.getLayer?.(routeSourceId)) map.removeLayer(routeSourceId);
    if (map.getSource?.(routeSourceId)) map.removeSource(routeSourceId);

    if (route?.coordinates?.length) {
      map.addSource(routeSourceId, {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: route },
      });
      map.addLayer({
        id: routeSourceId,
        type: "line",
        source: routeSourceId,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#6366f1", "line-width": 4, "line-opacity": 0.85 },
      });
    }

    const points: [number, number][] = [
      ...markers.map((m) => [m.lng, m.lat] as [number, number]),
      ...(route?.coordinates ?? []),
    ];

    if (points.length > 1) {
      const bounds = points.reduce(
        (b, p) => b.extend(p),
        new mapboxgl.LngLatBounds(points[0], points[0])
      );
      map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 500 });
    } else if (points.length === 1) {
      map.flyTo({ center: points[0], zoom, duration: 500 });
    }
  }, [status, markers, route]); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === "no-token") {
    return (
      <div
        style={{ height }}
        className={`flex items-center justify-center bg-muted/50 rounded-xl border border-dashed border-border text-center px-4 ${className}`}
      >
        <p className="text-xs text-muted-foreground">
          Map unavailable — add a free Mapbox token as <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> in{" "}
          <code>.env.local</code> to enable live maps.
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        style={{ height }}
        className={`flex items-center justify-center bg-muted/50 rounded-xl border border-border ${className}`}
      >
        <p className="text-xs text-muted-foreground">Couldn't load the map.</p>
      </div>
    );
  }

  return (
    <div className={`relative rounded-xl overflow-hidden border border-border ${className}`} style={{ height }}>
      <div ref={containerRef} className="absolute inset-0" />
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <p className="text-xs text-muted-foreground">Loading map…</p>
        </div>
      )}
    </div>
  );
}

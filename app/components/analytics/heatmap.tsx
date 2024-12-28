import { GoogleMap, HeatmapLayerF } from "@react-google-maps/api";
import type { SearchOutput } from "app/stores/searches.server";
import { PresetMapThemes } from "app/types/brands";
import { useEffect, useMemo, useRef } from "react";

export function Heatmap({ data }: { data: SearchOutput[] }) {
  const heatmapLayerRef = useRef<google.maps.visualization.HeatmapLayer | null>(
    null,
  );

  const parsedData = useMemo(() => {
    return data.map((search) => ({
      location: new google.maps.LatLng(search.lat, search.lng),
      weight: search.count,
    }));
  }, [data]);

  useEffect(() => {
    if (heatmapLayerRef.current) {
      heatmapLayerRef.current.setData(parsedData);
    }
  }, [parsedData]);

  return (
    <GoogleMap
      mapContainerStyle={{
        height: "500px",
        width: "100%",
      }}
      center={{ lat: 41.85073, lng: -87.651265 }}
      zoom={4}
      clickableIcons={false}
      id="analytics-heatmap"
      options={{
        mapId: PresetMapThemes.HEATMAP,
        mapTypeControl: false,
        streetViewControl: false,
        gestureHandling: "greedy",
        minZoom: 4,
        maxZoom: 11,
      }}
    >
      <HeatmapLayerF
        options={{
          radius: 46,
          opacity: 0.5,
        }}
        onLoad={(heatmapLayer) => {
          heatmapLayerRef.current = heatmapLayer;
          heatmapLayer.setData(parsedData); // Initial data load
        }}
        onUnmount={() => {
          heatmapLayerRef.current = null;
        }}
        data={[]} // Initial data can be empty; it will be set dynamically
      />
    </GoogleMap>
  );
}

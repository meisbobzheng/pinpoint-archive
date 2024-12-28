import { z } from "zod";

// Preset map themes
// To add more themes, create a map theme and create a map and map the theme to the created map
// Then add the mapId here.
// Read more here https://developers.google.com/maps/documentation/javascript/examples/map-id-style
export enum PresetMapThemes {
  DEFAULT = "f6f6917c16792a1f",
  CLEAN = "9f53fef2acbdfd98",
  LIGHT = "a6307071b3ec9eba",
  PASTEL = "e359b0c74e6fda51", // this theme sucks... need to fix
  HEATMAP = "45a4d11fe7bf48b6",
}

// Default brand settings
export const DEFAULT_BRAND_SETTINGS = {
  // Colors
  backgroundColor: "#ffffff",
  markerColor: "#fa3737",
  textColor: "#777777",
  clusterColor: "#2372ed",

  // Appearance
  theme: PresetMapThemes.DEFAULT,
  layout: "sidebarleft",
  showAttribution: true,

  // Search
  searchPlaceholder: "Search locations...",
  language: "en",

  // Advanced
  customPinImage: "",
  customMapTheme: "",
  customCSS: "",
};

export const BrandSettingsSchema = z.object({
  // Colors
  backgroundColor: z.string(),
  textColor: z.string(),
  clusterColor: z.string(),
  markerColor: z.string(),

  // Appearance
  theme: z.string(),
  layout: z.enum(["sidebarleft", "sidebarright"]),
  showAttribution: z.boolean(),

  // Search
  searchPlaceholder: z.string(),
  language: z.string(),

  // Advanced
  customCSS: z.string().optional(),
  customPinImage: z.string().optional(),
  customMapTheme: z.string().optional(),

  apiKey: z.string(),
});

export type BrandSettings = z.infer<typeof BrandSettingsSchema>;

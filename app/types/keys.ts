import { z } from "zod";

export const GoogleMapsKeySchema = z.object({
  _id: z.any(),
  maps_key: z.string(),
  endpoints: z.array(z.string()),
  is_used: z.boolean().optional(),
});

export const GoogleMapsKeyArraySchema = z.array(GoogleMapsKeySchema);

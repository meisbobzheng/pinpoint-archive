import { z } from "zod";

export const SearchSchema = z.object({
  search: z.string(),
  createdAt: z.string(),
});

export const SearchArraySchema = z.array(SearchSchema);

export const SearchRecordSchema = z.object({
  id: z.string(),
  brandHash: z.string(),
  geohash: z.string(),
  searches: SearchArraySchema,
  city: z.string(),
  state: z.string(),
});

export type ParsedSearches = z.infer<typeof SearchArraySchema>;
export type ParsedSearchRecord = z.infer<typeof SearchRecordSchema>;

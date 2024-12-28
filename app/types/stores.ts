import { z } from "zod";

// This looks like a mess, but I promise you it is not.
// Store data constantly changes from what's uploaded, to what's validated, to what brands see, to what we store it as

// These types are crucial in limit and broadening scopes of these objects
// so that we don't return either too much or too little data
export type BaseStore = {
  name: string;
  addressPrimary: string;
  addressSecondary: string | null;
  city: string;
  state: string;
  postalCode: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  tags: string[];
};

export type ExternalStore = BaseStore & {
  id: string;
};

export type ValidatedStore = BaseStore & {
  smartyKey: string;
  geohash: string;
};

export type CreatedStore = Omit<BaseStore, "tags"> & {
  smartyKey: string;
  geohash: string;
  brands: string[];
  source: string[];
  tags: Record<string, string[]>;
  createdAt: string;
  updatedAt: string;
};

export type MarkerStore = BaseStore & {
  geohash: string;
};

export const OverrideContentSchema = z.object({
  phone: z.string().nullish(),
  email: z.string().nullish(),
  website: z.string().nullish(),
});

export const OverrideSchema = z.record(z.string(), OverrideContentSchema);

const RawStoreSchema = z.object({
  _id: z.any(),
  name: z.string(),
  address_primary: z.string(),
  address_secondary: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  postal_code: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  website: z.string().nullable(),
  overrides: OverrideSchema.nullable().optional(),
  smarty_key: z.string(),
  geohash: z.string(),
  brands: z.array(z.string()),
  source: z.array(z.string()),
  tags: z.record(z.string(), z.array(z.string())),
  created_at: z.string(),
  updated_at: z.string(),
});
export const StoreSchema = z.object({
  id: z.string(),
  name: z.string(),
  addressPrimary: z.string(),
  addressSecondary: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  website: z.string().nullable(),
  overrides: OverrideSchema.nullable().optional(),
  smartyKey: z.string(),
  geohash: z.string(),
  brands: z.array(z.string()),
  source: z.array(z.string()),
  tags: z.record(z.string(), z.array(z.string())),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const RawStoreArraySchema = z.array(RawStoreSchema);
export const StoreArraySchema = z.array(StoreSchema);
export type ParsedStore = z.infer<typeof StoreSchema>;

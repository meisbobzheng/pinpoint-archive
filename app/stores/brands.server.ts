import type { Brand } from "@prisma/client";
import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import prisma from "app/db.server";
import { BrandSettingsSchema, DEFAULT_BRAND_SETTINGS } from "app/types/brands";
import dayjs from "dayjs";
import { v3 as uuidV3 } from "uuid";
import { fetchUnusedKey } from "./keys.server";

// Fetches the brand associated with a shopify store
// If initial install, then configures default settings and returns the brand
export async function getStoreBrand(
  admin: AdminApiContext,
  shopifyStore: string,
): Promise<{
  brand: Brand;
  initialInstall: boolean;
}> {
  const existingBrand = await prisma.brand.findFirst({
    where: {
      shopifyStore,
      isInstalled: true,
    },
  });

  if (existingBrand) {
    return {
      brand: existingBrand,
      initialInstall: false,
    };
  }

  // create brand for new shopify brand from shopify data
  const brandData = await admin.graphql(
    `#graphql
    {
      shop {
        name,
        email, 
        url
      }
    }`,
  );

  const parsedBrandData: {
    name: string;
    email: string;
    url: string;
  } = (await brandData.json()).data.shop;

  const trimmedBrandName = parsedBrandData.name
    .replace(/[-\s]/g, "-")
    .toLowerCase();

  const brandHash = uuidV3(trimmedBrandName, uuidV3.DNS);

  const apiKey = await fetchUnusedKey();

  const defaultBrandSettings = {
    ...DEFAULT_BRAND_SETTINGS,
    apiKey,
  };

  const validatedSettings = BrandSettingsSchema.parse(defaultBrandSettings);

  const upsertedFields = {
    name: parsedBrandData.name,
    website: parsedBrandData.url,
    email: parsedBrandData.email,
    shopifyStore,
    settings: validatedSettings,
    isInstalled: true,
  };

  const newBrand = await prisma.brand.upsert({
    where: {
      brandHash,
    },
    update: upsertedFields,
    create: {
      ...upsertedFields,
      brandHash,
      locatorApi: null,
      locatorLink: null,
      locatorType: null,
      createdAt: dayjs().toISOString(),
      updatedAt: dayjs().toISOString(),
    },
  });

  return {
    brand: newBrand,
    initialInstall: true, // flag for auto generating online store on initial install
  };
}

// updates brand details for the Account page
export async function updateBrandInfo(
  admin: AdminApiContext,
  data: {
    name?: string;
    website?: string;
    email?: string;
  },
) {
  const shopifyStore = admin.rest.session.shop;

  // Although only 1 brand is expected, updateMany is used since shopifyStore is not unique
  // since shopifyStore can be null (non-unique)
  await prisma.brand.updateMany({
    where: {
      shopifyStore,
    },
    data: {
      ...data,
      updatedAt: dayjs().toISOString(),
    },
  });
  return;
}

// Updates brand settings
export async function updateBrandSettings(
  admin: AdminApiContext,
  data: {
    settings: object;
  },
) {
  const shopifyStore = admin.rest.session.shop;

  // validate settings object
  const validatedSettings = BrandSettingsSchema.parse(data.settings);

  await prisma.brand.updateMany({
    where: {
      shopifyStore,
    },
    data: {
      settings: validatedSettings,
      updatedAt: dayjs().toISOString(),
    },
  });

  return;
}

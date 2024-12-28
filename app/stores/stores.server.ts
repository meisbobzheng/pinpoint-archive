import type { Prisma } from "@prisma/client";
import type { DefaultArgs } from "@prisma/client/runtime/library";
import prisma from "app/db.server";
import type {
  BaseStore,
  CreatedStore,
  ExternalStore,
  MarkerStore,
  OverrideContentSchema,
  OverrideSchema,
  ValidatedStore,
} from "app/types/stores";
import {
  RawStoreArraySchema,
  StoreArraySchema,
  StoreSchema,
} from "app/types/stores";
import { GeohashTree } from "app/util/tree.server";
import dayjs from "dayjs";
import type { z } from "zod";

// Fetches the brand's store count
export async function getBrandStoreCount(brandHash: string): Promise<number> {
  const sourceString = `PinPoint - ${brandHash}`;
  const storeCount = await prisma.store.count({
    where: {
      source: {
        has: sourceString,
      },
    },
  });

  return storeCount;
}

// Fetches stores by id (used for selecting and exporting stores in stores table)
export async function fetchStoresById(
  brandHash: string,
  ids: string[],
): Promise<BaseStore[]> {
  const sourceString = `PinPoint - ${brandHash}`;

  const stores = await prisma.store.findMany({
    where: {
      source: {
        has: sourceString,
      },
      ...(ids.length ? { id: { in: ids } } : {}),
    },

    select: {
      name: true,
      addressPrimary: true,
      addressSecondary: true,
      city: true,
      state: true,
      postalCode: true,
      phone: true,
      email: true,
      website: true,
      tags: true,
    },
  });

  const brandStores = stores.map((store) => {
    const storeTags = store.tags as Record<string, string[]>;
    return {
      ...store,
      tags: storeTags[brandHash] ?? [],
    };
  });

  return brandStores;
}

// Fetches all stores per brand w/ server side pagination
export async function fetchBrandStores({
  brandHash,
  page,
  perPage,
  search,
}: {
  brandHash: string;
  page: number;
  perPage?: number;
  search?: string;
}): Promise<{ stores: ExternalStore[]; hasNextPage: boolean }> {
  const sourceString = `PinPoint - ${brandHash}`;
  const amountPerPage = perPage ?? 10;

  const query = {
    source: { $in: [sourceString] },
  } as any;

  if (search) {
    query.$text = { $search: search };
  }

  // Advanced mongo searchces requires prisma findRaw
  // since it does not have built in support for it yet
  const stores = await prisma.store.findRaw({
    filter: query,
    options: {
      skip: page * amountPerPage,
      limit: amountPerPage + 1,
    },
  });

  if (!stores) {
    return {
      stores: [],
      hasNextPage: false,
    };
  }

  const parsedStores = RawStoreArraySchema.parse(stores);

  const brandStores = parsedStores.map((store) => {
    const storeTags = store.tags;
    const overrides = store.overrides;
    const brandOverrideExists = overrides && overrides[brandHash];

    const phone = brandOverrideExists
      ? overrides[brandHash].phone || null
      : store.phone;
    const email = brandOverrideExists
      ? overrides[brandHash].email || null
      : store.email;
    const website = brandOverrideExists
      ? overrides[brandHash].website || null
      : store.website;

    return {
      id: store._id.$oid,
      name: store.name,
      addressPrimary: store.address_primary,
      addressSecondary: store.address_secondary,
      city: store.city,
      state: store.state,
      postalCode: store.postal_code,
      phone,
      email,
      website,
      tags: storeTags[brandHash] ?? [],
    };
  });

  const hasNextPage = brandStores.length > amountPerPage;

  return {
    stores: hasNextPage ? brandStores.slice(0, amountPerPage) : brandStores,
    hasNextPage,
  };
}

// Used purely for testing
export async function deleteAllBrandStore({
  brandHash,
}: {
  brandHash: string;
}): Promise<void> {
  const sourceString = `PinPoint - ${brandHash}`;

  const storesToUpdate = await prisma.store.findMany({
    where: {
      source: {
        has: sourceString,
      },
    },
  });

  const brandTree = await prisma.tree.findUnique({
    where: {
      brandHash,
    },
  });

  if (!brandTree) {
    throw new Error("Tree not found");
  }

  const tree = GeohashTree.fromJSON(brandTree.tree as string);

  const batchedStoreUpdateOptions: Prisma.StoreUpdateArgs<DefaultArgs>[] = [];

  for (const store of storesToUpdate) {
    const updatedSource = store.source.filter(
      (source) => source !== sourceString,
    );

    const updatedTags = { ...(store.tags as Record<string, string[]>) };
    delete updatedTags[brandHash];
    const updatedOverrides = { ...((store.overrides || {}) as Override) };
    delete updatedOverrides[brandHash];

    batchedStoreUpdateOptions.push({
      where: {
        id: store.id,
      },
      data: {
        source: updatedSource,
        tags: updatedTags,
        overrides: updatedOverrides,
      },
    });

    tree.remove(store);
  }

  await Promise.allSettled(
    batchedStoreUpdateOptions.map((options) => {
      return prisma.$transaction([prisma.store.update(options)]);
    }),
  );

  await prisma.tree.update({
    where: {
      brandHash,
    },
    data: {
      tree,
    },
  });

  return;
}

// Used for deleting selected brand stores
export async function deleteBrandStores({
  brandHash,
  ids,
}: {
  brandHash: string;
  ids: string[];
}): Promise<void> {
  const sourceString = `PinPoint - ${brandHash}`;

  const storesToUpdate = await prisma.store.findMany({
    where: {
      source: {
        has: sourceString,
      },
      id: {
        in: ids,
      },
    },
  });

  const brandTree = await prisma.tree.findUnique({
    where: {
      brandHash,
    },
  });

  if (!brandTree) {
    throw new Error("Tree not found");
  }

  const tree = GeohashTree.fromJSON(brandTree.tree as string);

  const batchedStoreUpdateOptions: Prisma.StoreUpdateArgs<DefaultArgs>[] = [];

  // remove the brand from the source array and its tree
  // remove the brand's tags and overrides
  // we keep the brand in the  brands array to keep track of which stores
  // have been uploaded by the brand (whether existing or current)
  for (const store of storesToUpdate) {
    const updatedSource = store.source.filter(
      (source) => source !== sourceString,
    );

    const updatedTags = { ...(store.tags as Record<string, string[]>) };
    delete updatedTags[brandHash];
    const updatedOverrides = { ...((store.overrides || {}) as Override) };
    delete updatedOverrides[brandHash];

    batchedStoreUpdateOptions.push({
      where: {
        id: store.id,
      },
      data: {
        source: updatedSource,
        tags: updatedTags,
        overrides: updatedOverrides,
      },
    });

    // remove store from tree
    tree.remove(store);
  }

  // Bulk update w/ transactions
  await Promise.allSettled(
    batchedStoreUpdateOptions.map((options) => {
      return prisma.$transaction([prisma.store.update(options)]);
    }),
  );

  await prisma.tree.update({
    where: {
      brandHash,
    },
    data: {
      tree,
    },
  });

  return;
}

type OverrideContent = z.infer<typeof OverrideContentSchema>;
type Override = z.infer<typeof OverrideSchema>;

// Used for adding new stores for a brand, whether through importing a csv or manually adding a store
// Takes in prevalidated store data, which should be parsed and address validated
export async function importBrandStores({
  brandHash,
  validatedStores,
}: {
  brandHash: string;
  validatedStores: Record<string, ValidatedStore>;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const sourceString = `PinPoint - ${brandHash}`;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    const validatedStoreKeys = Object.keys(validatedStores);

    // find existing stores in db
    const storesToUpdate = await prisma.store.findMany({
      where: {
        smartyKey: {
          in: validatedStoreKeys,
        },
      },
    });

    const parsedExistingStores = StoreArraySchema.parse(storesToUpdate);

    const addedExistingStores: ValidatedStore[] = [];
    const allSeenTags = new Set<string>();

    const bulkUpdateOptions: Prisma.StoreUpdateArgs<DefaultArgs>[] = [];

    // if store has previously been uploaded, update tags as necessary
    // otherwise, update brand, source, and create tags/overrides
    for (const store of parsedExistingStores) {
      const allTags = store.tags;
      const uploadedStore = validatedStores[store.smartyKey];
      const uploadedTags = uploadedStore.tags.sort();

      const parsedEmail = emailRegex.test(uploadedStore.email || "")
        ? validatedStores[store.smartyKey].email
        : null;

      // Update fields if the store has already been uploaded by the brand
      if (store.source.includes(sourceString)) {
        const existingTags = allTags[brandHash].sort();
        uploadedTags.forEach((tag) => allSeenTags.add(tag));

        const dataToUpdate: {
          overrides?: Override;
          tags?: Record<string, string[]>;
        } = {};

        const containsNewTags = !existingTags.every(
          (tag, index) => tag === uploadedTags[index],
        );

        const samePhone = uploadedStore.phone === store.phone;
        const sameEmail = parsedEmail === store.email;
        const sameWebsite = uploadedStore.website === store.website;

        if (containsNewTags) {
          allTags[brandHash] = uploadedTags;
          dataToUpdate.tags = allTags;
        }

        const newOverrides: OverrideContent = {};

        if (samePhone && sameEmail && sameWebsite) {
          if (store.overrides && store.overrides[brandHash]) {
            dataToUpdate.overrides = {
              ...store.overrides,
              [brandHash]: {
                phone: store.phone,
                email: store.email,
                website: store.website,
              },
            };
          }
        } else {
          newOverrides.phone = uploadedStore.phone;
          newOverrides.email = parsedEmail;
          newOverrides.website = uploadedStore.website;

          if (
            store.overrides &&
            store.overrides[brandHash] &&
            store.overrides[brandHash] !== newOverrides
          ) {
            dataToUpdate.overrides = {
              ...store.overrides,
              [brandHash]: newOverrides,
            };
          } else if (!store.overrides || !store.overrides[brandHash]) {
            dataToUpdate.overrides = {
              ...(store.overrides || {}),
              [brandHash]: newOverrides,
            };
          }
        }

        // if we actually have something to update, add it to the bulk update array
        if (Object.values(dataToUpdate).length > 0) {
          bulkUpdateOptions.push({
            where: {
              id: store.id,
            },
            data: {
              ...dataToUpdate,
              updatedAt: dayjs().toISOString(),
            },
          });
        }
      } else {
        // update store's source, brand, tags, and overrides if not already uploaded
        const updatedBrands = store.brands;
        const updatedSource = [...store.source, sourceString];
        let overrides = store.overrides;

        const newOverrides: OverrideContent = {};

        newOverrides.phone = uploadedStore.phone || store.phone;
        newOverrides.email = parsedEmail || store.email;
        newOverrides.website = uploadedStore.website || store.website;

        if (
          newOverrides.phone !== store.phone ||
          newOverrides.email !== store.email ||
          newOverrides.website !== store.website
        ) {
          overrides = {
            ...overrides,
            [brandHash]: newOverrides,
          };
        }

        // update brand, source, and tags if store has not been uploaded by brand
        if (!store.brands.includes(brandHash)) {
          updatedBrands.push(brandHash);
        }

        allTags[brandHash] = uploadedTags;

        bulkUpdateOptions.push({
          where: {
            id: store.id,
          },
          data: {
            brands: updatedBrands,
            source: updatedSource,
            tags: allTags,
            updatedAt: dayjs().toISOString(),
            ...(overrides ? { overrides } : {}),
          },
        });
        addedExistingStores.push(uploadedStore);
      }

      uploadedTags.forEach((tag) => allSeenTags.add(tag));

      // remove store from validatedStores since it has been updated
      delete validatedStores[store.smartyKey];
    }

    // bulk update existing stores
    if (bulkUpdateOptions.length > 0) {
      await Promise.allSettled(
        bulkUpdateOptions.map((options) => {
          return prisma.$transaction([prisma.store.update(options)]);
        }),
      );
    }

    // bulk create stores we haven't seen before
    const storesToCreate = Object.values(validatedStores);
    const bulkCreateStores: CreatedStore[] = [];

    for (const store of storesToCreate) {
      const tags: Record<string, string[]> = {
        [brandHash]: store.tags,
      };

      store.tags.forEach((tag) => allSeenTags.add(tag));

      bulkCreateStores.push({
        ...store,
        brands: [brandHash],
        source: [sourceString],
        tags,
        createdAt: dayjs().toISOString(),
        updatedAt: dayjs().toISOString(),
      });
    }

    // bulk create stores
    if (bulkCreateStores.length > 0) {
      await prisma.store.createMany({
        data: bulkCreateStores,
      });
    }

    // generate or update brand tree
    const existingTree = await prisma.tree.findUnique({
      where: {
        brandHash,
      },
    });

    // update or create the brand's tree
    const brandTree = existingTree
      ? GeohashTree.fromJSON(existingTree.tree as string)
      : new GeohashTree();

    const storeToAddToTree = [...storesToCreate, ...addedExistingStores];

    brandTree.buildFromStores(storeToAddToTree);

    await prisma.tree.upsert({
      where: {
        brandHash,
      },
      update: {
        tree: brandTree,
      },
      create: {
        brandHash,
        tree: brandTree,
      },
    });

    // add any tags to the brand's tag array (used in edit page for tagging related operations)
    const brand = await prisma.brand.findUnique({
      where: {
        brandHash,
      },
    });

    if (!brand) {
      throw new Error("Brand not found");
    }

    const updatedTags = [...new Set([...allSeenTags, ...brand.tags])];

    if (updatedTags.length > brand.tags.length) {
      await prisma.brand.update({
        where: {
          brandHash,
        },
        data: {
          tags: updatedTags,
          updatedAt: dayjs().toISOString(),
        },
      });
    }
  } catch (error: any) {
    console.error(error);
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
  };
}

// Fetches stores based on smartyKey from

// If you're curious about keysToGeohases, here's additional context.
/*
  When a store is uploaded and the store has already been scraped, sometimes the scraper needs to do some 
  reverse lookups in order to properly validate it. This results in a store with the correct smartyKey
  but potentially incorrect geohash. 

  In the map, we use geohash to map store data with markers. If the geohashes dont match, then the 
  marker won't actually click open (since it cant find the store info). 

  So, we the geohash of whatever was uploaded and added to the tree as the source of truth
  and override the geohash of what's on the actual store in order to return properly mapped data
*/
export async function fetchStoresByKeys(
  brandHash: string,
  keysToGeohashes: { key: string; geohash: string }[],
): Promise<MarkerStore[]> {
  const keys = keysToGeohashes.map((key) => key.key);

  const stores = await prisma.store.findMany({
    where: {
      smartyKey: {
        in: keys,
      },
    },
  });

  const parsedStores = StoreArraySchema.parse(stores);

  const mappedStores: MarkerStore[] = parsedStores.map((store) => {
    const storeTags = store.tags;
    const geohash =
      keysToGeohashes.find((key) => key.key === store.smartyKey)?.geohash || "";
    const overrides = store.overrides;
    const brandOverrideExists = overrides && overrides[brandHash];

    const phone = brandOverrideExists
      ? overrides[brandHash].phone || null
      : store.phone;
    const email = brandOverrideExists
      ? overrides[brandHash].email || null
      : store.email;
    const website = brandOverrideExists
      ? overrides[brandHash].website || null
      : store.website;

    return {
      name: store.name,
      addressPrimary: store.addressPrimary,
      addressSecondary: store.addressSecondary,
      city: store.city,
      state: store.state,
      postalCode: store.postalCode,
      phone,
      email,
      website,
      geohash,
      tags: storeTags[brandHash] ?? [],
    };
  });

  return mappedStores;
}

// Updates a brand's store info
export async function updateBrandStore(
  brandHash: string,
  store: ExternalStore,
): Promise<{ success: boolean; error?: string }> {
  try {
    const sourceString = `PinPoint - ${brandHash}`;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    const existingStore = await prisma.store.findFirst({
      where: {
        id: store.id,
        source: {
          has: sourceString,
        },
      },
    });

    if (!existingStore) {
      throw new Error("Store not found");
    }

    const parsedStore = StoreSchema.parse(existingStore);
    const parsedEmail = emailRegex.test(store.email || "") ? store.email : null;

    const samePhone = store.phone === parsedStore.phone;
    const sameEmail = parsedEmail === parsedStore.email;
    const sameWebsite = store.website === parsedStore.website;
    let overrides = parsedStore.overrides;

    const newOverrides: OverrideContent = {};

    if (samePhone && sameEmail && sameWebsite) {
      if (parsedStore.overrides && parsedStore.overrides[brandHash]) {
        overrides = {
          ...parsedStore.overrides,
          [brandHash]: {
            phone: store.phone,
            email: store.email,
            website: store.website,
          },
        };
      }
    } else {
      newOverrides.phone = store.phone;
      newOverrides.email = parsedEmail;
      newOverrides.website = store.website;

      if (
        parsedStore.overrides &&
        parsedStore.overrides[brandHash] &&
        parsedStore.overrides[brandHash] !== newOverrides
      ) {
        overrides = {
          ...parsedStore.overrides,
          [brandHash]: newOverrides,
        };
      } else if (!parsedStore.overrides || !parsedStore.overrides[brandHash]) {
        overrides = {
          ...(parsedStore.overrides || {}),
          [brandHash]: newOverrides,
        };
      }
    }

    const updatedStore = {
      tags: {
        ...parsedStore.tags,
        [brandHash]: store.tags,
      },
      updatedAt: dayjs().toISOString(),
      ...(overrides ? { overrides } : {}),
    };

    await prisma.store.update({
      where: {
        id: store.id,
      },
      data: updatedStore,
    });

    return { success: true };
  } catch (error: any) {
    console.error(error);
    return { success: false, error: error.message };
  }
}

// Creates a tag for the brand
export async function createTag(
  brandHash: string,
  tag: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const existingBrand = await prisma.brand.findUnique({
      where: {
        brandHash,
      },
    });

    if (!existingBrand) {
      throw new Error("Brand not found");
    }

    if (existingBrand.tags.includes(tag)) {
      return { success: false, error: "Tag already exists" };
    }

    const updatedTags = [...new Set([...existingBrand.tags, tag])];
    await prisma.brand.update({
      where: {
        brandHash,
      },
      data: {
        tags: updatedTags,
        updatedAt: dayjs().toISOString(),
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error(error);
    return { success: false, error: error.message };
  }
}

// Deletes a brand's tag and all instances of it on stores
export async function deleteTag(
  brandHash: string,
  tag: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const sourceString = `PinPoint - ${brandHash}`;

    const existingBrand = await prisma.brand.findUnique({
      where: {
        brandHash,
      },
    });

    if (!existingBrand) {
      throw new Error("Brand not found");
    }

    const stores = await prisma.store.findMany({
      where: {
        source: {
          has: sourceString,
        },
      },
    });

    const parsedStores = StoreArraySchema.parse(stores);

    const updateOptions: {
      id: string;
      tags: Record<string, string[]>;
      updatedAt: string;
    }[] = [];

    for (const store of parsedStores) {
      if (store.tags[brandHash].includes(tag)) {
        const updatedTags = store.tags[brandHash].filter((t) => t !== tag);
        updateOptions.push({
          id: store.id,
          tags: {
            ...store.tags,
            [brandHash]: updatedTags,
          },
          updatedAt: dayjs().toISOString(),
        });
      }
    }

    await Promise.allSettled(
      updateOptions.map((store) => {
        return prisma.$transaction([
          prisma.store.update({
            where: {
              id: store.id,
            },
            data: {
              tags: store.tags,
              updatedAt: store.updatedAt,
            },
          }),
        ]);
      }),
    );

    const updatedTags = existingBrand.tags.filter((t) => t !== tag);
    await prisma.brand.update({
      where: {
        brandHash,
      },
      data: {
        tags: updatedTags,
        updatedAt: dayjs().toISOString(),
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error(error);
    return { success: false, error: error.message };
  }
}

// Edit a tag and update all store tags that has it
export async function editTag(
  brandHash: string,
  oldTag: string,
  newTag: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const sourceString = `PinPoint - ${brandHash}`;

    const existingBrand = await prisma.brand.findUnique({
      where: {
        brandHash,
      },
    });

    if (!existingBrand) {
      throw new Error("Brand not found");
    }

    const stores = await prisma.store.findMany({
      where: {
        source: {
          has: sourceString,
        },
      },
    });

    const parsedStores = StoreArraySchema.parse(stores);

    const updateOptions: {
      id: string;
      tags: Record<string, string[]>;
      updatedAt: string;
    }[] = [];

    for (const store of parsedStores) {
      if (store.tags[brandHash].includes(oldTag)) {
        const updatedTags = store.tags[brandHash].map((t) =>
          t === oldTag ? newTag : t,
        );
        updateOptions.push({
          id: store.id,
          tags: {
            ...store.tags,
            [brandHash]: updatedTags,
          },
          updatedAt: dayjs().toISOString(),
        });
      }
    }

    await Promise.allSettled(
      updateOptions.map((store) => {
        return prisma.$transaction([
          prisma.store.update({
            where: {
              id: store.id,
            },
            data: {
              tags: store.tags,
              updatedAt: store.updatedAt,
            },
          }),
        ]);
      }),
    );

    const updatedTags = existingBrand.tags.map((t) =>
      t === oldTag ? newTag : t,
    );
    await prisma.brand.update({
      where: {
        brandHash,
      },
      data: {
        tags: updatedTags,
        updatedAt: dayjs().toISOString(),
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error(error);
    return { success: false, error: error.message };
  }
}

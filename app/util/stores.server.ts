import type { BaseStore, ValidatedStore } from "app/types/stores";
import type { GeohashNode } from "app/types/tree.server.ts";
import ngeohash from "ngeohash";
import type { SmartySDK } from "../external/smarty.server";
import { Batch, client, Lookup } from "../external/smarty.server";

// Validate store addresses using Smarty API
export async function validateStoreAddresses(addresses: BaseStore[]): Promise<{
  validatedStores: Record<string, ValidatedStore>;
  invalidStores: BaseStore[];
  success: boolean;
}> {
  try {
    const addressRecord: Record<string, BaseStore> = {};

    const batches: SmartySDK.core.Batch<SmartySDK.usStreet.Lookup>[] = [];
    let batch = new Batch<SmartySDK.usStreet.Lookup>();

    let index = 0;

    for (const address of addresses) {
      const indexString = index.toString();

      const lookup = new Lookup();
      lookup.street = address.addressPrimary;
      address.addressSecondary && (lookup.secondary = address.addressSecondary);
      lookup.city = address.city;
      lookup.state = address.state;
      lookup.zipCode = address.postalCode;
      lookup.match = "enhanced";
      lookup.inputId = indexString;

      if (index % 100 === 0 && index !== 0) {
        batches.push(batch);
        batch = new Batch<SmartySDK.usStreet.Lookup>();
      }

      batch.add(lookup);

      addressRecord[indexString] = address;
      index++;
    }

    // Add the last batch if it's not empty
    if (batch.lookups.length > 0) {
      batches.push(batch);
    }

    const validatedStores: Record<string, ValidatedStore> = {};
    const invalidStores: BaseStore[] = [];

    const batchResults = await Promise.allSettled(
      batches.map((batch) => client.send(batch)),
    );

    // Combine all lookups into a single array
    const allLookups = batchResults.flatMap((result, index) => {
      if (result.status === "fulfilled") {
        return result.value.lookups;
      } else {
        console.error(`Error processing batch ${index}:`, result.reason);
        return [];
      }
    });

    for (const lookup of allLookups) {
      // handle invalid / not found address
      if (!lookup.result || lookup.result.length === 0) {
        invalidStores.push(addressRecord[lookup.inputId]);
        continue;
      }

      const result = lookup.result[0];

      if (!result.smartyKey) {
        invalidStores.push(addressRecord[lookup.inputId]);
        continue;
      }

      const validGeohash = ngeohash.encode(
        result.metadata.latitude,
        result.metadata.longitude,
        9,
      );

      const inputtedStore = addressRecord[lookup.inputId];

      const storeName = inputtedStore.name;
      const addressPrimary = `${result.components.primaryNumber} ${result.components.streetName} ${result.components.streetSuffix}`;
      const addressSecondary = result.components.secondaryNumber
        ? `${result.components.secondaryDesignator} ${result.components.secondaryNumber}`
        : null;
      const city = result.components.cityName;
      const state = result.components.state;
      const postalCode = result.components.zipCode;
      const smartyKey = result.smartyKey!;
      const phone = inputtedStore.phone;
      const email = inputtedStore.email;
      const website = inputtedStore.website;

      validatedStores[smartyKey] = {
        name: storeName,
        addressPrimary,
        addressSecondary,
        city,
        state,
        postalCode,
        smartyKey,
        geohash: validGeohash,
        phone,
        email,
        website,
        tags: inputtedStore.tags,
      };
    }

    return { validatedStores, invalidStores, success: true };
  } catch (error: any) {
    console.error(error);
    return { validatedStores: {}, invalidStores: [], success: false };
  }
}

export type MarkerData = {
  type: "marker" | "cluster" | "optimal-cluster";
  geohash: string;
  count: number;
};

// Utility functions for clustering, traversing the brand tree, and fetching top results for the sidebar search list
export class ClusterManager {
  static getPositionFromGeohash(geohashStr: string) {
    const latlon = ngeohash.decode(geohashStr);
    return { lat: latlon.latitude, lng: latlon.longitude };
  }

  // Create a cluster marker for the given geohash and child node
  static createOptimalClusterMarker(
    fullGeohash: string,
    child: GeohashNode,
  ): MarkerData {
    let maxStoreCount = 0;
    let maxStoreChildGeohash = "";

    for (const [subKey, subChild] of Object.entries(child.children)) {
      if (subChild.storeCount > maxStoreCount) {
        maxStoreCount = subChild.storeCount;
        maxStoreChildGeohash = fullGeohash + subKey;
      }
    }

    const clusterGeohash =
      maxStoreCount > 1 ? maxStoreChildGeohash : fullGeohash;

    return {
      type: "optimal-cluster",
      geohash: clusterGeohash,
      count: child.storeCount,
    };
  }

  // Checks if a marker is within the bounds of the map view (based on the radius)
  static isInBounds(
    position: { lat: number; lng: number },
    center: [number, number],
    radius: number,
  ) {
    return (
      ClusterManager.calculateDistance(
        { lat: center[0], lng: center[1] },
        position,
      ) <= radius
    );
  }

  // Fetch store keys from all of the leafs on our tree
  static getStoreKeys(node: GeohashNode): { key: string; geohash: string }[] {
    const output: { key: string; geohash: string }[] = [];

    if (node.stores) {
      return node.stores.map((store) => {
        return { key: store.key, geohash: store.geohash };
      });
    } else {
      for (const child of Object.values(node.children)) {
        output.push(...ClusterManager.getStoreKeys(child));
      }
    }

    return output;
  }

  // Recursively fetch our markers and keys for the serach list
  static traverseAndCreateMarkers(
    data: GeohashNode,
    targetLength: number,
    geohashPrefix: string,
    zoom: number,
    center: [number, number],
    radius: number,
  ): {
    markers: MarkerData[];
    keysToFetch: { key: string; geohash: string }[];
  } {
    const markersData: MarkerData[] = [];
    const keysToGeohashes: { key: string; geohash: string }[] = [];

    if (data.storeCount === 1 && data.stores) {
      const store = data.stores[0];
      const position = ClusterManager.getPositionFromGeohash(store.geohash);
      if (ClusterManager.isInBounds(position, center, radius)) {
        if (zoom <= 12) {
          markersData.push({
            type: "cluster",
            geohash: store.geohash.slice(0, 7),
            count: 1,
          });
        } else {
          markersData.push({
            type: "marker",
            geohash: store.geohash,
            count: 1,
          });
        }
        keysToGeohashes.push({ key: store.key, geohash: store.geohash });
      }
    } else {
      for (const [key, child] of Object.entries(data.children)) {
        const fullGeohash = geohashPrefix + key;
        if (child.storeCount === 1) {
          const childData = ClusterManager.traverseAndCreateMarkers(
            child,
            fullGeohash.length,
            fullGeohash,
            zoom,
            center,
            radius,
          );
          markersData.push(...childData.markers);
          keysToGeohashes.push(...childData.keysToFetch);
        } else if (fullGeohash.length === targetLength) {
          const position = ClusterManager.getPositionFromGeohash(fullGeohash);
          if (ClusterManager.isInBounds(position, center, radius)) {
            markersData.push(
              ClusterManager.createOptimalClusterMarker(fullGeohash, child),
            );
            keysToGeohashes.push(...ClusterManager.getStoreKeys(child));
          }
        } else {
          const childData = ClusterManager.traverseAndCreateMarkers(
            child,
            targetLength,
            fullGeohash,
            zoom,
            center,
            radius,
          );
          markersData.push(...childData.markers);
          keysToGeohashes.push(...childData.keysToFetch);
        }
      }
    }

    return { markers: markersData, keysToFetch: keysToGeohashes };
  }

  // Helper function to calculate distance between two points
  static calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number },
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ClusterManager.toRadians(point2.lat - point1.lat);
    const dLon = ClusterManager.toRadians(point2.lng - point1.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(ClusterManager.toRadians(point1.lat)) *
        Math.cos(ClusterManager.toRadians(point2.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Helper to convert degrees to radians
  static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

// Defined geohash prefix to zoom level
// Do not change unless you want to change how detailed clusters on per level
// From a LOT of testing, this looks best for all zoom levels
export const zoomToGeohashLength = (zoom: number) => {
  if (zoom > 11) {
    return 9;
  } else if (zoom > 10) {
    return 5;
  } else if (zoom > 8) {
    return 4;
  } else if (zoom > 5) {
    return 3;
  } else if (zoom > 2) {
    return 2;
  } else {
    return 1;
  }
};

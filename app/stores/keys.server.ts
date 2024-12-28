import prisma from "app/db.server";
import type { GoogleMapsKeySchema } from "app/types/keys";
import { GoogleMapsKeyArraySchema } from "app/types/keys";
import type { z } from "zod";

type GoogleMapsKey = z.infer<typeof GoogleMapsKeySchema>;

// Used for fetching an unused api key for initial install
export async function fetchUnusedKey(): Promise<string> {
  const allUnusedKeys = await prisma.googleMapsKey.findRaw({
    filter: {
      endpoints: {
        $in: ["https://maps.googleapis.com/maps/api/place/details/json"],
      },
      $or: [
        { is_used: { $exists: false } }, // Field does not exist
        { is_used: false }, // Field exists and is false
      ],
    },
  });

  // get all keys and find a random one
  const parsedUnusedKeys = GoogleMapsKeyArraySchema.parse(allUnusedKeys);
  const randomIndex = Math.floor(Math.random() * parsedUnusedKeys.length);
  let unusedKey: GoogleMapsKey = parsedUnusedKeys[randomIndex];

  if (!unusedKey) {
    throw new Error("No unused keys found");
  }

  // Test different keys up to 5 times until we find a valid one
  const isValidKey = await testKey(unusedKey.maps_key);

  if (!isValidKey) {
    for (let i = 0; i < 5; i++) {
      const randomIndex = Math.floor(Math.random() * parsedUnusedKeys.length);
      unusedKey = parsedUnusedKeys[randomIndex];
      if (await testKey(unusedKey.maps_key)) {
        break;
      }
    }
  }

  if (!unusedKey) {
    throw new Error("No valid keys found");
  }

  // mark key as used
  await prisma.googleMapsKey.update({
    where: {
      id: unusedKey._id.$oid,
    },
    data: {
      isUsed: true,
    },
  });

  return unusedKey.maps_key;
}

// Give it a key and fetch a new one
// Was originally used on every brand settings update, but should be done via cronjob now, or on case by case
export async function recycleKey(key: string): Promise<string> {
  const unusedKey = await fetchUnusedKey();

  await prisma.googleMapsKey.update({
    where: {
      key,
    },
    data: {
      isUsed: false,
    },
  });
  return unusedKey;
}

// Tests if the key will work
export async function testKey(key: string): Promise<boolean> {
  const apiUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=ChIJ1TBvDVRXwokRS9d9v7tlYd0&key=${key}`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    return false;
  }

  const data = await response.json();

  if (data.status === "OK") {
    return true;
  }

  return false;
}

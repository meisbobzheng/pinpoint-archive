import prisma from "app/db.server";
import { parseSearches } from "app/util/searches.server";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import ngeohash from "ngeohash";

// Record a search from the store locator
export async function recordSearch({
  brandHash,
  search,
  lat,
  lng,
}: {
  brandHash: string;
  search: string;
  lat: number;
  lng: number;
}) {
  try {
    const searchToRecord = {
      search,
      createdAt: dayjs().toISOString(),
    };

    const geohash = ngeohash.encode(lat, lng, 5);

    // We group searches into records by geohash up to 5
    // 5 is just detailed enough to show a good amount of area
    // while not so specific enough to be invasive and inefficient for storage
    const existingSearches = await prisma.searchRecord.findMany({
      where: {
        brandHash,
        geohash,
      },
    });

    // If there is an existing search record, add to it
    // Or create a new one for that geohash if its over 1000 searches already
    // (mitigates mongo record size limit)
    if (existingSearches.length) {
      const smallestSearch = existingSearches.reduce((smallest, search) => {
        return search.searches.length < smallest.searches.length
          ? search
          : smallest;
      });

      if (smallestSearch.searches.length < 1000) {
        await prisma.searchRecord.update({
          where: {
            id: smallestSearch.id,
          },
          data: {
            searches: {
              push: searchToRecord,
            },
          },
        });
      } else {
        await prisma.searchRecord.create({
          data: {
            brandHash,
            geohash,
            searches: [searchToRecord],
            city: smallestSearch.city,
            state: smallestSearch.state,
          },
        });
      }

      return;
    }

    // lookup lat lng to find city and state
    // we store this on the search record so we dont have to fetch it again every single time
    const lookup = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`,
    );

    const results = await lookup.json();
    const addressComponents = results.results[0].address_components;

    const city = addressComponents.find((component: any) =>
      component.types.includes("locality"),
    )?.long_name;

    const state = addressComponents.find((component: any) =>
      component.types.includes("administrative_area_level_1"),
    )?.short_name;

    // Don't bother recording a bad search
    if (!city || !state) {
      return;
    }

    // Record the new search
    await prisma.searchRecord.create({
      data: {
        brandHash,
        geohash,
        city,
        state,
        searches: [searchToRecord],
      },
    });
    return;
  } catch (e) {
    console.error(e);
  }
}

export type SearchOutput = {
  lat: number;
  lng: number;
  count: number;
  city: string;
  state: string;
};

// Fetch searches for a brand for analytics page
export async function fetchSearches({
  brandHash,
  startDate,
  endDate,
}: {
  brandHash: string;
  startDate?: Dayjs;
  endDate?: Dayjs;
}): Promise<SearchOutput[]> {
  const allSearches = await prisma.searchRecord.findMany({
    where: {
      brandHash,
    },
  });

  if (!allSearches) {
    return [];
  }

  // parse/validate all searches and filter if given a date range
  const searches = parseSearches({
    searches: allSearches,
    startDate,
    endDate,
  });

  const output: SearchOutput[] = [];

  // return with lat/lng instead of geohash
  searches.forEach((search) => {
    if (search.searches.length > 0) {
      const { latitude: lat, longitude: lng } = ngeohash.decode(search.geohash);
      output.push({
        lat,
        lng,
        count: search.searches.length,
        city: search.city,
        state: search.state,
      });
    }
  });

  return output;
}

// Fetches all individual searches with timestamps instead of the record
export async function exportSearches({
  brandHash,
  startDate,
  endDate,
}: {
  brandHash: string;
  startDate?: Dayjs;
  endDate?: Dayjs;
}): Promise<
  {
    search: string;
    createdAt: string;
  }[]
> {
  const allSearches = await prisma.searchRecord.findMany({
    where: {
      brandHash,
    },
  });

  if (!allSearches) {
    return [];
  }

  const searches = parseSearches({
    searches: allSearches,
    startDate,
    endDate,
  });

  const output: {
    search: string;
    createdAt: string;
  }[] = [];

  searches.forEach((search) => {
    if (search.searches.length > 0) {
      output.push(...search.searches);
    }
  });

  return output.sort((a, b) => {
    return dayjs(a.createdAt).isAfter(b.createdAt) ? -1 : 1;
  });
}

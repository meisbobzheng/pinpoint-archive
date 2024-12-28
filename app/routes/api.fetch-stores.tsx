import type { LoaderFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { prisma } from "app/db.server";
import { recordSearch } from "app/stores/searches.server";
import { fetchStoresByKeys } from "app/stores/stores.server";
import { ClusterManager, zoomToGeohashLength } from "app/util/stores.server";
import type { GeohashNode } from "../types/tree.server.ts";

// Public facing endpoint to fetch stores/clusters for a brand
export const loader: LoaderFunction = async ({
  request,
}: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  // Extract query parameters (bounds, etc.)
  const brandHash = url.searchParams.get("brandHash");
  const zoomStr = url.searchParams.get("zoom");
  const center = url.searchParams.get("center")?.split(",").map(Number);

  if (!brandHash) {
    return json([]);
  }

  if (!zoomStr) {
    return json([]);
  }

  if (!center || center.length !== 2) {
    return json([]);
  }

  const search = url.searchParams.get("search");

  // if search, non awaited async record the search (for heatmap + analytics + our record)
  if (search) {
    recordSearch({
      brandHash,
      search,
      lat: center[0],
      lng: center[1],
    });
  }

  // get the zoom level and find the mapped geohash length for that zoom level
  // read more about the geohash prefix length in the util/tree.server.ts file
  const zoom = parseInt(zoomStr);
  const targetLength = zoomToGeohashLength(zoom);
  const geohashPrefix = "";

  if (!zoom || !center) {
    return json([]);
  }

  // Calculate rough radius of the map view based on zoom, with added padding
  // Needed to estimate a rough bounds without actually pass it in (allows us to be scraped easier)
  const radius = (40075 / Math.pow(2, zoom)) * 1.3;

  // Find the tree for this brand
  const tree = await prisma.tree.findUnique({
    select: {
      tree: true,
    },
    where: {
      brandHash: brandHash,
    },
  });

  if (!tree?.tree) {
    return json([]);
  }

  // Convert json string back into Geohash tree
  const data = JSON.parse(tree.tree.toString()) as GeohashNode;

  if (data.storeCount === 0) {
    return json([]);
  }

  // Traverse the tree and create markers/clusters
  // Also gives you the smarty keys of results to fetch for the search list
  const { markers, keysToFetch } = ClusterManager.traverseAndCreateMarkers(
    data,
    targetLength,
    geohashPrefix,
    zoom,
    center as [number, number],
    radius,
  );

  // if on marker level zoom, return a maximum of 20 markers to prevent scraping.
  const markersToReturn =
    markers.length && markers[0].type === "marker"
      ? markers.slice(0, 20)
      : markers;

  // return at most 10 results in the search list (we don't want to get scraped)
  const slicedKeys = zoom >= 13 ? keysToFetch : keysToFetch.slice(0, 10);
  const stores = await fetchStoresByKeys(brandHash, slicedKeys);

  // Return the processed marker data as JSON
  return json(
    { markersData: markersToReturn, stores },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
};

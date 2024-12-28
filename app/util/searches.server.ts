import type { SearchRecord } from "@prisma/client";
import type {
  ParsedSearches,
  ParsedSearchRecord,
} from "app/types/searches.server";
import { SearchSchema } from "app/types/searches.server";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";

// Validates searches in a search record and only returns ones within the given date range, if given
export function parseSearches({
  searches,
  startDate,
  endDate,
}: {
  searches: SearchRecord[];
  startDate?: Dayjs;
  endDate?: Dayjs;
}): ParsedSearchRecord[] {
  if (!!startDate !== !!endDate) {
    throw new Error("Must provide both start and end dates");
  }

  const parsedStartDate = startDate ? startDate.startOf("day") : undefined;
  const parsedEndDate = endDate ? endDate.endOf("day") : undefined;

  const output: ParsedSearchRecord[] = searches.map((search) => {
    const parsedSearches: ParsedSearches = [];

    search.searches.forEach((search) => {
      const parsedSearch = SearchSchema.parse(search);

      if (parsedStartDate && parsedEndDate) {
        if (
          dayjs(parsedSearch.createdAt).isAfter(startDate) &&
          dayjs(parsedSearch.createdAt).isBefore(parsedEndDate)
        ) {
          parsedSearches.push(parsedSearch);
        }
      } else {
        parsedSearches.push(parsedSearch);
      }
    });

    return {
      ...search,
      searches: parsedSearches,
    };
  });

  return output;
}

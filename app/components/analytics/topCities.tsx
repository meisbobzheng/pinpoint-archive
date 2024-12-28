import { BlockStack, Card, Scrollable, Text } from "@shopify/polaris";
import type { SearchOutput } from "app/stores/searches.server";
import { useMemo } from "react";
import { SearchRow } from "./searchRow";

export function CityData({ data }: { data: SearchOutput[] }) {
  const cityLevelData = useMemo(() => {
    const groupedData = new Map<string, number>();

    data.forEach((search) => {
      const label = `${search.city}, ${search.state}`;
      const currentCount = groupedData.get(label) || 0;
      groupedData.set(label, currentCount + search.count);
    });

    console.log(groupedData.entries());

    return Array.from(groupedData.entries()).sort((a, b) => b[1] - a[1]);
  }, [data]);

  return (
    <Card>
      <BlockStack gap="300">
        <Text as="h2" variant="headingLg">
          Top Searches By City
        </Text>
        <Scrollable style={{ maxHeight: "400px" }}>
          {cityLevelData.map(([key, value], index) => {
            return (
              <SearchRow key={`search-${index}`} location={key} count={value} />
            );
          })}
        </Scrollable>
      </BlockStack>
    </Card>
  );
}

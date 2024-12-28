import { BlockStack, Card, Scrollable, Text } from "@shopify/polaris";
import { SearchRow } from "./searchRow";

export function AnalyticsCard({
  data,
  title,
  label,
}: {
  title: string;
  label: string;
  data: [string, number][];
}) {
  return (
    <Card>
      <BlockStack gap="300">
        <Text as="h2" variant="headingLg">
          {title}
        </Text>
        <Text as="p" variant="bodyMd">
          {label}
        </Text>
        <Scrollable
          style={{
            maxHeight: "400px",
            backgroundColor: "#f9fafb",
            padding: "10px",
            borderRadius: "10px",
          }}
        >
          {data.map(([key, value], index) => {
            return (
              <div key={`search-${title}-${index}`}>
                <SearchRow location={key} count={value} />
                {index !== data.length - 1 && (
                  <hr style={{ margin: "10px 0", border: "1px solid #eee" }} />
                )}
              </div>
            );
          })}
        </Scrollable>
      </BlockStack>
    </Card>
  );
}

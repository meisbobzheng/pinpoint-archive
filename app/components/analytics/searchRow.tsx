import { Text } from "@shopify/polaris";

export function SearchRow({
  location,
  count,
}: {
  location: string;
  count: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        width: "100%",
        alignItems: "center",
        padding: "5px 5px",
      }}
    >
      <Text as="p" variant="bodyMd">
        {location}
      </Text>

      <Text as="p" variant="headingMd">
        {count}
      </Text>
    </div>
  );
}

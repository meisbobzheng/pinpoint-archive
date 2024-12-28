import { BlockStack, Box, InlineStack, Text } from "@shopify/polaris";

export function FAQ({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <BlockStack gap="100">
      <Text as="h3" variant="headingMd">
        {question}
      </Text>
      <Box padding={"200"}>
        <InlineStack gap="100" align="space-between">
          <div style={{ width: "2%" }}>
            <Text as="p" variant="bodyMd">
              •
            </Text>
          </div>
          <div style={{ width: "97%" }}>
            <Text as="p" variant="bodyMd">
              {answer}
            </Text>
          </div>
        </InlineStack>
      </Box>
    </BlockStack>
  );
}

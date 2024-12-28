import { InlineStack, Link, Text } from "@shopify/polaris";

export function ArticleItem({ link, text }: { link: string; text: string }) {
  return (
    <InlineStack gap="100">
      <Text as="p" variant="bodyMd">
        •
      </Text>
      <Link
        onClick={() => {
          window.open(link, "_blank");
        }}
        target="_blank"
        monochrome
      >
        {text}
      </Link>
    </InlineStack>
  );
}

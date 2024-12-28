import { BlockStack, Card, Link, List, Text } from "@shopify/polaris";
import { HelpCenterArticles } from "app/util/articles";
import { defaultHeaders } from "./importStores";

const handleTemplateExport = () => {
  const csvString = [defaultHeaders].map((row) => row.join(",")).join("\n");

  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "location_upload_template.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// TODO : add links and more resources

export function Resources() {
  return (
    <Card>
      <BlockStack gap="200">
        <Text as="h2" variant="headingMd">
          Resources
        </Text>
        <List>
          <List.Item>
            <Link
              onClick={handleTemplateExport}
              target="_blank"
              removeUnderline
            >
              Store location upload template (.csv)
            </Link>
          </List.Item>
          <List.Item>
            <Link
              onClick={() => {
                window.open(HelpCenterArticles.LOCATIONS, "_blank");
              }}
              target="_blank"
              removeUnderline
            >
              How to upload store locations
            </Link>
          </List.Item>
        </List>
      </BlockStack>
    </Card>
  );
}

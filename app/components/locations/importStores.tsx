import { BlockStack, Card, DropZone, Link, Text } from "@shopify/polaris";
import { HelpCenterArticles } from "app/util/articles";
import { useEffect, useState } from "react";
import { MatchHeaders } from "./matchHeaders";

export const defaultHeaders: string[] = [
  "Store Name",
  "Address",
  "Address 2",
  "City",
  "State",
  "Zip",
  "Phone",
  "Email",
  "Website",
];

export function ImportStores({
  handleDropZoneDrop,
  handleDropZoneDelete,
  handleUpload,
  files,
  fetcherState,
  headers,
}: {
  handleDropZoneDrop: (
    _dropFiles: File[],
    acceptedFiles: File[],
    _rejectedFiles: File[],
  ) => void;
  handleDropZoneDelete: () => void;
  handleUpload: (headerMap: Record<string, string>, tags: string[]) => void;
  files: File[];
  fetcherState: string;
  headers: string[];
}) {
  const [headerMap, setHeaderMap] = useState<Record<string, string>>({});

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

  useEffect(() => {
    if (headers.length) {
      const newHeaderMap: Record<string, string> = {};

      defaultHeaders.forEach((defaultHeader) => {
        if (headers.includes(defaultHeader)) {
          newHeaderMap[defaultHeader] = defaultHeader;
        }
      });

      setHeaderMap(newHeaderMap);
    }
  }, [headers]);

  return (
    <Card>
      <BlockStack gap="300">
        <Text as="p" variant="headingLg">
          Import store locations
        </Text>
        <Text as="p" variant="bodyMd">
          To add stores to your store locator, import locations using the
          provided{" "}
          <Link onClick={handleTemplateExport} target="_blank" removeUnderline>
            template
          </Link>
          , or upload your own CSV file and match the appropriate headers.
        </Text>
        <Text as="p" variant="bodyMd">
          Any duplicate store addresses will be updated, and all new store
          addresses will be added to your store locator. If you would like to
          add a new column for each tag and mark each tagged store address with
          an X.
        </Text>
        <Text as="p" variant="bodyMd">
          Read more in our help center article about{" "}
          <Link
            onClick={() => {
              window.open(HelpCenterArticles.LOCATIONS, "_blank");
            }}
            target="_blank"
            removeUnderline
          >
            importing stores
          </Link>
          .
        </Text>
        <Text as="p" variant="bodyMd" fontWeight="bold">
          Please note: large file uploads may take a few minutes to process.
        </Text>

        {!files.length ? (
          <DropZone
            onDrop={handleDropZoneDrop}
            allowMultiple={false}
            variableHeight
            accept=".csv"
          >
            <DropZone.FileUpload />
          </DropZone>
        ) : (
          <BlockStack gap="300">
            <MatchHeaders
              headers={headers}
              headersMap={headerMap}
              setHeadersMap={setHeaderMap}
              handleDropZoneDelete={handleDropZoneDelete}
              handleUpload={handleUpload}
              fetcherState={fetcherState}
              fileName={files[0].name}
            />
          </BlockStack>
        )}
      </BlockStack>
    </Card>
  );
}

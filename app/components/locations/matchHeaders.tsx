import {
  Banner,
  BlockStack,
  Box,
  Button,
  ButtonGroup,
  Card,
  Divider,
  InlineStack,
  OptionList,
  Popover,
  Select,
  Text,
} from "@shopify/polaris";
import { useCallback, useEffect, useMemo, useState } from "react";
import { defaultHeaders } from "./importStores";

export function MatchHeaders({
  headers,
  headersMap,
  setHeadersMap,
  handleDropZoneDelete,
  fileName,
  handleUpload,
  fetcherState,
}: {
  headers: string[];
  headersMap: Record<string, string>;
  setHeadersMap: (headerMap: Record<string, string>) => void;
  handleDropZoneDelete: () => void;
  fileName: string;
  handleUpload: (headerMap: Record<string, string>, tags: string[]) => void;
  fetcherState: string;
}) {
  const [popoverActive, setPopoverActive] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [matchHeaderMap, setMatchHeaderMap] =
    useState<Record<string, string>>(headersMap);
  const [tags, setTags] = useState<string[]>([]);
  const [validHeaders, setValidHeaders] = useState(false);

  const checkOptionalHeader = (header: string) => {
    return (
      header === "Tags" ||
      header === "Phone" ||
      header === "Email" ||
      header === "Website"
    );
  };

  const togglePopoverActive = useCallback(
    () => setPopoverActive((popoverActive) => !popoverActive),
    [],
  );

  const popoverActivator = (
    <Button onClick={togglePopoverActive} disclosure>
      Select Tags
    </Button>
  );

  useEffect(() => {
    setMatchHeaderMap(headersMap);
  }, [headersMap]);

  const usedHeaders = useMemo(() => {
    return Object.values(matchHeaderMap);
  }, [matchHeaderMap]);

  const isValidHeaders = () => {
    const headerKeys = Object.keys(matchHeaderMap)
      .filter((header) => header !== "Tags")
      .sort();

    const allHeadersIncluded = defaultHeaders.every((header) =>
      headerKeys.includes(header),
    );

    const headerValues = Object.values(matchHeaderMap);
    const uniqueValues = new Set(headerValues);

    const allFieldsUnique = uniqueValues.size === headerValues.length;

    return allHeadersIncluded && allFieldsUnique;
  };

  const handleSaveHeaders = () => {
    if (isValidHeaders()) {
      shopify.toast.show("Saved headers!", {
        duration: 2000,
      });

      setHeadersMap(matchHeaderMap);
      setMatchHeaderMap(matchHeaderMap);
      setTags(selectedTags);
      setValidHeaders(true);
    } else {
      shopify.toast.show(
        "Please match all headers and ensure all fields are unique.",
        {
          duration: 2000,
        },
      );
    }
  };

  const resetImport = () => {
    handleDropZoneDelete();
    setHeadersMap({});
    setMatchHeaderMap({});
    setTags([]);
    setValidHeaders(false);
  };

  return (
    <div>
      <BlockStack gap="300">
        <Banner>
          <Text as="p" variant="bodyMd">
            Please match and save the headers in your file to the fields below
            or use the provided template.
          </Text>
        </Banner>
        <Card>
          <InlineStack gap="300" align="space-between" blockAlign="center">
            <Text as="p" variant="bodyMd" fontWeight="bold">
              Uploaded file: {fileName}
            </Text>
          </InlineStack>
        </Card>
        <Box
          borderColor="border-brand"
          borderRadius="200"
          borderWidth="025"
          borderStyle="solid"
          padding={"300"}
        >
          <BlockStack gap="300">
            {defaultHeaders.map((defaultHeader, index) => (
              <Box key={defaultHeader}>
                <BlockStack gap="300">
                  <InlineStack
                    key={defaultHeader}
                    blockAlign="center"
                    align="space-between"
                    gap="300"
                  >
                    <Text as="p" variant="bodyMd">
                      {defaultHeader}
                    </Text>
                    <Select
                      label=""
                      labelInline
                      options={
                        checkOptionalHeader(defaultHeader)
                          ? [...headers, "N/A"]
                          : headers
                      }
                      onChange={(value) => {
                        setMatchHeaderMap({
                          ...matchHeaderMap,
                          [defaultHeader]: value,
                        });
                      }}
                      value={matchHeaderMap[defaultHeader]}
                      placeholder="Select a field"
                    />
                  </InlineStack>
                  {index !== defaultHeaders.length - 1 && <Divider />}
                </BlockStack>
              </Box>
            ))}
          </BlockStack>
        </Box>
        <Card>
          <InlineStack gap="300" align="space-between" blockAlign="center">
            <InlineStack gap="100">
              <Text as="p" variant="bodyMd">
                Tags:
              </Text>
              {selectedTags.length > 0 ? (
                <Text as="p" variant="bodyMd" fontWeight="bold">
                  {selectedTags.join(", ")}
                </Text>
              ) : (
                <Text as="p" variant="bodyMd" tone="subdued">
                  No tags selected
                </Text>
              )}
            </InlineStack>
            <Popover
              active={popoverActive}
              activator={popoverActivator}
              onClose={togglePopoverActive}
            >
              <OptionList
                allowMultiple
                selected={selectedTags}
                onChange={setSelectedTags}
                options={headers
                  .filter((header) => !usedHeaders.includes(header))
                  .map((header) => ({
                    label: header,
                    value: header,
                  }))}
              />
            </Popover>
          </InlineStack>
        </Card>
        <ButtonGroup fullWidth>
          <Button onClick={resetImport} submit variant="secondary">
            Upload a different file
          </Button>
          <Button submit variant="primary" onClick={handleSaveHeaders}>
            Save matched headers
          </Button>
        </ButtonGroup>
        <Button
          submit
          variant="primary"
          disabled={!validHeaders}
          onClick={() => handleUpload(headersMap, tags)}
          loading={fetcherState === "submitting"}
          tone="success"
        >
          Import stores
        </Button>
      </BlockStack>
    </div>
  );
}

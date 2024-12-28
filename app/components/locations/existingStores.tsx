import {
  BlockStack,
  Box,
  Button,
  ButtonGroup,
  Card,
  IndexTable,
  InlineStack,
  SkeletonTabs,
  Spinner,
  Text,
  TextField,
  useIndexResourceState,
} from "@shopify/polaris";
import { DataTableIcon, DeleteIcon, ReplayIcon } from "@shopify/polaris-icons";
import type { IndexTableHeading } from "@shopify/polaris/build/ts/src/components/IndexTable";
import type { NonEmptyArray } from "@shopify/polaris/build/ts/src/types";
import type { ExternalStore } from "app/types/stores";
import { useCallback, useMemo, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { LoadingTable } from "./loading";

export function ExistingStores({
  stores,
  handleDelete,
  fetcherState,
  handlePageChange,
  hasNextPage,
  storeCount,
  handleExport,
}: {
  stores: ExternalStore[];
  handleDelete: (selectedResources: string[]) => void;
  fetcherState: string;
  handlePageChange: (page: number, limit?: number, search?: string) => void;
  hasNextPage: boolean;
  storeCount: number;
  handleExport: (ids: string[]) => void;
}) {
  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
    clearSelection,
  } = useIndexResourceState(stores);

  const [page, setPage] = useState(0);
  const [itemIndex, setItemIndex] = useState(1);
  const [search, setSearch] = useState("");

  const { rowMarkup, headings } = useMemo(() => {
    const headings: IndexTableHeading[] = [
      { title: "Store" },
      { title: "Address" },
      { title: "City" },
      { title: "State" },
      { title: "Zip" },
      { title: "Phone" },
      { title: "Email" },
      { title: "Website" },
    ];

    const rowMarkup =
      fetcherState === "loading" ? (
        <LoadingTable headerLength={9} />
      ) : (
        stores.map(
          (
            {
              id,
              name,
              addressPrimary,
              addressSecondary,
              city,
              state,
              postalCode,
              phone,
              email,
              website,
            },
            index,
          ) => {
            return (
              <IndexTable.Row
                id={id}
                key={id}
                selected={selectedResources.includes(id)}
                position={index}
              >
                <IndexTable.Cell>{name}</IndexTable.Cell>
                <IndexTable.Cell>{`${addressPrimary} ${addressSecondary ? ", " + addressSecondary : ""}`}</IndexTable.Cell>
                <IndexTable.Cell>{city}</IndexTable.Cell>
                <IndexTable.Cell>{state}</IndexTable.Cell>
                <IndexTable.Cell>{postalCode}</IndexTable.Cell>
                <IndexTable.Cell>{phone || "N/A"}</IndexTable.Cell>
                <IndexTable.Cell>{email || "N/A"}</IndexTable.Cell>
                <IndexTable.Cell>{website || "N/A"}</IndexTable.Cell>
              </IndexTable.Row>
            );
          },
        )
      );

    return { rowMarkup, headings };
  }, [stores, fetcherState, selectedResources]);

  const selectedStoreCount = useMemo(() => {
    return selectedResources.length > 0 ? `(${selectedResources.length})` : "";
  }, [selectedResources]);

  const pageLabel = useMemo(() => {
    if (!stores.length) {
      return "No stores found.";
    }

    return `${itemIndex} - ${itemIndex + stores.length - 1} of ${storeCount} stores`;
  }, [itemIndex, stores, storeCount]);

  const handleNext = () => {
    handlePageChange(page + 1, 10, search);
    setPage(page + 1);
    setItemIndex((page + 1) * 10 + 1);
  };

  const handlePrevious = () => {
    handlePageChange(page - 1, 10, search);
    setPage(page - 1);
    setItemIndex((page - 1) * 10 + 1);
  };

  const handleSearch = () => {
    handlePageChange(0, 10, search);
    setPage(0);
    setItemIndex(1);
  };

  const debouncedSearch = useDebouncedCallback(handleSearch, 1000);

  const handleChange = useCallback((newValue: string) => {
    setSearch(newValue);
    debouncedSearch();
  }, []);

  return (
    <Card>
      <BlockStack gap="300">
        <Box>
          <InlineStack align="space-between" blockAlign="center">
            <BlockStack gap="150">
              <Text as="p" variant="headingLg">
                Existing store locations
              </Text>
              <Text as="p" variant="bodyMd">
                See store details, search for stores, delete selected stores,
                and export your stores here.
              </Text>
            </BlockStack>
            <InlineStack gap="300">
              {fetcherState === "loading" && <Spinner size="small" />}
              <TextField
                label=""
                value={search}
                onChange={handleChange}
                placeholder="Search stores"
                autoComplete="off"
              />
              <ButtonGroup>
                <Button
                  submit
                  icon={ReplayIcon}
                  loading={fetcherState === "submitting"}
                  disabled={
                    fetcherState === "submitting" || fetcherState === "loading"
                  }
                  onClick={() => {
                    handlePageChange(page, 10, search);
                    clearSelection();
                  }}
                  variant="secondary"
                >
                  Refresh
                </Button>
                <Button
                  icon={DataTableIcon}
                  submit
                  onClick={() => {
                    handleExport(selectedResources);
                  }}
                  variant="primary"
                  disabled={stores.length === 0}
                >
                  Export store locations {selectedStoreCount} as CSV
                </Button>
                <Button
                  submit
                  icon={DeleteIcon}
                  onClick={() => {
                    handleDelete(selectedResources);
                    clearSelection();
                  }}
                  variant="secondary"
                  loading={fetcherState === "submitting"}
                  disabled={selectedResources.length === 0}
                >
                  Delete selected {selectedStoreCount} stores
                </Button>
              </ButtonGroup>
            </InlineStack>
          </InlineStack>
        </Box>
        <IndexTable
          resourceName={{
            singular: "store",
            plural: "stores",
          }}
          itemCount={stores.length}
          selectedItemsCount={
            allResourcesSelected ? "All" : selectedResources.length
          }
          onSelectionChange={handleSelectionChange}
          headings={headings as NonEmptyArray<IndexTableHeading>}
          hasZebraStriping
          emptyState={
            <div className="justify-center flex flex-col items-center align-middle">
              <Card padding={"400"}>
                <BlockStack inlineAlign="center" gap={"100"}>
                  <div>
                    <SkeletonTabs count={3} />
                  </div>
                  <Text as="p" variant="headingLg">
                    No stores found.
                  </Text>
                  <Text as="p" tone="subdued">
                    Import stores to see them here.
                  </Text>
                </BlockStack>
              </Card>
            </div>
          }
          pagination={{
            hasNext: hasNextPage && fetcherState !== "loading",
            hasPrevious: page > 0,
            onNext: handleNext,
            onPrevious: handlePrevious,
            label: pageLabel,
          }}
        >
          {rowMarkup}
        </IndexTable>
      </BlockStack>
    </Card>
  );
}

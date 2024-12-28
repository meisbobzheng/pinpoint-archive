import type { Libraries } from "@react-google-maps/api";
import { useJsApiLoader } from "@react-google-maps/api";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, useFetcher, useLoaderData } from "@remix-run/react";
import {
  BlockStack,
  Button,
  Card,
  DatePicker,
  InlineStack,
  Layout,
  Page,
  Popover,
  Spinner,
  Text,
} from "@shopify/polaris";
import { DataTableIcon, ReplayIcon } from "@shopify/polaris-icons";
import { AnalyticsCard } from "app/components/analytics/analyticsCard";
import { Heatmap } from "app/components/analytics/heatmap";
import { authenticate } from "app/shopify.server";
import { getStoreBrand } from "app/stores/brands.server";
import type { SearchOutput } from "app/stores/searches.server";
import { exportSearches, fetchSearches } from "app/stores/searches.server";
import { BrandSettingsSchema } from "app/types/brands";
import { getStringField } from "app/util/forms.server";
import { heatmapLibraries } from "app/util/map";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const { brand } = await getStoreBrand(admin, admin.rest.session.shop);
  const brandSettings = BrandSettingsSchema.parse(brand.settings);

  const url = new URL(request.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  const searchData: SearchOutput[] = await fetchSearches({
    brandHash: brand.brandHash,
    startDate: startDate ? dayjs(startDate) : undefined,
    endDate: endDate ? dayjs(endDate) : undefined,
  });

  return json({
    key: brandSettings.apiKey,
    searchData,
  });
};

export const action = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const { brand } = await getStoreBrand(admin, admin.rest.session.shop);

  const formData = await request.formData();
  const startDate = getStringField(formData, "startDate");
  const endDate = getStringField(formData, "endDate");

  try {
    const exportData = await exportSearches({
      brandHash: brand.brandHash,
      startDate: startDate ? dayjs(startDate) : undefined,
      endDate: endDate ? dayjs(endDate) : undefined,
    });

    return json({
      dataToExport: exportData,
    });
  } catch (e: any) {
    return new Response(e.message, { status: 400 });
  }
};

export default function AnalyticsPage() {
  const { key: initialKey, searchData: initialSearchData } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const now = dayjs();
  const [key] = useState(initialKey);

  const [searchData, setSearchData] = useState(initialSearchData);
  const [popoverActive, setPopoverActive] = useState(false);
  const [{ month, year }, setDate] = useState({
    month: now.month(),
    year: now.year(),
  });
  const [selectedDates, setSelectedDates] = useState<{
    start: Date;
    end: Date;
  }>();

  const togglePopoverActive = useCallback(
    () => setPopoverActive((popoverActive) => !popoverActive),
    [],
  );

  const activator = (
    <Button onClick={togglePopoverActive} disclosure>
      Select a time range
    </Button>
  );

  const handleMonthChange = useCallback(
    (month: number, year: number) => setDate({ month, year }),
    [],
  );

  const handleExport = () => {
    const formData = new FormData();
    if (selectedDates) {
      formData.append("startDate", dayjs(selectedDates.start).toISOString());
      formData.append("endDate", dayjs(selectedDates.end).toISOString());
    }

    fetcher.submit(formData, { method: "POST" });
  };

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: key,
    libraries: heatmapLibraries as Libraries,
  });

  const renderMap = () => {
    return <Heatmap data={searchData} />;
  };

  useEffect(() => {
    if (fetcher.data?.searchData) {
      setSearchData(fetcher.data.searchData);
    }
    if (fetcher.data?.dataToExport) {
      if (fetcher.data.dataToExport.length === 0) {
        shopify.toast.show("No search data found.", {
          duration: 2000,
        });
        return;
      }

      const csvString = [
        ["Search", "Date"],
        ...fetcher.data.dataToExport.map(
          (search: { search: string; createdAt: string }) => {
            // Escape fields with quotes and replace any existing quotes within the field
            const safeSearch = `"${search.search.replace(/"/g, '""')}"`;
            const safeDate = `"${search.createdAt.replace(/"/g, '""')}"`;
            return [safeSearch, safeDate];
          },
        ),
      ]
        .map((row) => row.join(","))
        .join("\n");

      const blob = new Blob([csvString], {
        type: "text/csv;charset=utf-8;",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "search_data.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return;
    }
  }, [fetcher.data]);

  useMemo(() => {
    if (selectedDates) {
      fetcher.load(
        `?startDate=${dayjs(selectedDates.start).toISOString()}&endDate=${dayjs(
          selectedDates.end,
        ).toISOString()}`,
      );
    }
  }, [selectedDates]);

  const { cityLevelData, stateLevelData } = useMemo(() => {
    const groupedCities = new Map<string, number>();
    const groupedStates = new Map<string, number>();

    searchData.forEach((search) => {
      const cityLabel = `${search.city}, ${search.state}`;
      const currentCount = groupedCities.get(cityLabel) || 0;
      groupedCities.set(cityLabel, currentCount + search.count);

      const currentStateCount = groupedStates.get(search.state) || 0;
      groupedStates.set(search.state, currentStateCount + search.count);
    });

    const cityLevelData = Array.from(groupedCities.entries()).sort(
      (a, b) => b[1] - a[1],
    );
    const stateLevelData = Array.from(groupedStates.entries()).sort(
      (a, b) => b[1] - a[1],
    );

    return {
      cityLevelData,
      stateLevelData,
    };
  }, [searchData]);

  return (
    <Page
      backAction={{
        content: "Back",
        onAction: () => {
          window.history.back();
        },
      }}
      secondaryActions={
        <div
          style={{
            marginTop: "12px",
            marginRight: "10px",
          }}
        >
          <InlineStack gap="300" blockAlign="center">
            {fetcher.state === "loading" && <Spinner size="small" />}
            <Button
              icon={ReplayIcon}
              variant="secondary"
              disabled={fetcher.state !== "idle"}
              loading={fetcher.state !== "idle"}
              onClick={() => {
                setSelectedDates(undefined);
                fetcher.load("");
              }}
            >
              Refresh
            </Button>
            <Button
              icon={DataTableIcon}
              variant="secondary"
              disabled={fetcher.state === "submitting"}
              loading={fetcher.state === "submitting"}
              onClick={handleExport}
            >
              Export search data
            </Button>
            <Popover
              active={popoverActive}
              activator={activator}
              onClose={togglePopoverActive}
            >
              <Card>
                <DatePicker
                  month={month}
                  year={year}
                  onChange={setSelectedDates}
                  onMonthChange={handleMonthChange}
                  selected={selectedDates}
                  multiMonth
                  allowRange
                  disableDatesAfter={now.toDate()}
                />
              </Card>
            </Popover>
          </InlineStack>
        </div>
      }
      title="Your analytics"
      subtitle="View your store locator's search analytics here"
      fullWidth
    >
      <Layout>
        <Layout.Section variant="fullWidth">
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingLg">
                Search Heatmap
              </Text>
              <Text as="p" variant="bodyMd">
                View your most popular search regions here. Please refresh the
                page if your map is not loading.
              </Text>
              {isLoaded ? renderMap() : <Spinner size="large" />}
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section variant="oneHalf">
          <AnalyticsCard
            title="Searches by City"
            label="View your most popular search cities"
            data={cityLevelData}
          />
        </Layout.Section>
        <Layout.Section variant="oneHalf">
          <AnalyticsCard
            title="Searches by State"
            label="View your most popular search states"
            data={stateLevelData}
          />
        </Layout.Section>
      </Layout>
      <div style={{ marginBottom: "30px" }} />
    </Page>
  );
}

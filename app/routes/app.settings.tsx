import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, useFetcher, useLoaderData } from "@remix-run/react";
import {
  BlockStack,
  Box,
  Button,
  ButtonGroup,
  Card,
  Checkbox,
  ChoiceList,
  FormLayout,
  InlineStack,
  Layout,
  Link,
  Page,
  Tabs,
  Text,
  TextField,
} from "@shopify/polaris";
import { ColorInput } from "app/components/settings/colors";
import { authenticate } from "app/shopify.server";
import { getStoreBrand, updateBrandSettings } from "app/stores/brands.server";
import {
  BrandSettingsSchema,
  DEFAULT_BRAND_SETTINGS,
  PresetMapThemes,
} from "app/types/brands";
import { useCallback, useEffect, useState } from "react";
import { generateStoreLocatorHTML } from "../components/locator/storeLocator";
import { getStringField, getTField } from "../util/forms.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  // fetch settings here
  const { brand } = await getStoreBrand(admin, admin.rest.session.shop);
  const settings = BrandSettingsSchema.parse(brand.settings);

  return {
    //settings...
    settings,
    storeLocatorHTML: generateStoreLocatorHTML({
      appUrl: process.env.SHOPIFY_APP_URL || "http://localhost:36709",
      brandHash: brand.brandHash,
      ...settings,
    }),
  };
};

export const action = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const formData = await request.formData();

  const { brand } = await getStoreBrand(admin, admin.rest.session.shop);

  const brandSettings = BrandSettingsSchema.parse(brand.settings);

  const newSettings = {
    // Colors
    backgroundColor: getStringField(formData, "backgroundColor"),
    textColor: getStringField(formData, "textColor"),
    clusterColor: getStringField(formData, "clusterColor"),
    markerColor: getStringField(formData, "markerColor"),

    // Appearance
    theme: getTField<PresetMapThemes>(formData, "theme"),
    layout: getStringField(formData, "layout") as
      | "sidebarleft"
      | "sidebarright",
    showAttribution: getStringField(formData, "showAttribution") === "true",

    // Search
    searchPlaceholder: getStringField(formData, "searchPlaceholder"),
    language: getStringField(formData, "language"),

    // Advanced
    customCSS: getStringField(formData, "customCSS"),

    // key
    apiKey: brandSettings.apiKey,
  };

  await updateBrandSettings(admin, {
    settings: newSettings,
  });

  // Find the existing page by handle
  const pages = await admin.rest.resources.Page.all({
    session: admin.rest.session,
    handle: "store-locator",
  });

  // Check if the page exists
  if (pages.data.length > 0) {
    const page = pages.data[0]; // Get the first matching page

    // Update the page properties
    page.title = "Store Locator";
    page.body_html = generateStoreLocatorHTML({
      appUrl: process.env.SHOPIFY_APP_URL || "",
      brandHash: brand.brandHash,
      ...newSettings,
      clusterColor: newSettings.clusterColor,
      markerColor: newSettings.markerColor,
      customCSS: newSettings.customCSS,
      theme: newSettings.theme,
    });

    // Save the changes
    await page.save({ update: true });
  } else {
    console.error("Page not found.");
    return json({ success: false });
  }

  return json({ success: true });
};

export default function SettingsPage() {
  const { settings, storeLocatorHTML } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  // Colors states
  //const [isDirty, setIsDirty] = useState(false);
  const [formBgColor, setFormBgColor] = useState(settings.backgroundColor);
  const [formTextColor, setFormTextColor] = useState(settings.textColor);
  const [formClusterColor, setFormClusterColor] = useState(
    settings.clusterColor,
  );
  const [formMarkerColor, setFormMarkerColor] = useState(settings.markerColor);

  // Appearance states
  const [formMapTheme, setFormMapTheme] = useState(settings.theme);
  const [formLayout, setFormLayout] = useState<"sidebarleft" | "sidebarright">(
    settings.layout,
  );
  const [showAttribution, setShowAttribution] = useState(true);

  // Search states
  const [searchPlaceholder, setSearchPlaceholder] = useState(
    "Search locations...",
  );
  const [language, setLanguage] = useState("en");

  // Advanced states
  const [formCustomCSS, setFormCustomCSS] = useState(settings.customCSS || "");
  const [customMapID, setCustomMapID] = useState(
    Object.values<string>(PresetMapThemes).includes(settings.theme)
      ? ""
      : settings.theme,
  );

  // tabs states
  const [activeButtonIndex, setActiveButtonIndex] = useState(0);
  const [selected, setSelected] = useState(0);

  const tabs = [
    {
      id: "base-appearance",
      content: "Colors",
      panelID: "appearance-content-1",
    },
    {
      id: "base-appearance-2",
      content: "Appearance",
      panelID: "appearance-content-2",
    },
    {
      id: "search",
      content: "Search",
      panelID: "search-content-1",
    },
    {
      id: "advanced",
      content: "Advanced",
      panelID: "advanced-content-1",
    },
  ];

  const handleTabChange = useCallback(
    (selectedTabIndex: number) => setSelected(selectedTabIndex),
    [],
  );

  const handleButtonClick = useCallback(
    (index: number) => {
      if (activeButtonIndex === index) return;
      setActiveButtonIndex(index);
    },
    [activeButtonIndex],
  );

  const handleRevertToDefault = (currentTab: number) => {
    switch (currentTab) {
      case 0:
        setFormBgColor(DEFAULT_BRAND_SETTINGS.backgroundColor);
        setFormTextColor(DEFAULT_BRAND_SETTINGS.textColor);
        setFormClusterColor(DEFAULT_BRAND_SETTINGS.clusterColor);
        setFormMarkerColor(DEFAULT_BRAND_SETTINGS.markerColor);
        break;
      case 1:
        setFormMapTheme(DEFAULT_BRAND_SETTINGS.theme);
        setFormLayout(
          DEFAULT_BRAND_SETTINGS.layout as "sidebarleft" | "sidebarright",
        );
        setShowAttribution(DEFAULT_BRAND_SETTINGS.showAttribution);
        break;
      case 2:
        setSearchPlaceholder(DEFAULT_BRAND_SETTINGS.searchPlaceholder);
        setLanguage(DEFAULT_BRAND_SETTINGS.language);
        break;
      case 3:
        setFormCustomCSS(DEFAULT_BRAND_SETTINGS.customCSS || "");
        break;
    }
  };

  const handleSubmit = () => {
    const formData = new FormData();
    // Colors
    formData.append("backgroundColor", formBgColor);
    formData.append("textColor", formTextColor);
    formData.append("clusterColor", formClusterColor);
    formData.append("markerColor", formMarkerColor);

    // Appearance
    formData.append("theme", customMapID.length ? customMapID : formMapTheme);
    formData.append("layout", formLayout);
    formData.append("showAttribution", showAttribution.toString());

    // Search
    formData.append("searchPlaceholder", searchPlaceholder);
    formData.append("language", language);

    // Advanced
    formData.append("customCSS", formCustomCSS);

    fetcher.submit(formData, { method: "POST" });
  };

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Settings saved!", {
        duration: 2000,
      });
    } else if (fetcher.data?.success === false) {
      shopify.toast.show("Error saving settings.", {
        duration: 2000,
      });
    }
  }, [fetcher.data]);

  return (
    <Page
      backAction={{
        content: "Back",
        onAction: () => {
          window.history.back();
        },
      }}
      title="Your store locator settings"
      subtitle="Preview and edit your store locator settings here"
      fullWidth
    >
      <Layout>
        <Layout.Section variant="fullWidth">
          <Tabs tabs={tabs} selected={selected} onSelect={handleTabChange}>
            <Card>
              <Box>
                <BlockStack gap="300">
                  {selected === 0 && (
                    <FormLayout>
                      <ColorInput
                        label="Background color"
                        helpText="Specifies the background color of the widget."
                        value={formBgColor}
                        setValue={(value) => {
                          setFormBgColor(value);
                        }}
                      />
                      <ColorInput
                        label="Text color"
                        helpText="Specifies the color of the text on the sidebar."
                        value={formTextColor}
                        setValue={(value) => {
                          setFormTextColor(value);
                        }}
                      />
                      <ColorInput
                        label="Cluster color"
                        helpText="Specifies the color of the clusters on the map."
                        value={formClusterColor}
                        setValue={(value) => {
                          setFormClusterColor(value);
                        }}
                      />
                      <ColorInput
                        label="Marker color"
                        helpText="Specifies the color of the markers on the map."
                        value={formMarkerColor}
                        setValue={(value) => {
                          setFormMarkerColor(value);
                        }}
                      />
                    </FormLayout>
                  )}
                  {selected === 1 && (
                    <FormLayout>
                      <ChoiceList
                        title="Map theme"
                        choices={[
                          { label: "Default", value: PresetMapThemes.DEFAULT },
                          { label: "Clean", value: PresetMapThemes.CLEAN },
                          { label: "Light", value: PresetMapThemes.LIGHT },
                          // { label: "Pastel", value: PresetMapThemes.PASTEL },
                        ]}
                        selected={[formMapTheme]}
                        onChange={(value) => {
                          setFormMapTheme(value[0]);
                        }}
                      />
                      <ChoiceList
                        title="Layout"
                        choices={[
                          {
                            label: "Sidebar left, map right",
                            value: "sidebarleft",
                          },
                          {
                            label: "Map left, sidebar right",
                            value: "sidebarright",
                          },
                        ]}
                        selected={[formLayout]}
                        onChange={(value) => {
                          setFormLayout(
                            value[0] as "sidebarleft" | "sidebarright",
                          );
                        }}
                      />
                      <Checkbox
                        label="Show attribution"
                        helpText={
                          'Specifies whether to show the "Powered by PinPoint" text.'
                        }
                        checked={showAttribution}
                        onChange={() => {
                          setShowAttribution((value) => !value);
                        }}
                      />
                    </FormLayout>
                  )}
                  {selected === 2 && (
                    <FormLayout>
                      <TextField
                        label="Search placeholder"
                        helpText="Specifies the placeholder text for the search field."
                        value={searchPlaceholder}
                        onChange={(value) => {
                          setSearchPlaceholder(value);
                        }}
                        autoComplete="off"
                      />
                      <ChoiceList
                        title="Language"
                        choices={[
                          {
                            label: "English",
                            value: "en",
                          },
                          {
                            label: "French",
                            value: "fr",
                          },
                        ]}
                        selected={[language]}
                        onChange={(value) => {
                          setLanguage(value[0]);
                        }}
                      />
                    </FormLayout>
                  )}
                  {selected === 3 && (
                    <FormLayout>
                      <TextField
                        label="Custom CSS"
                        placeholder={
                          ".store-locator-box {\n\tbackground-color: #fff; \n} ... "
                        }
                        helpText="Specifies custom CSS to apply to the store locator. (Notes: [1] Use spaces instead of tabs to indent. [2] To see component classes and IDs, see the styles in the code below.)"
                        value={formCustomCSS}
                        onChange={(value) => {
                          setFormCustomCSS(value);
                        }}
                        autoComplete="off"
                        multiline
                        monospaced
                      />
                      <TextField
                        label="Custom Map ID"
                        helpText={
                          <Text as="span" variant="bodyMd">
                            Use your own custom map ID to configure the map
                            theme. Read more about custom map IDs{" "}
                            <Link
                              onClick={() => {}}
                              target="_blank"
                              removeUnderline
                            >
                              here.
                            </Link>
                          </Text>
                        }
                        placeholder="Ex: f6f6917c16792a1f"
                        value={customMapID}
                        onChange={(value) => {
                          setCustomMapID(value);
                        }}
                        autoComplete="off"
                      />
                      <BlockStack gap="200">
                        <InlineStack align="space-between" blockAlign="center">
                          <BlockStack gap="100">
                            <Text as="p" variant="bodyMd">
                              Map Locator Code
                            </Text>
                            <Text as="p" variant="bodyMd">
                              Copy and paste the code below for manual map
                              installations.
                            </Text>
                            <Text as="p" variant="bodyMd">
                              Please note, you will need to copy and paste your
                              code again after any map settings changes.
                            </Text>
                          </BlockStack>
                          <div>
                            <Button
                              onClick={() => {
                                navigator.clipboard.writeText(storeLocatorHTML);
                                shopify.toast.show(
                                  "Copied code to clipboard!",
                                  {
                                    duration: 2000,
                                  },
                                );
                              }}
                              variant="secondary"
                              fullWidth={false}
                            >
                              Copy code
                            </Button>
                          </div>
                        </InlineStack>

                        <TextField
                          label=""
                          value={storeLocatorHTML}
                          disabled
                          autoComplete="off"
                          multiline
                          maxHeight={"150px"}
                        />
                      </BlockStack>
                    </FormLayout>
                  )}
                  <ButtonGroup fullWidth>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        handleRevertToDefault(selected);
                      }}
                    >
                      Revert to Default
                    </Button>
                    <Button
                      variant="primary"
                      loading={
                        fetcher.state === "loading" ||
                        fetcher.state === "submitting"
                      }
                      onClick={handleSubmit}
                    >
                      Save
                    </Button>
                  </ButtonGroup>
                </BlockStack>
              </Box>
            </Card>
          </Tabs>
        </Layout.Section>
        <Layout.Section variant="fullWidth">
          <div
            style={{
              paddingLeft: "10px",
            }}
          >
            <BlockStack gap="300">
              <Text as="h2" variant="headingXl">
                Preview
              </Text>
              <ButtonGroup variant="segmented">
                <Button
                  pressed={activeButtonIndex === 0}
                  onClick={() => handleButtonClick(0)}
                >
                  Desktop
                </Button>
                <Button
                  pressed={activeButtonIndex === 1}
                  onClick={() => handleButtonClick(1)}
                >
                  Mobile
                </Button>
              </ButtonGroup>
            </BlockStack>
          </div>
        </Layout.Section>
        <Layout.Section variant="fullWidth">
          <BlockStack gap="300" align="center">
            {storeLocatorHTML && (
              <div
                style={{
                  position: "relative",
                  width: activeButtonIndex === 0 ? "100%" : "450px",
                  height: "0",
                  paddingBottom: "56.25%",
                }}
              >
                <iframe
                  title="store-locator-preview"
                  srcDoc={storeLocatorHTML}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    border: "none",
                    overflow: "auto",
                  }}
                  allow="geolocation;"
                />
              </div>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

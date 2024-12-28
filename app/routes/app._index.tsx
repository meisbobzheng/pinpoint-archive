import type { LoaderFunctionArgs } from "@remix-run/node";
import { BlockStack, Card, Layout, Page, Text } from "@shopify/polaris";
import { HelpCenter } from "app/components/help/helpCenter";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return new Response(null, { status: 200 });
};

export default function LandingPage() {
  return (
    <Page title="PinPoint" fullWidth>
      <Layout>
        <Layout.Section variant="fullWidth">
          <Card>
            <img
              src="https://nyc3.digitaloceanspaces.com/reprally/img/Screenshot%202024-12-06%20at%205.42.55%E2%80%AFPM.png"
              width={"100%"}
              alt="pp-banner"
            />
          </Card>
        </Layout.Section>
        <Layout.Section variant="oneHalf">
          <BlockStack gap="300">
            <Card>
              <BlockStack gap="300">
                <Text as="p" variant="headingLg">
                  Get started here:
                </Text>
                <Text as="p" variant="bodyMd">
                  Welcome to PinPoint!
                </Text>
                <Text as="p" variant="bodyMd" fontWeight="bold">
                  If you have an online store installed, your store locator
                  should already be configured and ready to go!
                </Text>
                <div
                  style={{
                    padding: "10px",
                    borderRadius: "10px",
                    backgroundColor: "#f9fafb",
                  }}
                >
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd" fontWeight="bold">
                      What is PinPoint?
                    </Text>
                    <Text as="p" variant="bodyMd">
                      - PinPoint is a free, easy-to-use store locator that
                      allows you to display your store locations on a map.
                    </Text>
                    <Text as="p" variant="bodyMd">
                      - Boost your sales and brand presence by helping your
                      customers find your products in-store.
                    </Text>
                    <Text as="p" variant="bodyMd">
                      - Customize your store locator to best suit your brand's
                      needs, view your search analytics to analyze popular
                      search locations, and more.
                    </Text>
                    <Text as="p" variant="bodyMd" fontWeight="bold">
                      If you have any questions, feel free to contact us using
                      the contact form in the Help Center.
                    </Text>
                  </BlockStack>
                </div>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingLg">
                Read more here:
              </Text>
              <Text as="p" variant="bodyMd">
                Get started with your store locator by reading through our
                articles.
              </Text>
              <div
                style={{
                  padding: "10px",
                  borderRadius: "10px",
                  backgroundColor: "#f9fafb",
                }}
              >
                <HelpCenter />
              </div>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

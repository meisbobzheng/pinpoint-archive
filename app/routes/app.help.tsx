import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, useFetcher } from "@remix-run/react";
import {
  BlockStack,
  Card,
  Layout,
  Page,
  Scrollable,
  Text,
} from "@shopify/polaris";
import { ContactCard } from "app/components/help/contact";
import { HelpCenter } from "app/components/help/helpCenter";
import { FAQ } from "app/components/help/question";
import { authenticate } from "app/shopify.server";
import { getStoreBrand } from "app/stores/brands.server";
import { createNewInquiry } from "app/stores/inquiries.server";
import type { MessageType } from "app/types/inquiries";
import { getStringField, getTField } from "app/util/forms.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const formData = await request.formData();

  const { brand } = await getStoreBrand(admin, admin.rest.session.shop);
  const brandHash = brand.brandHash;

  const name = getStringField(formData, "name");
  const email = getStringField(formData, "email");
  const messageType = getTField<MessageType>(formData, "messageType");
  const message = getStringField(formData, "message");

  try {
    await createNewInquiry({
      name,
      email,
      messageType,
      message,
      brandHash,
    });
    return json({
      success: true,
    });
  } catch (e: any) {
    return new Response(e.message, { status: 400 });
  }
};

export default function HelpPage() {
  const fetcher = useFetcher<typeof action>();

  const handleInquirySubmit = ({
    name,
    email,
    messageType,
    message,
  }: {
    name: string;
    email: string;
    messageType: string;
    message: string;
  }) => {
    const formData = new FormData();

    formData.append("name", name);
    formData.append("email", email);
    formData.append("messageType", messageType);
    formData.append("message", message);

    fetcher.submit(formData, {
      method: "POST",
    });
  };

  if (fetcher.data?.success) {
    shopify.toast.show("Inquiry submitted!", {
      duration: 2000,
    });
  } else if (fetcher.data?.success === false) {
    shopify.toast.show("Error submitting inquiry.", {
      duration: 2000,
    });
  }

  return (
    <Page
      backAction={{
        content: "Back",
        onAction: () => {
          window.history.back();
        },
      }}
      title="Help Center"
      subtitle="Get help with your store locator here"
      fullWidth
    >
      <Layout>
        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingLg">
                Frequently Asked Questions
              </Text>
              <BlockStack gap="100">
                <Text as="p" variant="bodyMd">
                  See some of our most frequently asked questions here.
                </Text>
                <Text as="p" variant="bodyMd">
                  For any other questions or requests, please contact us using
                  the contact form below.
                </Text>
              </BlockStack>

              <div
                style={{
                  padding: "10px",
                  borderRadius: "10px",
                  backgroundColor: "#f9fafb",
                }}
              >
                <Scrollable
                  style={{ maxHeight: "275px" }}
                  scrollbarWidth="thin"
                >
                  <BlockStack gap="200">
                    <FAQ
                      question="How do I add a location to my store locator?"
                      answer="You can bulk upload locations using a .CSV file, or you can add locations individually. Read more in our help center article about adding and editing locations to your store locator."
                    />
                    <FAQ
                      question="How do I configure my map settings?"
                      answer="You can configure your map settings in the settings page. Read more in our help center article about configuring custom settings for your map."
                    />
                    <FAQ
                      question="How do delete or edit my locations?"
                      answer="You can edit your locations in the Edit page. To delete locations, select the locations you want to delete and click the delete button. Read more in our help center article about adding and editing locations to your store locator."
                    />
                    <FAQ
                      question="I want to configure some parts of the map that aren't in the settings page. How do I do that?"
                      answer="You can use custom CSS to configure the map in order to override PinPoint's preset map styles."
                    />
                    <FAQ
                      question="How do I use tags?"
                      answer="Tags are a way to add additional information about your stores. Read more in our help center article about tags."
                    />
                  </BlockStack>
                </Scrollable>
              </div>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section variant="oneHalf">
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingLg">
                Help Articles
              </Text>
              <Text as="p" variant="bodyMd">
                Learn more about how to use your store locator here.
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
        <Layout.Section variant="fullWidth">
          <ContactCard handleSubmit={handleInquirySubmit} />
        </Layout.Section>
        <Layout.Section variant="fullWidth">
          <div style={{ marginBottom: "30px" }} />
        </Layout.Section>
      </Layout>
    </Page>
  );
}

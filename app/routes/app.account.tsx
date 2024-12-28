import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  BlockStack,
  Box,
  Button,
  Card,
  FormLayout,
  Page,
  TextField,
} from "@shopify/polaris";
import { authenticate } from "app/shopify.server";
import { getStoreBrand, updateBrandInfo } from "app/stores/brands.server";
import { getStringField } from "app/util/forms.server";
import { useState } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const { brand } = await getStoreBrand(admin, admin.rest.session.shop);

  return {
    name: brand.name,
    website: brand.website,
    email: brand.email,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const formData = await request.formData();

  await updateBrandInfo(admin, {
    name: getStringField(formData, "name"),
    website: getStringField(formData, "website"),
    email: getStringField(formData, "email"),
  });

  return new Response(null, { status: 200 });
};

export default function AccountPage() {
  const { name, website, email } = useLoaderData<typeof loader>();

  const [formName, setFormName] = useState(name);
  const [formWebsite, setFormWebsite] = useState(website);
  const [formEmail, setFormEmail] = useState(email || "");

  const fetcher = useFetcher<typeof action>();

  return (
    <Page
      backAction={{
        content: "Back",
        onAction: () => {
          window.history.back();
        },
      }}
      title="Your account"
      subtitle="Edit your store's account info here"
      fullWidth
    >
      <Card>
        <Box>
          <BlockStack gap="300" align="end">
            <FormLayout>
              <TextField
                label="Store name"
                onChange={(e) => {
                  setFormName(e);
                }}
                value={formName}
                autoComplete="off"
              />
              <TextField
                type="email"
                label="Account email"
                onChange={(e) => {
                  setFormEmail(e);
                }}
                autoComplete="email"
                value={formEmail}
              />
              <TextField
                label="Store website"
                onChange={(e) => {
                  setFormWebsite(e);
                }}
                autoComplete="off"
                value={formWebsite}
              />
            </FormLayout>
            <Button
              size="large"
              variant="primary"
              disabled={
                !formName.length || !formEmail.length || !formWebsite.length
              }
              onClick={() => {
                const formData = new FormData();
                formData.append("name", formName);
                formData.append("website", formWebsite);
                formData.append("email", formEmail);

                fetcher.submit(formData, { method: "POST" });
              }}
              loading={fetcher.state === "submitting"}
            >
              Save
            </Button>
          </BlockStack>
        </Box>
      </Card>
    </Page>
  );
}

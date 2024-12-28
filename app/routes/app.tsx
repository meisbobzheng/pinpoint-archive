import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { boundary } from "@shopify/shopify-app-remix/server";

import { generateStoreLocatorHTML } from "../components/locator/storeLocator";
import { authenticate } from "../shopify.server";
import { getStoreBrand } from "../stores/brands.server";
import { BrandSettingsSchema } from "../types/brands";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const { shop, id } = admin.rest.session;

  if (!shop || !id) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const { brand, initialInstall } = await getStoreBrand(admin, shop);
  if (initialInstall) {
    try {
      const brandSettings = BrandSettingsSchema.parse(brand.settings);

      const page = new admin.rest.resources.Page({
        session: admin.rest.session,
      });
      page.title = "Store Locator";
      page.body_html = generateStoreLocatorHTML({
        appUrl: process.env.SHOPIFY_APP_URL || "http://localhost:36709",
        brandHash: brand.brandHash,
        ...brandSettings,
      });
      page.handle = "store-locator";
      await page.save();
    } catch (e: any) {
      console.error(e);
    }
  }

  return json({
    apiKey: process.env.SHOPIFY_API_KEY || "",
    shop,
    id,
    brandHash: brand?.brandHash,
  });
};

export default function App() {
  const { apiKey, shop, id, brandHash } = useLoaderData<typeof loader>();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey} theme="light">
      <NavMenu>
        <Link to="/app" rel="home">
          Home
        </Link>
        <Link to="/app/locations">Locations</Link>
        <Link to="/app/edit">Edit</Link>
        <Link to="/app/settings">Settings</Link>
        <Link to="/app/analytics">Analytics</Link>
        <Link to="/app/account">Account</Link>
        <Link to="/app/help">Help</Link>
      </NavMenu>
      <Outlet context={{ shop, id, brandHash }} />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

export type RootContext = {
  shop: string;
  id: string;
  brandHash: string;
};

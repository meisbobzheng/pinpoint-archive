import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, session } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  return new Response("we do not store customer data", { status: 200 });
};

// THIS IS A MANDATORY COMPLIANCE WEBHOOK FOR SHOPIFY

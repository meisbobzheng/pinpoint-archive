import type { ActionFunctionArgs } from "@remix-run/node";
import { prisma } from "../db.server";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic, admin } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    await prisma.session.deleteMany({ where: { shop } });

    try {
      const pages = await admin.rest.resources.Page.all({
        session: admin.rest.session,
        handle: "store-locator",
      });

      if (pages.data.length && pages.data[0].id) {
        await admin.rest.resources.Page.delete({
          session: admin.rest.session,
          id: pages.data[0].id,
        });
      }
    } catch {
      console.error("Page not found.");
    }
  }

  return new Response();
};

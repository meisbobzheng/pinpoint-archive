# PinPoint

The greatest ~free store locator~ store locator <ins>ever</ins>.

Please read through shopify documentation so you know what you're doing.

- https://shopify.dev/docs/api/shopify-cli
- https://shopify.dev/docs/apps/build/build?framework=remix

You will also need to be added as a developer for the RepRally org as well as the test stores.

On initial install run:

- setup shopify credentials and read through docs
- configure .env
- `yarn install`
- `yarn setup` (syncs up prisma)

**NOTE**
If you run `yarn dev` locally to test, please make sure to fix your `shopify.app.toml` file to use the correct app url and redirects.
In the future, create a test development app to not affect production, or else all traffic will be tunneled through cloudfare to your device.

To run:

- local: `yarn dev` (after running locally, use `yarn deploy` to reploy the correct app url)
- prod: `yarn setup && yarn build && yarn start`

Component Library:

- https://polaris.shopify.com/components/get-started (shopify's provided recommended components)

DB Info:

- Prisma w/ MongoDB

### Note

Use node version 23^

import SmartySDK from "smartystreets-javascript-sdk";

const SmartyCore = SmartySDK.core;
const Lookup = SmartySDK.usStreet.Lookup;
const Batch = SmartyCore.Batch;

const smartyAuthId = process.env.SMARTY_AUTH_ID;
const smartyAuthToken = process.env.SMARTY_AUTH_TOKEN;

if (!smartyAuthId || !smartyAuthToken) {
  throw new Error("Missing Smarty credentials");
}

const smartyCredentials = new SmartyCore.StaticCredentials(
  smartyAuthId,
  smartyAuthToken,
);

const clientBuilder = new SmartyCore.ClientBuilder(smartyCredentials);

const client = clientBuilder.buildUsStreetApiClient();

export { Batch, Lookup, SmartySDK, client };

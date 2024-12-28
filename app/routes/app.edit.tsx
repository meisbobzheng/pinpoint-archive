import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, Link, useFetcher, useLoaderData } from "@remix-run/react";
import {
  Autocomplete,
  BlockStack,
  Card,
  Icon,
  Layout,
  Page,
  Text,
} from "@shopify/polaris";
import { SearchIcon } from "@shopify/polaris-icons";
import { CreateEditCard } from "app/components/edit/createEdit";
import { EditTagsCard } from "app/components/edit/editTags";
import { authenticate } from "app/shopify.server";
import { getStoreBrand } from "app/stores/brands.server";
import {
  createTag,
  deleteTag,
  editTag,
  fetchBrandStores,
  importBrandStores,
  updateBrandStore,
} from "app/stores/stores.server";
import type { BaseStore, ExternalStore } from "app/types/stores";
import { getStringArrayField, getStringField } from "app/util/forms.server";
import { validateStoreAddresses } from "app/util/stores.server";
import { useCallback, useEffect, useState } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const { brand } = await getStoreBrand(admin, admin.rest.session.shop);
  const brandHash = brand.brandHash;

  const { stores } = await fetchBrandStores({
    brandHash,
    page: 0,
    perPage: 6,
  });

  return {
    stores,
    brandTags: brand.tags,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const formData = await request.formData();
  const actionType = getStringField(formData, "actionType");

  const { brand } = await getStoreBrand(admin, admin.rest.session.shop);
  const brandHash = brand.brandHash;

  try {
    if (actionType === "search") {
      const search = getStringField(formData, "search");

      const { stores } = await fetchBrandStores({
        brandHash,
        page: 0,
        perPage: 6,
        search,
      });

      return json({
        success: true,
        stores,
        storeCount: null,
        action: actionType,
        brandTags: null,
        error: null,
      });
    }
    if (actionType === "createStore") {
      const newBaseStore: BaseStore = {
        name: getStringField(formData, "name"),
        addressPrimary: getStringField(formData, "addressPrimary"),
        addressSecondary: getStringField(formData, "addressSecondary") || null,
        city: getStringField(formData, "city"),
        state: getStringField(formData, "state"),
        postalCode: getStringField(formData, "postalCode"),
        phone: getStringField(formData, "phone") || null,
        email: getStringField(formData, "email") || null,
        website: getStringField(formData, "website") || null,
        tags: getStringArrayField(formData, "tags"),
      };

      const { validatedStores } = await validateStoreAddresses([newBaseStore]);

      if (Object.entries(validatedStores).length === 0) {
        return json({
          success: false,
          action: actionType,
          stores: [],
          storeCount: null,
          brandTags: null,
          error: "Invalid address",
        });
      }

      const { success, error } = await importBrandStores({
        brandHash,
        validatedStores,
      });

      if (!success) {
        return json({
          success: false,
          action: actionType,
          stores: [] as ExternalStore[],
          storeCount: null,
          brandTags: null,
          error: error || "Error creating store",
        });
      }

      return json({
        success: true,
        action: actionType,
        stores: [],
        storeCount: null,
        brandTags: null,
        error: null,
      });
    }
    if (actionType === "updateStore") {
      const store: ExternalStore = {
        id: getStringField(formData, "id"),
        name: getStringField(formData, "name"),
        addressPrimary: getStringField(formData, "addressPrimary"),
        addressSecondary: getStringField(formData, "addressSecondary") || null,
        city: getStringField(formData, "city"),
        state: getStringField(formData, "state"),
        postalCode: getStringField(formData, "postalCode"),
        phone: getStringField(formData, "phone") || null,
        email: getStringField(formData, "email") || null,
        website: getStringField(formData, "website") || null,
        tags: getStringArrayField(formData, "tags"),
      };

      const { success, error } = await updateBrandStore(brandHash, store);

      if (!success) {
        return json({
          success: false,
          action: actionType,
          stores: [] as ExternalStore[],
          storeCount: null,
          brandTags: null,
          error: error || "Error updating store",
        });
      }

      // update store
      return json({
        success: true,
        action: actionType,
        stores: [] as ExternalStore[],
        storeCount: null,
        brandTags: null,
        error: null,
      });
    }

    if (actionType === "createTag") {
      const tag = getStringField(formData, "tag");

      const { success, error } = await createTag(brandHash, tag);

      if (!success) {
        return json({
          success: false,
          action: actionType,
          stores: [] as ExternalStore[],
          storeCount: null,
          brandTags: null,
          error: error || "Error creating tag",
        });
      }
      const { brand } = await getStoreBrand(admin, admin.rest.session.shop);

      return json({
        success: true,
        action: actionType,
        stores: [] as ExternalStore[],
        storeCount: null,
        brandTags: brand.tags,
        error: null,
      });
    }

    if (actionType === "deleteTag") {
      const tag = getStringField(formData, "tag");

      const { success, error } = await deleteTag(brandHash, tag);

      if (!success) {
        return json({
          success: false,
          action: actionType,
          stores: [] as ExternalStore[],
          storeCount: null,
          brandTags: null,
          error: error || "Error deleting tag",
        });
      }

      const { brand } = await getStoreBrand(admin, admin.rest.session.shop);

      return json({
        success: true,
        action: actionType,
        stores: [] as ExternalStore[],
        storeCount: null,
        brandTags: brand.tags,
        error: null,
      });
    }

    if (actionType === "editTag") {
      const oldTag = getStringField(formData, "oldTag");
      const newTag = getStringField(formData, "newTag");

      const { success, error } = await editTag(brandHash, oldTag, newTag);

      if (!success) {
        return json({
          success: false,
          action: actionType,
          stores: [] as ExternalStore[],
          storeCount: null,
          brandTags: null,
          error: error || "Error editing tag",
        });
      }

      const { brand } = await getStoreBrand(admin, admin.rest.session.shop);

      return json({
        success: true,
        action: actionType,
        stores: [] as ExternalStore[],
        storeCount: null,
        brandTags: brand.tags,
        error: null,
      });
    }
  } catch (e: any) {
    return {
      success: false,
      stores: [] as ExternalStore[],
      storeCount: 0,
      action: actionType,
      brandTags: null,
      error: e.message,
    };
  }
  return {
    success: false,
    stores: [] as ExternalStore[],
    storeCount: 0,
    action: actionType,
    brandTags: null,
    error: "Error",
  };
};

export default function EditPage() {
  const { stores: initialStores, brandTags: initialBrandTags } =
    useLoaderData<typeof loader>();

  const fetcher = useFetcher<typeof action>();

  const [brandTags, setBrandTags] = useState(initialBrandTags);

  const [store, setStore] = useState<ExternalStore>();
  const [storeOptions, setStoreOptions] = useState(initialStores);

  const [selectedStore, setSelectedStore] = useState<string[]>([]);
  const [storeInputValue, setStoreInputValue] = useState("");
  const [parsedStoreOptions, setParsedStoreOptions] = useState(
    initialStores.map((store) => {
      return {
        label: `${store.name} - ${store.addressPrimary} ${store.addressSecondary ?? ""}, ${store.city}, ${store.state} ${store.postalCode}`,
        value: store.id,
      };
    }),
  );

  const searchStores = (value: string) => {
    // call fetcher
    const formData = new FormData();
    formData.append("actionType", "search");
    formData.append("search", value);

    fetcher.submit(formData, {
      method: "POST",
    });
  };

  // finish
  const updateText = (value: string) => {
    setStoreInputValue(value);

    setTimeout(() => searchStores(value), 300);
  };

  const updateSelection = useCallback(
    (selected: string[]) => {
      const actualStore = storeOptions.find(
        (store) => store.id === selected[0],
      );
      setStoreInputValue(
        `${actualStore?.name} - ${actualStore?.addressPrimary} ${actualStore?.addressSecondary ?? ""}, ${actualStore?.city}, ${actualStore?.state} ${actualStore?.postalCode}`,
      );
      setSelectedStore(selected);
      setStore(actualStore);
    },
    [storeOptions],
  );

  const onStoreReset = () => {
    setSelectedStore([]);
    setStoreInputValue("");
    setStore(undefined);
  };

  const onStoreSubmit = ({
    store,
    isUpdate,
  }: {
    store: ExternalStore;
    isUpdate: boolean;
  }) => {
    onStoreReset();

    setStoreOptions(
      storeOptions.map((s) => {
        if (s.id === store.id) {
          return store;
        } else {
          return s;
        }
      }),
    );

    const formData = new FormData();
    const actionType = isUpdate ? "updateStore" : "createStore";
    formData.append("actionType", actionType);
    formData.append("id", store.id);
    formData.append("name", store.name);
    formData.append("addressPrimary", store.addressPrimary);
    formData.append("addressSecondary", store.addressSecondary ?? "");
    formData.append("city", store.city);
    formData.append("state", store.state);
    formData.append("postalCode", store.postalCode);
    formData.append("phone", store.phone ?? "");
    formData.append("email", store.email ?? "");
    formData.append("website", store.website ?? "");
    formData.append("tags", JSON.stringify(store.tags));

    fetcher.submit(formData, {
      method: "POST",
    });
  };

  const onTagCreate = (tag: string) => {
    const formData = new FormData();
    formData.append("actionType", "createTag");
    formData.append("tag", tag);

    fetcher.submit(formData, {
      method: "POST",
    });
  };

  const onTagEdit = (oldTag: string, newTag: string) => {
    const formData = new FormData();
    formData.append("actionType", "editTag");
    formData.append("oldTag", oldTag);
    formData.append("newTag", newTag);

    fetcher.submit(formData, {
      method: "POST",
    });
  };

  const onTagDelete = (tag: string) => {
    const formData = new FormData();
    formData.append("actionType", "deleteTag");
    formData.append("tag", tag);

    fetcher.submit(formData, {
      method: "POST",
    });
  };

  useEffect(() => {
    if (!fetcher.data?.success) {
      switch (fetcher.data?.action) {
        case "search":
          shopify.toast.show("Error searching for stores.", {
            duration: 2000,
          });
          break;
        case "createStore":
          shopify.toast.show(
            `Error creating location. ${fetcher.data?.error ?? ""}`,
            {
              duration: 2000,
            },
          );
          break;
        case "updateStore":
          shopify.toast.show(fetcher.data.error ?? "Error updating location.", {
            duration: 2000,
          });
          break;
        case "createTag":
          shopify.toast.show(fetcher.data.error ?? "Error creating new tag.", {
            duration: 2000,
          });
          break;
        case "deleteTag":
          shopify.toast.show(fetcher.data.error ?? "Error deleting tag.", {
            duration: 2000,
          });
          break;
        case "editTag":
          shopify.toast.show(fetcher.data.error ?? "Error editing tag.", {
            duration: 2000,
          });
          break;
      }
      return;
    }

    if (fetcher.data?.action === "search") {
      if (fetcher.data?.stores.length) {
        setStoreOptions(fetcher.data.stores);
        setParsedStoreOptions(
          fetcher.data.stores.map((store: ExternalStore) => {
            return {
              label: `${store.name} - ${store.addressPrimary} ${store.addressSecondary ?? ""}, ${store.city}, ${store.state} ${store.postalCode}`,
              value: store.id,
            };
          }),
        );
      }
    } else if (fetcher.data?.action === "createStore") {
      shopify.toast.show("Successfully added new store location", {
        duration: 2000,
      });
    } else if (fetcher.data?.action === "updateStore") {
      shopify.toast.show("Successfully updated store location", {
        duration: 2000,
      });
    } else if (fetcher.data?.action === "createTag") {
      if (fetcher.data.brandTags) {
        setBrandTags(fetcher.data.brandTags);
      }
      shopify.toast.show("Successfully created new tag", {
        duration: 2000,
      });
    } else if (fetcher.data?.action === "deleteTag") {
      if (fetcher.data.brandTags) {
        setBrandTags(fetcher.data.brandTags);
      }
      setStore(undefined);
      setStoreInputValue("");
      searchStores("");
      shopify.toast.show("Successfully deleted tag", {
        duration: 2000,
      });
    } else if (fetcher.data?.action === "editTag") {
      if (fetcher.data.brandTags) {
        setBrandTags(fetcher.data.brandTags);
      }
      setStore(undefined);
      setStoreInputValue("");
      searchStores("");
      shopify.toast.show("Successfully edited tag", {
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
      title="Your location editor"
      subtitle="Edit location details and configure custom filters and tags here"
      fullWidth
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingLg">
                Create and edit store locations
              </Text>
              <Text as="p" variant="bodyMd">
                To edit an existing store location, select the store from the
                dropdown below.
              </Text>
              <Text as="p" variant="bodyMd">
                To create a new store location, simply fill out the form below.
                For bulk imports and updates, please upload a CSV in the{" "}
                <Link to="/app/locations">locations page.</Link>
              </Text>
              <Autocomplete
                options={parsedStoreOptions}
                onSelect={updateSelection}
                loading={fetcher.state !== "idle"}
                selected={selectedStore}
                allowMultiple={false}
                textField={
                  <Autocomplete.TextField
                    label="Find an existing store"
                    value={storeInputValue}
                    prefix={<Icon source={SearchIcon} tone="base" />}
                    placeholder="Search"
                    onChange={updateText}
                    autoComplete="off"
                  />
                }
                emptyState={
                  <div
                    style={{
                      padding: "10px 10px",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text as="p" variant="bodyMd" tone="subdued">
                      No stores found.
                    </Text>
                  </div>
                }
              />
              <CreateEditCard
                store={store}
                brandTags={brandTags}
                onReset={onStoreReset}
                onSave={onStoreSubmit}
                loading={fetcher.state === "submitting"}
              />
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section variant="oneThird">
          <EditTagsCard
            brandTags={brandTags}
            onDelete={onTagDelete}
            onCreate={onTagCreate}
            onEdit={onTagEdit}
          />
        </Layout.Section>
        <Layout.Section variant="fullWidth">
          <div style={{ padding: "30px" }}></div>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

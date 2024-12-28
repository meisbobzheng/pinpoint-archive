import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, useFetcher, useLoaderData } from "@remix-run/react";
import { Layout, Page } from "@shopify/polaris";
import { ExistingStores } from "app/components/locations/existingStores";
import {
  defaultHeaders,
  ImportStores,
} from "app/components/locations/importStores";
import { Resources } from "app/components/locations/resources";
import { authenticate } from "app/shopify.server";
import { getStoreBrand } from "app/stores/brands.server";
import {
  deleteBrandStores,
  fetchBrandStores,
  fetchStoresById,
  getBrandStoreCount,
  importBrandStores,
} from "app/stores/stores.server";
import type { BaseStore } from "app/types/stores";
import { parseLocationCSV } from "app/util/files.server";
import {
  getFileField,
  getObjectField,
  getStringArrayField,
  getStringField,
} from "app/util/forms.server";
import { validateStoreAddresses } from "app/util/stores.server";
import Papa from "papaparse";
import { useCallback, useEffect, useState } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const { brand } = await getStoreBrand(admin, admin.rest.session.shop);
  const brandHash = brand.brandHash;

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "0");
  const perPage = parseInt(url.searchParams.get("limit") || "10");
  const search = url.searchParams.get("search") || "";

  const initialStoreData = await fetchBrandStores({
    brandHash,
    page,
    perPage,
    search,
  });

  const storeCount = await getBrandStoreCount(brandHash);

  return {
    stores: initialStoreData.stores,
    hasNextPage: initialStoreData.hasNextPage,
    storeCount,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const formData = await request.formData();
  const actionType = getStringField(formData, "actionType");

  const { brand } = await getStoreBrand(admin, admin.rest.session.shop);
  const brandHash = brand.brandHash;

  try {
    // Delete store action
    if (actionType === "delete") {
      const ids = getStringArrayField(formData, "ids");
      await deleteBrandStores({ brandHash, ids });

      // deleteAllBrandStore({ brandHash });
      // ^^ used for testing (mass deletion)

      return json({
        success: true,
        action: actionType,
      });
    }

    // Import stores action
    if (actionType === "import") {
      const csvBuffer = await getFileField(formData, "csv_file");
      const headerMap = getObjectField<Record<string, string>>(
        formData,
        "headerMap",
      );
      const tags = getStringArrayField(formData, "tags");

      const parsedStores = await parseLocationCSV({
        buffer: csvBuffer,
        headerMap,
        tags,
      });

      const { validatedStores, invalidStores, success } =
        await validateStoreAddresses(parsedStores);

      if (Object.entries(validatedStores).length === 0 || !success) {
        return json({
          success: false,
          invalidAddresses: [],
          action: actionType,
        });
      }

      const invalidAddresses = invalidStores.map((store) => {
        return `${store.name} - ${store.addressPrimary} ${store.addressSecondary ?? ""}, ${store.city}, ${store.state} ${store.postalCode}`;
      });

      // this cannot be awaited due to the amount of time it takes
      importBrandStores({
        brandHash,
        validatedStores,
      });

      return json({
        success: true,
        invalidAddresses,
        action: actionType,
      });
    }

    // Export stores action
    if (actionType === "export") {
      const ids = getStringArrayField(formData, "ids");
      const stores = await fetchStoresById(brandHash, ids);

      return json({
        exportedStores: stores,
        action: actionType,
      });
    }
  } catch (e: any) {
    return new Response(e.message, { status: 400 });
  }

  return new Response(null, { status: 200 });
};

export default function LocationPage() {
  const {
    stores: initialStores,
    hasNextPage: initialHasNextPage,
    storeCount: initialStoreCount,
  } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const [files, setFiles] = useState<File[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  const [stores, setStores] = useState(initialStores);
  const [hasNextPage, setHasNextPage] = useState(initialHasNextPage);
  const [storeCount, setStoreCount] = useState(initialStoreCount);

  useEffect(() => {
    if (fetcher.data?.stores) {
      setStores(fetcher.data.stores);
      setHasNextPage(fetcher.data.hasNextPage);
      setStoreCount(fetcher.data.storeCount);
    }
  }, [fetcher.data]);

  const handleDropZoneDrop = useCallback(
    (_dropFiles: File[], acceptedFiles: File[], _rejectedFiles: File[]) => {
      setFiles((files) => [...files, ...acceptedFiles]);

      // parse headers
      Papa.parse(acceptedFiles[0], {
        header: true,
        complete: (results) => {
          const headers = results.meta.fields || [];

          setHeaders(headers);
        },
      });
    },
    [],
  );

  const handleDropZoneDelete = useCallback(() => {
    setFiles([]);
  }, []);

  const deleteStores = (selectedResources: string[]) => {
    const formData = new FormData();
    formData.append("ids", JSON.stringify(selectedResources));
    formData.append("actionType", "delete");

    fetcher.submit(formData, {
      method: "DELETE",
    });
  };

  const handleUpload = (headerMap: Record<string, string>, tags: string[]) => {
    const formData = new FormData();

    formData.append("actionType", "import");
    formData.append("csv_file", files[0]);
    formData.append("headerMap", JSON.stringify(headerMap));
    formData.append("tags", JSON.stringify(tags));

    fetcher.submit(formData, {
      method: "POST",
      encType: "multipart/form-data",
    });
  };

  const handlePageChange = (page: number, limit?: number, search?: string) => {
    fetcher.load(`?page=${page}&limit=${limit ?? 10}&search=${search ?? ""}`);
  };

  const handleExport = (ids: string[]) => {
    const formData = new FormData();

    formData.append("ids", JSON.stringify(ids));
    formData.append("actionType", "export");

    fetcher.submit(formData, {
      method: "POST",
    });
  };

  // post-action hooks
  useEffect(() => {
    if (fetcher.data?.action) {
      switch (fetcher.data.action) {
        case "export":
          const storesToExport = fetcher.data.exportedStores as BaseStore[];

          if (!storesToExport?.length) {
            return;
          }

          const csvString = [
            defaultHeaders,
            ...storesToExport.map((store) => {
              return [
                store.name,
                store.addressPrimary,
                store.addressSecondary,
                store.city,
                store.state,
                store.postalCode,
                store.phone,
                store.email,
                store.website,
              ];
            }),
          ]
            .map((row) => row.join(","))
            .join("\n");

          const blob = new Blob([csvString], {
            type: "text/csv;charset=utf-8;",
          });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.setAttribute("download", "stores.csv");
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          break;
        case "delete":
          if (fetcher.data.success) {
            shopify.toast.show("Stores deleted!", {
              duration: 2000,
            });
          } else {
            shopify.toast.show("Error deleting stores.", {
              duration: 2000,
            });
          }
          handlePageChange(0, 10, "");
          break;
        case "import":
          const invalidAddresses =
            (fetcher.data.invalidAddresses as string[]) ?? [];

          const toastMessage =
            "Successfully imported stores!" +
            (invalidAddresses.length
              ? `\n${invalidAddresses.length} invalid addresses were not imported.`
              : "");

          if (fetcher.data.success) {
            shopify.toast.show(toastMessage, {
              duration: 2000,
            });
          } else {
            shopify.toast.show("Error importing stores.", {
              duration: 2000,
            });
          }
          handlePageChange(0, 10, "");
          break;
      }
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
      title="Your locations"
      subtitle="Upload, edit, delete, and export stores here"
      fullWidth
    >
      <div className="container" style={{ paddingBlockEnd: "30px" }}>
        <Layout>
          <Layout.Section>
            <ExistingStores
              stores={stores}
              handleDelete={deleteStores}
              fetcherState={fetcher.state}
              handlePageChange={handlePageChange}
              hasNextPage={hasNextPage}
              storeCount={storeCount}
              handleExport={handleExport}
            />
          </Layout.Section>
          <Layout.Section>
            <ImportStores
              handleDropZoneDelete={handleDropZoneDelete}
              handleDropZoneDrop={handleDropZoneDrop}
              handleUpload={handleUpload}
              files={files}
              fetcherState={fetcher.state}
              headers={headers}
            />
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Resources />
          </Layout.Section>
        </Layout>
      </div>
    </Page>
  );
}

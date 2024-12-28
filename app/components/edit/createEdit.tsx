import {
  BlockStack,
  Button,
  ButtonGroup,
  Card,
  Divider,
  FormLayout,
  InlineStack,
  OptionList,
  Popover,
  Text,
  TextField,
} from "@shopify/polaris";
import type { ExternalStore } from "app/types/stores";
import { useCallback, useEffect, useState } from "react";

export function CreateEditCard({
  store,
  brandTags,
  onReset,
  onSave,
  loading,
}: {
  store?: ExternalStore;
  brandTags: string[];
  onReset: () => void;
  onSave: ({
    store,
    isUpdate,
  }: {
    store: ExternalStore;
    isUpdate: boolean;
  }) => void;
  loading: boolean;
}) {
  const [storeName, setStoreName] = useState("");
  const [addressPrimary, setAddressPrimary] = useState("");
  const [addressSecondary, setAddressSecondary] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const [popoverActive, setPopoverActive] = useState(false);

  const togglePopoverActive = useCallback(
    () => setPopoverActive((popoverActive) => !popoverActive),
    [],
  );

  const popoverActivator = (
    <Button onClick={togglePopoverActive} disclosure>
      Select Tags
    </Button>
  );

  useEffect(() => {
    if (store) {
      setStoreName(store.name);
      setAddressPrimary(store.addressPrimary);
      setAddressSecondary(store.addressSecondary ?? "");
      setCity(store.city);
      setState(store.state);
      setPostalCode(store.postalCode);
      setPhone(store.phone ?? "");
      setEmail(store.email ?? "");
      setWebsite(store.website ?? "");
      setTags(store.tags);
    } else {
      setStoreName("");
      setAddressPrimary("");
      setAddressSecondary("");
      setCity("");
      setState("");
      setPostalCode("");
      setPhone("");
      setEmail("");
      setWebsite("");
      setTags([]);
    }
  }, [store]);

  return (
    <BlockStack gap="400">
      <BlockStack gap="150">
        <BlockStack gap="100">
          <Text as="p" variant="headingMd">
            Address
          </Text>
          <Divider />
        </BlockStack>
        <FormLayout>
          <TextField
            label="Store name"
            disabled={!!store?.id}
            value={storeName}
            onChange={setStoreName}
            autoComplete="off"
          />
          <FormLayout.Group>
            <TextField
              label="Address"
              disabled={!!store?.id}
              value={addressPrimary}
              onChange={setAddressPrimary}
              autoComplete="off"
            />
            <TextField
              label="Address 2"
              disabled={!!store?.id}
              value={addressSecondary}
              onChange={setAddressSecondary}
              autoComplete="off"
            />
          </FormLayout.Group>
          <FormLayout.Group>
            <TextField
              label="City"
              disabled={!!store?.id}
              value={city}
              onChange={setCity}
              autoComplete="off"
            />
            <TextField
              label="State"
              disabled={!!store?.id}
              value={state}
              onChange={setState}
              autoComplete="off"
            />
            <TextField
              label="Zip"
              disabled={!!store?.id}
              value={postalCode}
              onChange={setPostalCode}
              autoComplete="off"
            />
          </FormLayout.Group>
        </FormLayout>
      </BlockStack>
      <BlockStack gap="150">
        <BlockStack gap="100">
          <Text as="p" variant="headingMd">
            Additional
          </Text>
          <Divider />
        </BlockStack>
        <FormLayout>
          <FormLayout.Group>
            <TextField
              label="Phone"
              value={phone}
              onChange={setPhone}
              autoComplete="off"
            />

            <TextField
              label="Email"
              value={email}
              onChange={setEmail}
              autoComplete="off"
            />

            <TextField
              label="Website"
              value={website}
              onChange={setWebsite}
              autoComplete="off"
            />
          </FormLayout.Group>
        </FormLayout>
      </BlockStack>

      <Card>
        <InlineStack gap="300" align="space-between" blockAlign="center">
          <InlineStack gap="100">
            <Text as="p" variant="bodyMd">
              Tags:
            </Text>
            {tags.length > 0 ? (
              <Text as="p" variant="bodyMd" fontWeight="bold">
                {tags.join(", ")}
              </Text>
            ) : (
              <Text as="p" variant="bodyMd" tone="subdued">
                No tags selected
              </Text>
            )}
          </InlineStack>
          <Popover
            active={popoverActive}
            activator={popoverActivator}
            onClose={togglePopoverActive}
          >
            <OptionList
              allowMultiple
              selected={tags}
              onChange={setTags}
              options={brandTags.map((tag) => ({
                label: tag,
                value: tag,
              }))}
            />
          </Popover>
        </InlineStack>
      </Card>

      <ButtonGroup fullWidth>
        <Button
          variant="secondary"
          onClick={() => {
            onReset();
            setStoreName("");
            setAddressPrimary("");
            setAddressSecondary("");
            setCity("");
            setState("");
            setPostalCode("");
            setPhone("");
            setEmail("");
            setWebsite("");
            setTags([]);
          }}
        >
          Reset
        </Button>
        <Button
          variant="primary"
          onClick={() =>
            onSave({
              store: {
                id: store?.id ?? "",
                name: storeName,
                addressPrimary,
                addressSecondary,
                city,
                state,
                postalCode,
                phone,
                email,
                website,
                tags,
              },
              isUpdate: !!store?.id,
            })
          }
          loading={loading}
          disabled={
            !storeName || !addressPrimary || !city || !state || !postalCode
          }
        >
          Save
        </Button>
      </ButtonGroup>
    </BlockStack>
  );
}

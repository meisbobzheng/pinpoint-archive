import {
  BlockStack,
  Button,
  ButtonGroup,
  Card,
  Divider,
  InlineStack,
  Link,
  Scrollable,
  Text,
  TextField,
} from "@shopify/polaris";
import { HelpCenterArticles } from "app/util/articles";
import { useCallback, useState } from "react";
import { TagRow } from "./tagRow";

export function EditTagsCard({
  brandTags,
  onDelete,
  onCreate,
  onEdit,
}: {
  brandTags: string[];
  onDelete: (tag: string) => void;
  onCreate: (tag: string) => void;
  onEdit: (oldTag: string, newTag: string) => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [newTag, setNewTag] = useState("");

  const handleChange = useCallback(
    (newValue: string) => setNewTag(newValue),
    [],
  );

  return (
    <Card>
      <BlockStack gap="300">
        <Text as="h2" variant="headingLg">
          Configure custom tags
        </Text>
        <Text as="p" variant="bodyMd">
          Create, edit, and delete individual tags here. For bulk tag creation,
          please upload a CSV in the{" "}
          <a href="/app/locations">locations page.</a>
        </Text>
        <Text as="p" variant="bodyMd">
          Custom tags allow you to display additional information about your
          stores. Read more about tags here{" "}
          <Link
            onClick={() => {
              window.open(HelpCenterArticles.TAGS, "_blank");
            }}
          >
            here
          </Link>
          .
        </Text>
        <Card>
          <Scrollable style={{ maxHeight: "350px" }}>
            <BlockStack gap="300">
              {brandTags.map((tag, index) => (
                <BlockStack key={tag} gap="300">
                  <TagRow
                    key={tag}
                    tag={tag}
                    onDelete={onDelete}
                    onEdit={onEdit}
                  />
                  {index !== brandTags.length - 1 && <Divider />}
                </BlockStack>
              ))}
              {isCreating ? (
                <BlockStack gap="300">
                  {brandTags.length > 0 && <Divider />}
                  <InlineStack align="space-between" blockAlign="center">
                    <TextField
                      label=""
                      value={newTag}
                      autoComplete="off"
                      onChange={handleChange}
                    />
                    <ButtonGroup>
                      <Button
                        onClick={() => {
                          onCreate(newTag);
                          setIsCreating(false);
                          setNewTag("");
                        }}
                        variant="primary"
                        tone="success"
                        disabled={!newTag}
                      >
                        Create
                      </Button>
                      <Button
                        onClick={() => {
                          setIsCreating(false);
                          setNewTag("");
                        }}
                        variant="secondary"
                        tone="critical"
                      >
                        Cancel
                      </Button>
                    </ButtonGroup>
                  </InlineStack>
                </BlockStack>
              ) : (
                <Button onClick={() => setIsCreating(true)}>Add New Tag</Button>
              )}
            </BlockStack>
          </Scrollable>
        </Card>
      </BlockStack>
    </Card>
  );
}

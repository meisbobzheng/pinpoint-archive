import { Button, ButtonGroup, InlineStack, TextField } from "@shopify/polaris";
import { CheckIcon, DeleteIcon, EditIcon } from "@shopify/polaris-icons";
import { useCallback, useState } from "react";

export function TagRow({
  tag,
  onEdit,
  onDelete,
}: {
  tag: string;
  onEdit: (oldTag: string, newTag: string) => void;
  onDelete: (tag: string) => void;
}) {
  const [tagValue, setTagValue] = useState(tag);
  const [isEditing, setIsEditing] = useState(false);

  const handleChange = useCallback(
    (newValue: string) => setTagValue(newValue),
    [],
  );

  return (
    <div>
      <InlineStack align="space-between" blockAlign="center">
        <TextField
          label=""
          value={tagValue}
          autoComplete="off"
          disabled={!isEditing}
          onChange={handleChange}
        />

        {!isEditing ? (
          <ButtonGroup>
            <Button
              onClick={() => setIsEditing(true)}
              variant="secondary"
              icon={EditIcon}
            />
            <Button
              onClick={() => onDelete(tag)}
              variant="primary"
              tone="critical"
              icon={DeleteIcon}
            />
          </ButtonGroup>
        ) : (
          <ButtonGroup>
            <Button
              onClick={() => {
                if (tagValue !== tag) {
                  onEdit(tag, tagValue);
                  setIsEditing(false);
                } else {
                  setIsEditing(false);
                }
              }}
              variant="primary"
              tone="success"
              icon={CheckIcon}
            />
          </ButtonGroup>
        )}
      </InlineStack>
    </div>
  );
}

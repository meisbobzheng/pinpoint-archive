import type { BaseStore } from "app/types/stores";

// Used for parsing CSV files for bulk uploads, with custom header options
export function parseLocationCSV({
  buffer,
  headerMap,
  tags,
}: {
  buffer: Buffer;
  headerMap: Record<string, string>;
  tags: string[];
}): Promise<BaseStore[]> {
  return new Promise((resolve, reject) => {
    try {
      // Convert Buffer to string
      const csv = buffer.toString("utf-8");

      // Split CSV data into lines
      const lines = csv.trim().split("\n");
      const headers = lines[0].trim().split(",");

      const baseHeaderIndexes: Record<string, number> = {};

      Object.entries(headerMap).forEach(([key, value]) => {
        if (value !== "N/A") {
          baseHeaderIndexes[key] = headers.indexOf(value);
        }
      });

      const tagHeaderIndexes = Object.fromEntries(
        tags.map((tag) => [tag, headers.indexOf(tag)]),
      );

      // Parse each line into a ParsedStore object for upload
      const result = lines.slice(1).map((line) => {
        const values = line.split(",");

        // Create the base store object with predefined fields
        const parsedObject: BaseStore = {
          name: values[baseHeaderIndexes["Store Name"]].trim(),
          addressPrimary: values[baseHeaderIndexes["Address"]].trim(),
          addressSecondary:
            values[baseHeaderIndexes["Address 2"]]?.trim() || null,
          city: values[baseHeaderIndexes["City"]].trim(),
          state: values[baseHeaderIndexes["State"]].trim(),
          postalCode: values[baseHeaderIndexes["Zip"]].trim(),
          phone: values[baseHeaderIndexes["Phone"]]?.trim() || null,
          email: values[baseHeaderIndexes["Email"]]?.trim() || null,
          website: values[baseHeaderIndexes["Website"]]?.trim() || null,
          tags: [],
        };

        Object.entries(tagHeaderIndexes).forEach(([tag, index]) => {
          if (index !== -1) {
            const shouldTag = values[index]?.trim();
            if (shouldTag) {
              parsedObject.tags.push(tag);
            }
          }
        });

        return parsedObject;
      });
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

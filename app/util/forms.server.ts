// Some utility functions for parsing form data from Remix

export function getStringField(formData: FormData, fieldName: string) {
  return (formData.get(fieldName) as string) || "";
}

export function getStringArrayField(
  formData: FormData,
  fieldName: string,
): string[] {
  const fieldData = formData.get(fieldName) as string;

  if (!fieldData) {
    return [];
  }

  try {
    // Attempt to parse the field data as JSON
    const parsedArray = JSON.parse(fieldData);
    // Ensure it's an array and contains only strings
    if (
      Array.isArray(parsedArray) &&
      parsedArray.every((item) => typeof item === "string")
    ) {
      return parsedArray;
    }
  } catch (error) {
    console.error("Failed to parse array field:", error);
  }

  // Fallback to an empty array if parsing fails
  return [];
}

export function getNumberField(formData: FormData, fieldName: string) {
  return parseInt(formData.get(fieldName) as string);
}

export function getNumberArrayField(formData: FormData, fieldName: string) {
  return (formData.getAll(fieldName) as string[]).map((s) => parseInt(s));
}

export function getObjectField<T>(formData: FormData, fieldName: string) {
  const fieldData = formData.get(fieldName) as string;

  try {
    return JSON.parse(fieldData) as T;
  } catch (error) {
    console.error("Failed to parse object field:", error);
  }

  return {};
}

export async function getFileField(
  formData: FormData,
  fieldName: string,
): Promise<Buffer> {
  const file = formData.get(fieldName);

  try {
    // Ensure the file is available and is of type File, not a string
    if (file && file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
    throw new Error(`Invalid file`);
  } catch (error: any) {
    throw new Error("Failed to parse file field:", error);
  }
}

export function getTField<T>(formData: FormData, fieldName: string) {
  const fieldData = formData.get(fieldName) as string;

  try {
    return fieldData as T;
  } catch (error) {
    console.error("Failed to parse object field:", error);
  }

  throw new Error("Failed to parse object field");
}

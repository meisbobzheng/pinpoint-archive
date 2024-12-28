import { ColorPicker, Popover, TextField } from "@shopify/polaris";
import chroma from "chroma-js";
import { useCallback, useEffect, useState } from "react";

export function ColorInput({
  label,
  helpText,
  value,
  setValue,
}: {
  label: string;
  helpText?: string;
  value: string;
  setValue: (value: string) => void;
}) {
  const initialHSV = chroma(value).hsv();
  const [color, setColor] = useState(
    initialHSV
      ? {
          hue: initialHSV[0],
          saturation: initialHSV[1],
          brightness: initialHSV[2],
        }
      : {
          hue: 120,
          saturation: 1,
          brightness: 1,
        },
  );
  const [hexColor, setHexColor] = useState(value);
  const [colorPickerActive, setColorPickerActive] = useState(false);

  const toggleColorPicker = useCallback(
    () => setColorPickerActive((active) => !active),
    [],
  );

  const handleHexChange = (value: string) => {
    // Only update if it's a valid hex color
    if (chroma.valid(value)) {
      setValue(value);
    }
  };

  const handleColorChange = (newColor: {
    hue: number;
    saturation: number;
    brightness: number;
  }) => {
    setValue(
      chroma.hsv(newColor.hue, newColor.saturation, newColor.brightness).hex(),
    );
  };

  useEffect(() => {
    const [h, s, v] = chroma(value).hsv();

    setHexColor(value);

    setColor({
      hue: h || 0,
      saturation: s || 0,
      brightness: v || 0,
    });
  }, [value]);

  return (
    <Popover
      active={colorPickerActive}
      activator={
        <TextField
          label={label}
          value={hexColor}
          onChange={handleHexChange}
          autoComplete="off"
          helpText={helpText}
          suffix={
            <div
              onClick={toggleColorPicker}
              style={{
                width: "16px",
                height: "16px",
                backgroundColor: hexColor,
                border: "1px solid #000",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            />
          }
        />
      }
      onClose={toggleColorPicker}
    >
      <ColorPicker color={color} onChange={handleColorChange} />
    </Popover>
  );
}

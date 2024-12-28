import {
  BlockStack,
  Button,
  Card,
  InlineError,
  InlineStack,
  OptionList,
  Popover,
  Text,
  TextField,
} from "@shopify/polaris";
import { MessageType } from "app/types/inquiries";
import { useCallback, useState } from "react";

export function ContactCard({
  handleSubmit,
}: {
  handleSubmit: ({
    name,
    email,
    messageType,
    message,
  }: {
    name: string;
    email: string;
    messageType: string;
    message: string;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [isNameValid, setIsNameValid] = useState<boolean>();

  const [email, setEmail] = useState("");
  const [isEmailValid, setIsEmailValid] = useState<boolean>();

  const [message, setMessage] = useState("");
  const [isMessageValid, setIsMessageValid] = useState<boolean>();

  const [popoverActive, setPopoverActive] = useState(false);
  const [selectedType, setSelectedType] = useState<string[]>([]);
  const [selectedTypeError, setSelectedTypeError] = useState<boolean>(false);

  const togglePopoverActive = useCallback(
    () => setPopoverActive((popoverActive) => !popoverActive),
    [],
  );

  const activator = (
    <Button onClick={togglePopoverActive} disclosure>
      {selectedType.length ? selectedType[0] : "Select a message type"}
    </Button>
  );

  const validateForm = () => {
    if (!selectedType.length) {
      setSelectedTypeError(true);
    }
    return isNameValid && isEmailValid && isMessageValid && selectedType.length;
  };

  const submitContactForm = () => {
    if (validateForm()) {
      handleSubmit({
        name,
        email,
        messageType: selectedType[0],
        message,
      });
      setName("");
      setEmail("");
      setMessage("");
      setSelectedType([]);
    } else {
      shopify.toast.show("Please fill out all fields.", {
        duration: 2000,
      });
    }
  };

  const onNameUnFocus = () => {
    setIsNameValid(name.length > 0);
  };
  const onEmailUnFocus = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setIsEmailValid(email.length > 0 && emailRegex.test(email));
  };

  const onMessageUnFocus = () => {
    setIsMessageValid(message.length > 0);
  };

  return (
    <Card>
      <BlockStack gap="300">
        <Text as="h2" variant="headingLg">
          Contact Us
        </Text>
        <Text as="p" variant="bodyMd">
          Feel free to reach out to us with any questions, requests, or concerns
          and we'll get back to you as soon as possible.
        </Text>
        <BlockStack gap={"400"}>
          <TextField
            label="Name"
            autoComplete="off"
            value={name}
            onChange={setName}
            onBlur={onNameUnFocus}
            error={isNameValid === false && "Please enter your name"}
          />
          <TextField
            label="Email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            onBlur={onEmailUnFocus}
            type="email"
            error={isEmailValid === false && "Please enter a valid email"}
          />

          <InlineStack gap={"300"} align="space-between" blockAlign="center">
            <Text as="p" variant="bodyMd">
              Message
            </Text>
            <InlineStack gap={"200"}>
              {selectedTypeError && (
                <InlineError
                  message={"Please select a message type"}
                  fieldID="messageType"
                />
              )}
              <Popover
                active={popoverActive}
                activator={activator}
                onClose={togglePopoverActive}
              >
                <OptionList
                  selected={selectedType}
                  onChange={setSelectedType}
                  options={Object.values(MessageType).map((type) => ({
                    label: type,
                    value: type,
                  }))}
                ></OptionList>
              </Popover>
            </InlineStack>
          </InlineStack>
          <TextField
            label=""
            multiline
            autoComplete="off"
            value={message}
            onChange={setMessage}
            maxLength={500}
            showCharacterCount
            placeholder="Type your message here..."
            onBlur={onMessageUnFocus}
            error={isMessageValid === false && "Please enter a message"}
          />
        </BlockStack>
        <Button submit variant="primary" onClick={submitContactForm}>
          Submit
        </Button>
      </BlockStack>
    </Card>
  );
}

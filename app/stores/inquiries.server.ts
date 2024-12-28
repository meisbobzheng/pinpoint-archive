import { prisma } from "app/db.server";

// Creates an inquiry from the Contact Form
export async function createNewInquiry({
  name,
  email,
  messageType,
  message,
  brandHash,
}: {
  name: string;
  email: string;
  messageType: string;
  message: string;
  brandHash: string;
}) {
  await prisma.inquiry.create({
    data: {
      name,
      email,
      messageType,
      message,
      brandHash,
    },
  });

  return;
}

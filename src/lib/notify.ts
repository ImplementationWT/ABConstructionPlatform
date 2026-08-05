import { PASSWORD_RESET_TOKEN_TTL_MINUTES } from "@/models/PasswordResetToken";

export async function sendPasswordResetEmail({
  to,
  name,
  resetLink,
}: {
  to: string;
  name: string;
  resetLink: string;
}) {
  const webhookUrl = process.env.N8N_FORGOT_PASSWORD_WEBHOOK_URL;
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;

  if (!webhookUrl || !webhookSecret) {
    throw new Error("Missing N8N webhook configuration");
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Secret": webhookSecret,
    },
    body: JSON.stringify({
      to,
      name,
      resetLink,
      expiresInMinutes: PASSWORD_RESET_TOKEN_TTL_MINUTES,
    }),
  });

  if (!response.ok) {
    throw new Error(`n8n webhook responded with status ${response.status}`);
  }
}

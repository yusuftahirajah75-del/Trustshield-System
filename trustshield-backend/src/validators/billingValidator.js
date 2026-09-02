const { z } = require("zod");

const checkoutSchema = z.object({
  planSlug: z
    .string()
    .trim()
    .min(1, "Plan slug is required.")
    .max(50, "Plan slug must not exceed 50 characters."),
  callbackUrl: z
    .string()
    .trim()
    .url("Callback URL must be a valid URL.")
    .optional()
});

const verifyPaymentParamsSchema = z.object({
  reference: z
    .string()
    .trim()
    .min(1, "Payment reference is required.")
    .max(255, "Payment reference is too long.")
});

module.exports = {
  checkoutSchema,
  verifyPaymentParamsSchema
};

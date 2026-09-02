const { z } = require("zod");

const analysisRequestSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "URL is required.")
    .max(2048, "URL must not exceed 2048 characters.")
    .refine(
      (value) => {
        try {
          const parsed = new URL(value);
          return parsed.protocol === "http:" || parsed.protocol === "https:";
        } catch {
          return false;
        }
      },
      {
        message: "URL must be a valid HTTP or HTTPS URL."
      }
    ),
  contextText: z
    .string()
    .trim()
    .max(10000, "Context text must not exceed 10000 characters.")
    .optional()
    .default(""),
  semanticEvidence: z
    .array(
      z.union([
        z.string(),
        z.object({
          code: z.string()
        })
      ])
    )
    .optional()
    .default([])
});

const reportRequestSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "URL is required.")
    .max(2048, "URL must not exceed 2048 characters.")
    .refine(
      (value) => {
        try {
          const parsed = new URL(value);
          return parsed.protocol === "http:" || parsed.protocol === "https:";
        } catch {
          return false;
        }
      },
      {
        message: "URL must be a valid HTTP or HTTPS URL."
      }
    ),
  category: z
    .string()
    .trim()
    .min(1, "Category is required.")
    .max(100, "Category must not exceed 100 characters.")
    .optional()
    .default("phishing"),
  description: z
    .string()
    .trim()
    .max(5000, "Description must not exceed 5000 characters.")
    .optional()
    .default(""),
  evidence: z
    .array(
      z.union([
        z.string(),
        z.object({
          code: z.string()
        })
      ])
    )
    .optional()
    .default([])
});

const analysisListQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default("1")
    .transform(Number)
    .refine(
      (value) => Number.isInteger(value) && value >= 1,
      "Page must be a positive integer."
    ),

  limit: z
    .string()
    .optional()
    .default("20")
    .transform(Number)
    .refine(
      (value) =>
        Number.isInteger(value) && value >= 1 && value <= 100,
      "Limit must be between 1 and 100."
    )
});

module.exports = {
  analysisRequestSchema,
  reportRequestSchema,
  analysisListQuerySchema
};
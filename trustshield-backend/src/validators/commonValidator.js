const { z } = require("zod");

const uuidSchema = z.object({
  id: z.string().uuid("Invalid resource ID.")
});

module.exports = {
  uuidSchema
};
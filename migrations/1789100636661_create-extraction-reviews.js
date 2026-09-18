/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createType("flagged_reason_type", [
    "low_confidence",
    "conflicting_extractions",
    "validation_failed",
    "illegible",
    "manual_flag",
  ]);

  pgm.createType("review_status_type", ["pending", "resolved", "rejected"]);

  pgm.createTable("extraction_reviews", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    receipt_id: {
      type: "uuid",
      notNull: true,
      references: "receipts",
      onDelete: "CASCADE",
    },
    // set when the issue belongs to a specific line item; null for receipt-level
    // fields and for the missing_line_item case
    line_item_id: {
      type: "uuid",
      references: "line_items",
      onDelete: "CASCADE",
    },
    // an actual field name (total, quantity, staff_name, ...), or one of three
    // sentinel values: "line_item" (the row itself is wrong), "missing_line_item"
    // (an item was missed entirely), or "receipt" (extraction failed for the
    // whole receipt — see flagged_reason "extraction_failed")
    field_name: { type: "text", notNull: true },
    extractor_source: { type: "text", notNull: true },
    extracted_value: { type: "text" },
    confidence_score: { type: "numeric(4, 3)", notNull: true },
    flagged_reason: { type: "flagged_reason_type", notNull: true },
    extractor_notes: { type: "text" },
    status: { type: "review_status_type", notNull: true, default: "pending" },
    reviewed_value: { type: "text" },
    resolution_notes: { type: "text" },
    reviewed_by: { type: "text" },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
    resolved_at: { type: "timestamptz" },
  });

  pgm.createIndex("extraction_reviews", "receipt_id", {
    name: "idx_extraction_reviews_receipt_id",
  });
  pgm.createIndex("extraction_reviews", "line_item_id", {
    name: "idx_extraction_reviews_line_item_id",
  });
  pgm.createIndex("extraction_reviews", "status", {
    name: "idx_extraction_reviews_pending",
    where: "status = 'pending'",
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable("extraction_reviews");
  pgm.dropType("review_status_type");
  pgm.dropType("flagged_reason_type");
};

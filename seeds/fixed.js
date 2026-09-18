// Hand-written, predictable seed data — covers specific known cases:
// a receipt with every optional field filled, one with almost none,
// the per-register VAT case, and each extraction_reviews case
// (field-level, line-item-level, missing-item, multi-extractor conflict,
// total-extraction-failure).

const STORE_SUPREME = "11111111-1111-1111-1111-111111111111";
const STORE_MOMROTA = "22222222-2222-2222-2222-222222222222";
const STORE_SUPREME_BRANCH2 = "33333333-3333-3333-3333-333333333333";

const RECEIPT_FULL = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const RECEIPT_MINIMAL = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const RECEIPT_VAT_TILL4 = "cccccccc-cccc-cccc-cccc-cccccccccccc";

const LINE_ITEM_FULL_1 = "dddddddd-dddd-dddd-dddd-dddddddddddd";
const LINE_ITEM_FULL_2 = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";
const LINE_ITEM_VAT_1 = "ffffffff-ffff-ffff-ffff-ffffffffffff";
const LINE_ITEM_MINIMAL_1 = "99999999-9999-9999-9999-999999999999";

/**
 * @param client {import('pg').Client}
 */
export const seedFixed = async (client) => {
  await client.query(
    `INSERT INTO stores (id, name, address, phone, email, website)
     VALUES ($1, 'Supreme Pharmacy', '12 Adeola Odeku St, Victoria Island, Lagos', '+2348012345678', 'contact@supremepharmacy.ng', 'https://supremepharmacy.ng')`,
    [STORE_SUPREME]
  );

  await client.query(
    `INSERT INTO stores (id, name, address)
     VALUES ($1, 'Momrota Pharmacy', '45 Herbert Macaulay Way, Yaba, Lagos')`,
    [STORE_MOMROTA]
  );

  // Same store name, different address: a second branch of Supreme Pharmacy.
  // Exercises that the stores(name, address) unique constraint keys off the
  // pair, not name alone — two branches of the same chain are valid, distinct rows.
  await client.query(
    `INSERT INTO stores (id, name, address)
     VALUES ($1, 'Supreme Pharmacy', '88 Awolowo Road, Ikoyi, Lagos')`,
    [STORE_SUPREME_BRANCH2]
  );

  // A receipt with every optional field filled in
  await client.query(
    `INSERT INTO receipts (
       id, store_id, source_image_id, transaction_ref, transaction_ref_label,
       register_ref, date, time, staff_name, customer_name, payment_method,
       subtotal, discount, total, total_in_words, content_hash, extras
     ) VALUES (
       $1, $2, 'img_full_001', 'INV-2026-0042', 'Invoice No',
       'Till 2', '2026-01-15', '14:32:00', 'Adaeze Okonkwo', 'Chinedu Eze', 'Card',
       4500.00, 200.00, 4300.00, 'Four Thousand Three Hundred Naira', 'hash_full_receipt_001',
       $3
     )`,
    [RECEIPT_FULL, STORE_SUPREME, JSON.stringify({ barcode_present: true, items_count: 2 })]
  );

  await client.query(
    `INSERT INTO line_items (id, receipt_id, description, quantity, unit_price, line_total, line_order)
     VALUES ($1, $2, 'Paracetamol 500mg', 2, 500.00, 1000.00, 1)`,
    [LINE_ITEM_FULL_1, RECEIPT_FULL]
  );
  await client.query(
    `INSERT INTO line_items (id, receipt_id, description, quantity, unit_price, line_total, line_order)
     VALUES ($1, $2, 'Vitamin C 1000mg', 7, 500.00, 3500.00, 2)`,
    [LINE_ITEM_FULL_2, RECEIPT_FULL]
  );

  // A receipt with only the required fields
  await client.query(
    `INSERT INTO receipts (id, store_id, source_image_id, transaction_ref, date, total, content_hash)
     VALUES ($1, $2, 'img_minimal_001', 'RCT-9981', '2026-02-03', 1200.00, 'hash_minimal_receipt_001')`,
    [RECEIPT_MINIMAL, STORE_MOMROTA]
  );
  await client.query(
    `INSERT INTO line_items (id, receipt_id, description, quantity, unit_price, line_total, line_order)
     VALUES ($1, $2, 'Hand Sanitizer 250ml', 1, 1200.00, 1200.00, 1)`,
    [LINE_ITEM_MINIMAL_1, RECEIPT_MINIMAL]
  );

  // Per-register VAT case: same store as above receipts, but issued from
  // Till 4, which (per the sample data this schema is based on) is the
  // only register that applies VAT
  await client.query(
    `INSERT INTO receipts (
       id, store_id, source_image_id, transaction_ref, register_ref,
       date, total, vat, content_hash
     ) VALUES (
       $1, $2, 'img_vat_001', 'INV-2026-0043', 'Till 4',
       '2026-01-16', 3210.00, 210.00, 'hash_vat_receipt_001'
     )`,
    [RECEIPT_VAT_TILL4, STORE_SUPREME]
  );
  await client.query(
    `INSERT INTO line_items (id, receipt_id, description, quantity, unit_price, line_total, line_order)
     VALUES ($1, $2, 'Blood Pressure Monitor', 1, 3000.00, 3000.00, 1)`,
    [LINE_ITEM_VAT_1, RECEIPT_VAT_TILL4]
  );

  // extraction_reviews case 1: a single field is wrong (receipt-level)
  await client.query(
    `INSERT INTO extraction_reviews (
       receipt_id, line_item_id, field_name, extractor_source, extracted_value,
       confidence_score, flagged_reason, status
     ) VALUES (
       $1, NULL, 'total', 'tesseract-ocr', '4300.00',
       0.612, 'low_confidence', 'pending'
     )`,
    [RECEIPT_FULL]
  );

  // extraction_reviews case 2: a single field is wrong (line-item-level)
  await client.query(
    `INSERT INTO extraction_reviews (
       receipt_id, line_item_id, field_name, extractor_source, extracted_value,
       confidence_score, flagged_reason, status, reviewed_value, resolved_at, reviewed_by
     ) VALUES (
       $1, $2, 'quantity', 'claude-vision-v2', '1',
       0.45, 'illegible', 'resolved', '2', now(), 'reviewer_jane'
     )`,
    [RECEIPT_MINIMAL, LINE_ITEM_MINIMAL_1]
  );

  // extraction_reviews case 3: the row itself is wrong (line_item sentinel)
  await client.query(
    `INSERT INTO extraction_reviews (
       receipt_id, line_item_id, field_name, extractor_source,
       confidence_score, flagged_reason, status, resolution_notes
     ) VALUES (
       $1, $2, 'line_item', 'claude-vision-v2',
       0.30, 'validation_failed', 'pending', NULL
     )`,
    [RECEIPT_FULL, LINE_ITEM_FULL_2]
  );

  // extraction_reviews case 4: an item was missed entirely (missing_line_item sentinel)
  await client.query(
    `INSERT INTO extraction_reviews (
       receipt_id, line_item_id, field_name, extractor_source, extracted_value,
       confidence_score, flagged_reason, status, reviewed_value
     ) VALUES (
       $1, NULL, 'missing_line_item', 'tesseract-ocr', NULL,
       0.20, 'validation_failed', 'resolved', 'Cough Syrup 100ml, qty 1, unit_price 800.00, line_total 800.00'
     )`,
    [RECEIPT_VAT_TILL4]
  );

  // extraction_reviews case 5: multi-extractor conflict — two agents disagree
  // on the same receipt/line_item/field triplet
  await client.query(
    `INSERT INTO extraction_reviews (
       receipt_id, line_item_id, field_name, extractor_source, extracted_value,
       confidence_score, flagged_reason, status
     ) VALUES (
       $1, $2, 'unit_price', 'tesseract-ocr', '500.00',
       0.55, 'conflicting_extractions', 'pending'
     )`,
    [RECEIPT_FULL, LINE_ITEM_FULL_1]
  );
  await client.query(
    `INSERT INTO extraction_reviews (
       receipt_id, line_item_id, field_name, extractor_source, extracted_value,
       confidence_score, flagged_reason, status
     ) VALUES (
       $1, $2, 'unit_price', 'claude-vision-v2', '550.00',
       0.68, 'conflicting_extractions', 'pending'
     )`,
    [RECEIPT_FULL, LINE_ITEM_FULL_1]
  );

  // extraction_reviews case 6: extraction failed for the whole receipt
  // (receipt sentinel) — no candidate data at all, e.g. an unreadable image
  await client.query(
    `INSERT INTO extraction_reviews (
       receipt_id, line_item_id, field_name, extractor_source, extracted_value,
       confidence_score, flagged_reason, status
     ) VALUES (
       $1, NULL, 'receipt', 'claude-vision-v2', NULL,
       0.00, 'extraction_failed', 'pending'
     )`,
    [RECEIPT_VAT_TILL4]
  );
};

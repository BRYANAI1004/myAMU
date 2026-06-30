import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from "../lib/db.js";

export type StoreOrderStatus = "cart" | "pending" | "paid" | "failed" | "cancelled";

export type StoreOrderItemRow = {
  id: number;
  orderId: number;
  feeCode: string;
  description: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  billingAdjustmentId: number | null;
  notes: string | null;
};

export type StoreOrderRow = {
  id: number;
  studentExternalId: string;
  term: string;
  year: number;
  status: StoreOrderStatus;
  subtotal: number;
  providerTransactionId: string | null;
  invoiceNumber: string | null;
  createdAt: string;
  paidAt: string | null;
};

let storeTablesExistCache: boolean | null = null;

export function resetPortalStoreTablesExistCache(): void {
  storeTablesExistCache = null;
}

export async function portalStoreTablesExist(
  pool: Pool | PoolConnection,
): Promise<boolean> {
  if (storeTablesExistCache === true) return true;
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'portal_store_orders'`,
    );
    const exists = Number(rows[0]?.c ?? 0) > 0;
    if (exists) storeTablesExistCache = true;
    return exists;
  } catch {
    return false;
  }
}

export async function insertStoreOrder(
  conn: PoolConnection,
  params: {
    studentExternalId: string;
    term: string;
    year: number;
    subtotal: number;
    status: StoreOrderStatus;
  },
): Promise<number> {
  const [res] = await conn.execute<ResultSetHeader>(
    `INSERT INTO portal_store_orders
      (student_external_id, term, year, status, subtotal)
     VALUES (?, ?, ?, ?, ?)`,
    [
      params.studentExternalId.trim(),
      params.term.trim(),
      Math.trunc(params.year),
      params.status,
      params.subtotal,
    ],
  );
  return Math.trunc(Number(res.insertId));
}

export async function insertStoreOrderItem(
  conn: PoolConnection,
  params: {
    orderId: number;
    feeCode: string;
    description: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    billingAdjustmentId: number | null;
    notes: string | null;
  },
): Promise<number> {
  const [res] = await conn.execute<ResultSetHeader>(
    `INSERT INTO portal_store_order_items
      (order_id, fee_code, description, unit_price, quantity, line_total, billing_adjustment_id, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      Math.trunc(params.orderId),
      params.feeCode.trim(),
      params.description.trim().slice(0, 255),
      params.unitPrice,
      Math.trunc(params.quantity),
      params.lineTotal,
      params.billingAdjustmentId,
      params.notes,
    ],
  );
  return Math.trunc(Number(res.insertId));
}

export async function markStoreOrderPaid(
  conn: PoolConnection,
  params: {
    orderId: number;
    providerTransactionId: string;
    invoiceNumber: string;
  },
): Promise<void> {
  await conn.execute(
    `UPDATE portal_store_orders
     SET status = 'paid',
         provider_transaction_id = ?,
         invoice_number = ?,
         paid_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      params.providerTransactionId.trim(),
      params.invoiceNumber.trim(),
      Math.trunc(params.orderId),
    ],
  );
}

export async function markStoreOrderFailed(
  conn: PoolConnection,
  orderId: number,
): Promise<void> {
  await conn.execute(
    `UPDATE portal_store_orders SET status = 'failed' WHERE id = ?`,
    [Math.trunc(orderId)],
  );
}

export async function getActiveCartOrder(
  pool: Pool | PoolConnection,
  studentExternalId: string,
  term: string,
  year: number,
): Promise<StoreOrderRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id,
            student_external_id AS studentExternalId,
            term,
            year,
            status,
            subtotal,
            provider_transaction_id AS providerTransactionId,
            invoice_number AS invoiceNumber,
            created_at AS createdAt,
            paid_at AS paidAt
     FROM portal_store_orders
     WHERE student_external_id = ?
       AND term = ?
       AND year = ?
       AND status = 'cart'
     ORDER BY id DESC
     LIMIT 1`,
    [studentExternalId.trim(), term.trim(), Math.trunc(year)],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: Math.trunc(Number(row.id)),
    studentExternalId: String(row.studentExternalId ?? ""),
    term: String(row.term ?? ""),
    year: Math.trunc(Number(row.year)),
    status: String(row.status ?? "cart") as StoreOrderStatus,
    subtotal: Number(row.subtotal),
    providerTransactionId:
      row.providerTransactionId != null ? String(row.providerTransactionId) : null,
    invoiceNumber: row.invoiceNumber != null ? String(row.invoiceNumber) : null,
    createdAt: String(row.createdAt ?? ""),
    paidAt: row.paidAt != null ? String(row.paidAt) : null,
  };
}

export async function listStoreOrderItems(
  pool: Pool | PoolConnection,
  orderId: number,
): Promise<StoreOrderItemRow[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id,
            order_id AS orderId,
            fee_code AS feeCode,
            description,
            unit_price AS unitPrice,
            quantity,
            line_total AS lineTotal,
            billing_adjustment_id AS billingAdjustmentId,
            notes
     FROM portal_store_order_items
     WHERE order_id = ?
     ORDER BY id ASC`,
    [Math.trunc(orderId)],
  );
  return rows.map((row) => ({
    id: Math.trunc(Number(row.id)),
    orderId: Math.trunc(Number(row.orderId)),
    feeCode: String(row.feeCode ?? ""),
    description: String(row.description ?? ""),
    unitPrice: Number(row.unitPrice),
    quantity: Math.trunc(Number(row.quantity)),
    lineTotal: Number(row.lineTotal),
    billingAdjustmentId:
      row.billingAdjustmentId != null
        ? Math.trunc(Number(row.billingAdjustmentId))
        : null,
    notes: row.notes != null ? String(row.notes) : null,
  }));
}

export async function findStoreOrderItemByFeeCode(
  pool: Pool | PoolConnection,
  orderId: number,
  feeCode: string,
): Promise<StoreOrderItemRow | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id,
            order_id AS orderId,
            fee_code AS feeCode,
            description,
            unit_price AS unitPrice,
            quantity,
            line_total AS lineTotal,
            billing_adjustment_id AS billingAdjustmentId,
            notes
     FROM portal_store_order_items
     WHERE order_id = ? AND fee_code = ?
     LIMIT 1`,
    [Math.trunc(orderId), feeCode.trim()],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: Math.trunc(Number(row.id)),
    orderId: Math.trunc(Number(row.orderId)),
    feeCode: String(row.feeCode ?? ""),
    description: String(row.description ?? ""),
    unitPrice: Number(row.unitPrice),
    quantity: Math.trunc(Number(row.quantity)),
    lineTotal: Number(row.lineTotal),
    billingAdjustmentId:
      row.billingAdjustmentId != null
        ? Math.trunc(Number(row.billingAdjustmentId))
        : null,
    notes: row.notes != null ? String(row.notes) : null,
  };
}

export async function updateStoreOrderSubtotal(
  conn: PoolConnection,
  orderId: number,
  subtotal: number,
): Promise<void> {
  await conn.execute(
    `UPDATE portal_store_orders SET subtotal = ? WHERE id = ?`,
    [subtotal, Math.trunc(orderId)],
  );
}

export async function updateStoreOrderItem(
  conn: PoolConnection,
  itemId: number,
  params: {
    quantity: number;
    lineTotal: number;
    description: string;
    notes: string | null;
  },
): Promise<void> {
  await conn.execute(
    `UPDATE portal_store_order_items
     SET quantity = ?, line_total = ?, description = ?, notes = ?
     WHERE id = ?`,
    [
      Math.trunc(params.quantity),
      params.lineTotal,
      params.description.trim().slice(0, 255),
      params.notes,
      Math.trunc(itemId),
    ],
  );
}

export async function linkStoreOrderItemBillingAdjustment(
  conn: PoolConnection,
  itemId: number,
  billingAdjustmentId: number,
): Promise<void> {
  await conn.execute(
    `UPDATE portal_store_order_items
     SET billing_adjustment_id = ?
     WHERE id = ?`,
    [Math.trunc(billingAdjustmentId), Math.trunc(itemId)],
  );
}

export async function deleteStoreOrderItem(
  conn: PoolConnection,
  itemId: number,
): Promise<void> {
  await conn.execute(`DELETE FROM portal_store_order_items WHERE id = ?`, [
    Math.trunc(itemId),
  ]);
}

export async function deleteCartOrder(
  conn: PoolConnection,
  orderId: number,
): Promise<void> {
  await conn.execute(`DELETE FROM portal_store_orders WHERE id = ? AND status = 'cart'`, [
    Math.trunc(orderId),
  ]);
}

export async function countStoreOrderItems(
  conn: PoolConnection,
  orderId: number,
): Promise<number> {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM portal_store_order_items WHERE order_id = ?`,
    [Math.trunc(orderId)],
  );
  return Math.trunc(Number(rows[0]?.c ?? 0));
}

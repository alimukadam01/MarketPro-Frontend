import { useState, useEffect } from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { getInvoicePDFData } from "../../services/api";
import { formatDate } from "../../services/utils"

/* MarketPro theme, resolved from the HSL tokens in index.css */
const COLORS = {
  primary: "#7C3AED",      // --primary
  primarySoft: "#F5F3FF",  // violet tint for the table head
  text: "#030712",         // --foreground
  muted: "#6B7280",        // --muted-foreground
  border: "#E5E7EB",       // --border
  wordmark: "#9CA3AF",     // ghosted, but dark enough to actually read
};

const money = (amount) => `PKR ${Number(amount || 0).toLocaleString()}`;

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 64,
    paddingHorizontal: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: COLORS.text,
  },

  /* ---------- HEADER ---------- */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  businessName: {
    fontSize: 17,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    marginBottom: 4,
  },
  headerLeft: {
    width: "62%",
  },
  // No lineHeight anywhere on a Text: this version of react-pdf reserves two
  // line boxes for any Text that sets one, leaving a blank line under it.
  businessMeta: {
    color: COLORS.muted,
  },
  invoiceWord: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 4,
    color: COLORS.wordmark,
    textAlign: "right",
  },
  rule: {
    height: 2,
    backgroundColor: COLORS.primary,
    marginTop: 14,
    marginBottom: 18,
  },

  /* ---------- BILL TO / META ---------- */
  columns: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  label: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.2,
    color: COLORS.muted,
    marginBottom: 5,
  },
  partyName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
  },
  billedTo: {
    width: "58%",
  },
  partyMeta: {
    color: COLORS.muted,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 3,
  },
  metaLabel: {
    color: COLORS.muted,
    marginRight: 10,
  },
  metaValue: {
    fontFamily: "Helvetica-Bold",
    width: 90,
    textAlign: "right",
  },

  /* ---------- TABLE ---------- */
  tableHead: {
    flexDirection: "row",
    backgroundColor: COLORS.primarySoft,
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  headCell: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.2,
    color: COLORS.primary,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottom: `0.5 solid ${COLORS.border}`,
  },
  colSno: { width: "6%", color: COLORS.muted },
  colItem: { width: "48%", paddingRight: 8 },
  colQty: { width: "10%", textAlign: "right" },
  colRate: { width: "16%", textAlign: "right" },
  colAmount: { width: "20%", textAlign: "right" },
  variant: {
    color: COLORS.muted,
    fontSize: 8,
    marginTop: 2,
  },

  /* ---------- TOTALS ---------- */
  totals: {
    marginTop: 18,
    marginLeft: "auto",
    width: "48%",
  },
  // Every totals row carries the same horizontal padding as the tinted net
  // row, so all labels share a left edge and all amounts share a right one.
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  totalLabel: { color: COLORS.muted },
  netRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 8,
    paddingTop: 9,
    paddingBottom: 9,
    paddingHorizontal: 10,
    backgroundColor: COLORS.primarySoft,
  },
  netLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    color: COLORS.primary,
  },
  netValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
  },
  dueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dueLabel: { fontFamily: "Helvetica-Bold" },

  /* ---------- FOOTER ---------- */
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    paddingTop: 10,
    borderTop: `0.5 solid ${COLORS.border}`,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: COLORS.muted,
  },
});

/**
 * Renders the invoice PDF. Pass `invoice` when the page has already loaded the
 * data - the PDF is also generated programmatically for sharing, where an
 * internal fetch would not have resolved before the document renders.
 */
const Invoice = ({ token, invoice_id, invoice: invoiceProp = null }) => {
  const [fetched, setFetched] = useState(null)
  const invoice = invoiceProp || fetched

  useEffect(() => {
    const fetchInvoice = async () => {
      if (invoiceProp) return
      if (!token || !invoice_id) {
        return
      }

      try {
        const data = await getInvoicePDFData(token, invoice_id)
        setFetched(data)
      } catch (error) {
        console.log("Error fetching invoice details:", error)
      }
    }

    fetchInvoice()
  }, [token, invoice_id, invoiceProp])

  if (!invoice) {
    return <Document><Page size="A4" style={styles.page} /></Document>
  }

  const business = invoice.business || {}
  const customer = invoice.customer || {}
  const items = invoice.invoice_items || []

  const paid = Number(invoice.amount_paid || 0)
  const balance = Number(invoice.total || 0) - paid

  // Mirrors SalesInvoice.adjust_totals: both are worked out on the raw
  // subtotal — tax is NOT charged on the discounted figure — and
  // total = subtotal + tax - discount. Kept in step so the lines add up.
  const modifierAmount = (entry) => {
    if (!entry || !entry.value) return 0
    return entry.type === "percentage"
      ? (Number(invoice.sub_total) || 0) * entry.value / 100
      : Number(entry.value)
  }

  const rate = (entry) =>
    entry?.type === "percentage" ? ` (${entry.value}%)` : ""

  const discountAmount = modifierAmount(invoice.discount)
  const taxAmount = modifierAmount(invoice.tax)

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Header */}
        <View style={styles.header} fixed>
          <View style={styles.headerLeft}>
            <Text style={styles.businessName}>{business.name}</Text>
            <Text style={styles.businessMeta}>{business.address}</Text>
            <Text style={styles.businessMeta}>{business.phone}</Text>
          </View>
          <Text style={styles.invoiceWord}>INVOICE</Text>
        </View>
        <View style={styles.rule} fixed />

        {/* Bill to + invoice meta */}
        <View style={styles.columns}>
          <View style={styles.billedTo}>
            <Text style={styles.label}>BILLED TO</Text>
            <Text style={styles.partyName}>{customer.name}</Text>
            {customer.phone ? (
              <Text style={styles.partyMeta}>{customer.phone}</Text>
            ) : null}
            {customer.address ? (
              <Text style={styles.partyMeta}>{customer.address}</Text>
            ) : null}
          </View>

          <View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Invoice No.</Text>
              <Text style={styles.metaValue}>
                {invoice.invoice_number || invoice.id}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue}>
                {formatDate(invoice.date_issued || invoice.created_at)}
              </Text>
            </View>
          </View>
        </View>

        {/* Items */}
        <View style={styles.tableHead} fixed>
          <Text style={[styles.headCell, styles.colSno]}>#</Text>
          <Text style={[styles.headCell, styles.colItem]}>ITEM</Text>
          <Text style={[styles.headCell, styles.colQty]}>QTY</Text>
          <Text style={[styles.headCell, styles.colRate]}>RATE</Text>
          <Text style={[styles.headCell, styles.colAmount]}>AMOUNT</Text>
        </View>

        {items.map((item, index) => (
          <View style={styles.row} key={index} wrap={false}>
            <Text style={styles.colSno}>{index + 1}</Text>
            <View style={styles.colItem}>
              <Text>{item.product?.base?.name}</Text>
              {/* "default" is the placeholder name for a variant-less
                  product — printing it under every line is just noise. */}
              {item.product?.name && item.product.name !== "default" ? (
                <Text style={styles.variant}>{item.product.name}</Text>
              ) : null}
            </View>
            <Text style={styles.colQty}>{item.net_quantity}</Text>
            <Text style={styles.colRate}>{money(item.unit_price)}</Text>
            <Text style={styles.colAmount}>
              {money(item.unit_price * item.net_quantity)}
            </Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totals} wrap={false}>
          {discountAmount > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Discount{rate(invoice.discount)}
              </Text>
              <Text>- {money(discountAmount)}</Text>
            </View>
          ) : null}

          {taxAmount > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax{rate(invoice.tax)}</Text>
              <Text>{money(taxAmount)}</Text>
            </View>
          ) : null}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text>{money(invoice.sub_total)}</Text>
          </View>

          <View style={styles.netRow}>
            <Text style={styles.netLabel}>NET AMOUNT</Text>
            <Text style={styles.netValue}>{money(invoice.total)}</Text>
          </View>

          {paid > 0 ? (
            <View style={styles.dueRow}>
              <Text style={styles.totalLabel}>Amount Paid</Text>
              <Text>{money(paid)}</Text>
            </View>
          ) : null}

          {balance > 0 ? (
            <View style={styles.dueRow}>
              <Text style={styles.dueLabel}>Balance Due</Text>
              <Text style={styles.dueLabel}>{money(balance)}</Text>
            </View>
          ) : null}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Generated by Market Pro</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  )
};

export default Invoice;

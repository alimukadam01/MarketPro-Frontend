import {React, useState, useEffect } from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { useAuth } from "../../services/AuthProvider"
import { getInvoicePDFData } from "../../services/api";
import { formatDate } from "../../services/utils"

const styles = StyleSheet.create({
  page: {
    size: "A4",
    padding: 20,
    fontSize: 10,
    fontFamily: "Helvetica",
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
  },

  /* ---------- HEADER ---------- */
  businessHeader: {
    textAlign: "center",
    marginBottom: 8,
  },
  businessName: {
    fontSize: 14,
    fontWeight: "bold",
  },

  invoiceTitle: {
    textAlign: "center",
    fontSize: 18,
    marginVertical: 10,
    fontWeight: "bold",
    letterSpacing: 2,
  },

  /* ---------- INFO SECTION ---------- */
  infoRow: {
    flexDirection: "row",
    border: "1 solid #000",
    marginBottom: 10,
  },
  infoBox: {
    width: "50%",
    padding: 6,
    borderRight: "1 solid #000",
  },
  infoBoxLast: {
    width: "50%",
    padding: 6,
  },

  /* ---------- TABLE ---------- */
  tableHeader: {
    flexDirection: "row",
    border: "1 solid #000",
    backgroundColor: "#f0f0f0",
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #000",
  },

  colSno: { width: "5%", textAlign: "center", padding: 4 },
  colParticular: { width: "52%", padding: 4 },
  colQty: { width: "8%", textAlign: "center", padding: 4 },
  colRate: { width: "15%", textAlign: "right", padding: 4 },
  colAmount: { width: "20%", textAlign: "right", padding: 4 },

  /* ---------- TOTALS ---------- */
  totals: {
    marginTop: 10,
    border: "1 solid #000",
  },
  totalRow: {
    flexDirection: "row",
    padding: 6,
    borderBottom: "1 solid #000",
  },
  totalLabel: {
    width: "80%",
    textAlign: "right",
    paddingRight: 10,
  },
  totalValue: {
    width: "20%",
    textAlign: "right",
  },

  /* ---------- FOOTER ---------- */
  footer: {
    marginTop: "auto",
    paddingTop: 20,
    borderTop: "1 solid #ddd",
    textAlign: "center",
    fontSize: 9,
    color: "#555",
  },
});

const Invoice = ({ token, invoice_id }) => {
  const [invoice, setInvoice] = useState(null)

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!token || !invoice_id) {
        return
      }

      try {
        const data = await getInvoicePDFData(token, invoice_id)
        setInvoice(data)
      } catch (error) {
        console.error("Error fetching invoice details:", error)
      }
    }

    fetchInvoice()
  }, [token, invoice_id])

  const business = invoice?.business || null
  const customer = invoice?.customer || null
  
  if (invoice){
  return (
      <Document>
        <Page style={styles.page} wrap>
          <View style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          {/* Business Header */}
          <View style={styles.businessHeader} fixed>
            <Text style={styles.businessName}>{business.name}</Text>
            <Text>{business.address}</Text>
            <Text>Contact #: {business.phone}</Text>
          </View>

          {/* Invoice Title */}
          <Text style={styles.invoiceTitle} fixed>
            INVOICE
          </Text>

          {/* Info Section */}
          <View style={styles.infoRow}>
            <View style={styles.infoBox}>
              <Text>Name: {customer.name}</Text>
              <Text>Contact: {customer.phone}</Text>
              <Text>Address: {customer.address}</Text>
            </View>
            <View style={styles.infoBoxLast}>
              <Text>Invoice Number: {invoice.invoice_number}</Text>
              <Text>Date: {formatDate(invoice.created_at)}</Text>
            </View>
          </View>

          {/* Table Header */}
          <View style={styles.tableHeader} fixed>
            <Text style={styles.colSno}>S#</Text>
            <Text style={styles.colParticular}>Particular</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colRate}>Rate</Text>
            <Text style={styles.colAmount}>Amount</Text>
          </View>

          {/* Items (MULTI-PAGE SAFE) */}
          {invoice.invoice_items.map((item, index) => (
            <View style={styles.tableRow} key={index} wrap>
              <Text style={styles.colSno}>{index + 1}</Text>
              <Text style={styles.colParticular}>{item.product.base.name} ({item.product.name})</Text>
              <Text style={styles.colQty}>{item.net_quantity}</Text>
              <Text style={styles.colRate}>{item.unit_price}</Text>
              <Text style={styles.colAmount}>
                {item.unit_price * item.net_quantity}
              </Text>
            </View>
          ))}

          {/* Totals */}
          <View style={styles.totals} wrap={false}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>SUBTOTAL</Text>
              <Text style={styles.totalValue}>PKR {invoice.sub_total}</Text>
            </View>

            {invoice.discount && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  DISCOUNT
                </Text>
                <Text style={styles.totalValue}>
                  {invoice.discount.type === "percentage"?
                    ` ${invoice.discount.value}%`: ` PKR ${invoice.discount.value}`}
                </Text> 
              </View>
            )}

            {invoice.tax && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  TAX
                </Text>
                <Text style={styles.totalValue}>
                  {invoice.tax.type === "percentage"?
                    ` ${invoice.tax.value}%`: ` PKR ${invoice.tax.value}`}
                </Text>
              </View>
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>NET AMOUNT</Text>
              <Text style={styles.totalValue}>PKR {invoice.total}</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer} fixed>
            <Text>Invoice generated by Market Pro</Text>
            <Text>For more details, contact 0331-3689402</Text>
          </View>
          </View>
        </Page>
      </Document>
    )}

  else {
    return (<div></div>)
  }
};

export default Invoice;

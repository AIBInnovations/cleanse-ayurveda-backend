import { Order } from "../../models/order.model.js";
import { OrderItem } from "../../models/orderItem.model.js";
import { Invoice } from "../../models/invoice.model.js";
import { sendInvoiceEmail } from "../../services/engagement-integration.service.js";
import PDFDocument from "pdfkit";

/**
 * Auto Invoice Generation Job
 * Automatically generates invoices for delivered orders
 * Runs every 6 hours
 */
export async function autoInvoiceGenerationJob() {
  try {
    console.log("> Running auto invoice generation job...");

    // Find delivered orders without invoices
    const deliveredOrders = await Order.find({
      status: "delivered",
      deliveredAt: { $ne: null }
    }).limit(100); // Process max 100 orders per run

    if (deliveredOrders.length === 0) {
      console.log("> No delivered orders found");
      return { success: true, generatedCount: 0 };
    }

    console.log(`> Found ${deliveredOrders.length} delivered orders`);

    // Filter orders that don't have invoices yet
    const ordersNeedingInvoices = [];
    for (const order of deliveredOrders) {
      const existingInvoice = await Invoice.findOne({ orderId: order._id.toString() });
      if (!existingInvoice) {
        ordersNeedingInvoices.push(order);
      }
    }

    if (ordersNeedingInvoices.length === 0) {
      console.log("> All delivered orders already have invoices");
      return { success: true, generatedCount: 0 };
    }

    console.log(`> ${ordersNeedingInvoices.length} orders need invoices`);

    let generatedCount = 0;
    let errors = 0;

    for (const order of ordersNeedingInvoices) {
      try {
        // Get order items
        const orderItems = await OrderItem.find({ orderId: order._id.toString() });

        if (orderItems.length === 0) {
          console.log(`> Order ${order.orderNumber} has no items, skipping`);
          continue;
        }

        // Calculate invoice amounts
        let subtotal = 0;
        let totalTax = 0;

        for (const item of orderItems) {
          subtotal += item.lineTotal;
          totalTax += item.lineTax;
        }

        let total = subtotal + totalTax + (order.shippingCharges || 0) - (order.totalDiscount || 0);

        // Generate invoice number (format: INV-YYYYMMDD-XXXXX)
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
        const count = await Invoice.countDocuments();
        const invoiceNumber = `INV-${dateStr}-${String(count + 1).padStart(5, "0")}`;

        // Create invoice
        const invoice = await Invoice.create({
          invoiceNumber,
          orderId: order._id.toString(),
          userId: order.userId,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          customerPhone: order.customerPhone,
          billingAddress: order.billingAddress,
          shippingAddress: order.shippingAddress,
          items: orderItems.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            variantId: item.variantId,
            variantName: item.variantName,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineDiscount: item.lineDiscount,
            lineTax: item.lineTax,
            lineTotal: item.lineTotal
          })),
          subtotal,
          totalTax,
          totalDiscount: order.totalDiscount || 0,
          shippingCharges: order.shippingCharges || 0,
          total,
          notes: "Auto-generated invoice for delivered order",
          generatedBy: "system"
        });

        console.log(`> Generated invoice ${invoiceNumber} for order ${order.orderNumber}`);

        // Send invoice email
        try {
          const pdfBuffer = await generateInvoicePdf(invoice, order, orderItems);

          const emailData = {
            to: order.customerEmail,
            subject: `Your Invoice ${invoice.invoiceNumber} - Cleanse Ayurveda`,
            template: "invoice",
            context: {
              customerName: order.customerName,
              invoiceNumber: invoice.invoiceNumber,
              orderNumber: order.orderNumber,
              total: invoice.total
            },
            attachments: [
              {
                filename: `invoice-${invoice.invoiceNumber}.pdf`,
                content: pdfBuffer,
                contentType: "application/pdf"
              }
            ]
          };

          await sendInvoiceEmail(emailData);

          invoice.emailSentAt = new Date();
          invoice.emailSentTo = order.customerEmail;
          await invoice.save();

          console.log(`> Sent invoice email to ${order.customerEmail}`);
        } catch (emailError) {
          console.error(`> Failed to send invoice email for order ${order.orderNumber}:`, emailError);
        }

        generatedCount++;
      } catch (orderError) {
        console.error(`> Error generating invoice for order ${order.orderNumber}:`, orderError);
        errors++;
      }
    }

    console.log("> Auto invoice generation job completed");
    console.log(`> Invoices generated: ${generatedCount}, Errors: ${errors}`);

    return {
      success: true,
      generatedCount,
      errors
    };
  } catch (error) {
    console.error("> Error in auto invoice generation job:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate invoice PDF
 */
async function generateInvoicePdf(invoice, order, orderItems) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on("error", reject);

      // Header
      doc.fontSize(20).text("INVOICE", { align: "center" });
      doc.moveDown();

      // Company details
      doc.fontSize(12).text("Cleanse Ayurveda", { continued: false });
      doc.fontSize(10).text("Address Line 1");
      doc.text("Address Line 2");
      doc.text("Phone: +91-XXXXXXXXXX");
      doc.text("Email: support@cleanseayurveda.com");
      doc.moveDown();

      // Invoice details
      doc.fontSize(10);
      doc.text(`Invoice Number: ${invoice.invoiceNumber}`, { align: "right" });
      doc.text(`Order Number: ${order.orderNumber}`, { align: "right" });
      doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, { align: "right" });
      doc.moveDown();

      // Customer details
      doc.fontSize(12).text("Bill To:", { underline: true });
      doc.fontSize(10).text(invoice.customerName);
      doc.text(invoice.customerEmail);
      doc.text(invoice.customerPhone);
      if (invoice.billingAddress) {
        doc.text(invoice.billingAddress.addressLine1);
        if (invoice.billingAddress.addressLine2) {
          doc.text(invoice.billingAddress.addressLine2);
        }
        doc.text(
          `${invoice.billingAddress.city}, ${invoice.billingAddress.state} ${invoice.billingAddress.postalCode}`
        );
      }
      doc.moveDown();

      // Items table
      const tableTop = doc.y;
      const itemCodeX = 50;
      const descriptionX = 150;
      const quantityX = 300;
      const priceX = 360;
      const amountX = 420;

      doc.fontSize(10).font("Helvetica-Bold");
      doc.text("Item", itemCodeX, tableTop);
      doc.text("Description", descriptionX, tableTop);
      doc.text("Qty", quantityX, tableTop);
      doc.text("Price", priceX, tableTop);
      doc.text("Amount", amountX, tableTop);

      doc.moveTo(itemCodeX, tableTop + 15).lineTo(520, tableTop + 15).stroke();

      let yPosition = tableTop + 25;
      doc.font("Helvetica");

      for (const item of invoice.items) {
        doc.text(item.sku || "N/A", itemCodeX, yPosition);
        doc.text(item.productName, descriptionX, yPosition, { width: 140 });
        doc.text(item.quantity.toString(), quantityX, yPosition);
        doc.text(`₹${item.unitPrice.toFixed(2)}`, priceX, yPosition);
        doc.text(`₹${item.lineTotal.toFixed(2)}`, amountX, yPosition);
        yPosition += 20;
      }

      doc.moveTo(itemCodeX, yPosition).lineTo(520, yPosition).stroke();
      yPosition += 10;

      // Totals
      doc.font("Helvetica");
      doc.text("Subtotal:", priceX, yPosition);
      doc.text(`₹${invoice.subtotal.toFixed(2)}`, amountX, yPosition);
      yPosition += 20;

      if (invoice.totalDiscount > 0) {
        doc.text("Discount:", priceX, yPosition);
        doc.text(`-₹${invoice.totalDiscount.toFixed(2)}`, amountX, yPosition);
        yPosition += 20;
      }

      if (invoice.shippingCharges > 0) {
        doc.text("Shipping:", priceX, yPosition);
        doc.text(`₹${invoice.shippingCharges.toFixed(2)}`, amountX, yPosition);
        yPosition += 20;
      }

      doc.text("Tax:", priceX, yPosition);
      doc.text(`₹${invoice.totalTax.toFixed(2)}`, amountX, yPosition);
      yPosition += 20;

      doc.font("Helvetica-Bold").fontSize(12);
      doc.text("Total:", priceX, yPosition);
      doc.text(`₹${invoice.total.toFixed(2)}`, amountX, yPosition);

      if (invoice.notes) {
        doc.moveDown(2);
        doc.fontSize(10).font("Helvetica");
        doc.text("Notes:", { underline: true });
        doc.text(invoice.notes);
      }

      doc.moveDown(2);
      doc.fontSize(8).text("Thank you for your business!", { align: "center" });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

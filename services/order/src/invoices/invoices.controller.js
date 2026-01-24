import { sendResponse } from "@shared/utils";
import { Invoice } from "../../models/index.js";
import { Order } from "../../models/index.js";
import { OrderItem } from "../../models/index.js";
import { Payment } from "../../models/index.js";
import { sendInvoiceEmail as sendInvoiceEmailService } from "../../services/engagement-integration.service.js";
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

/**
 * Consumer Controllers
 */

/**
 * Get invoice by ID
 * @route GET /api/invoices/:invoiceId
 */
export const getInvoiceById = async (req, res) => {
  try {
    console.log("> Getting invoice by ID:", req.params.invoiceId);

    const { invoiceId } = req.params;
    const userId = req.user._id.toString();

    // Find invoice
    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      console.log("> Invoice not found");
      return sendResponse(
        res,
        404,
        "Invoice not found",
        null,
        "Invoice not found"
      );
    }

    // Verify ownership
    if (invoice.userId !== userId) {
      console.log("> Access denied - not invoice owner");
      return sendResponse(
        res,
        403,
        "Access denied",
        null,
        "You don't have permission to view this invoice"
      );
    }

    console.log("> Invoice retrieved successfully");
    return sendResponse(res, 200, "Invoice retrieved successfully", { invoice }, null);
  } catch (error) {
    console.error("> Error getting invoice:", error);
    return sendResponse(
      res,
      500,
      "Failed to get invoice",
      null,
      createError("SERVER_ERROR", error.message)
    );
  }
};

/**
 * Get invoice by order ID
 * @route GET /api/invoices/order/:orderId
 */
export const getInvoiceByOrderId = async (req, res) => {
  try {
    console.log("> Getting invoice by order ID:", req.params.orderId);

    const { orderId } = req.params;
    const userId = req.user._id.toString();

    // Find order
    const order = await Order.findById(orderId);

    if (!order) {
      console.log("> Order not found");
      return sendResponse(
        res,
        404,
        "Order not found",
        null,
        "Order not found"
      );
    }

    // Verify ownership
    if (order.userId !== userId) {
      console.log("> Access denied - not order owner");
      return sendResponse(
        res,
        403,
        "Access denied",
        null,
        "You don't have permission to view this invoice"
      );
    }

    // Find invoice
    const invoice = await Invoice.findOne({ orderId });

    if (!invoice) {
      console.log("> Invoice not found for this order");
      return sendResponse(
        res,
        404,
        "Invoice not found for this order",
        null,
        "Invoice has not been generated for this order yet"
      );
    }

    console.log("> Invoice retrieved successfully");
    return sendResponse(res, 200, "Invoice retrieved successfully", { invoice }, null);
  } catch (error) {
    console.error("> Error getting invoice by order ID:", error);
    return sendResponse(
      res,
      500,
      "Failed to get invoice",
      null,
      createError("SERVER_ERROR", error.message)
    );
  }
};

/**
 * Download invoice PDF
 * @route GET /api/invoices/:invoiceId/download
 */
export const downloadInvoicePdf = async (req, res) => {
  try {
    console.log("> Downloading invoice PDF:", req.params.invoiceId);

    const { invoiceId } = req.params;
    const userId = req.user._id.toString();

    // Find invoice
    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      console.log("> Invoice not found");
      return sendResponse(
        res,
        404,
        "Invoice not found",
        null,
        "Invoice not found"
      );
    }

    // Verify ownership
    if (invoice.userId !== userId) {
      console.log("> Access denied - not invoice owner");
      return sendResponse(
        res,
        403,
        "Access denied",
        null,
        "You don't have permission to download this invoice"
      );
    }

    // Get order details
    const order = await Order.findById(invoice.orderId);
    const orderItems = await OrderItem.find({ orderId: invoice.orderId });

    // Generate PDF
    const pdfBuffer = await generateInvoicePdf(invoice, order, orderItems);

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`
    );

    console.log("> Invoice PDF downloaded successfully");
    return res.send(pdfBuffer);
  } catch (error) {
    console.error("> Error downloading invoice PDF:", error);
    return sendResponse(
      res,
      500,
      "Failed to download invoice PDF",
      null,
      createError("SERVER_ERROR", error.message)
    );
  }
};

/**
 * Get my invoices
 * @route GET /api/invoices
 */
export const getMyInvoices = async (req, res) => {
  try {
    console.log("> Getting my invoices");

    const userId = req.user._id.toString();
    const { page = 1, limit = 20, startDate, endDate, sortBy = "createdAt", sortOrder = "desc" } = req.query;

    // Build filter
    const filter = { userId };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Count total documents
    const total = await Invoice.countDocuments(filter);

    // Get paginated invoices
    const invoices = await Invoice.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    console.log(`> Retrieved ${invoices.length} invoices`);

    return sendResponse(
      res,
      200,
      "Invoices retrieved successfully",
      {
        invoices,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      },
      null
    );
  } catch (error) {
    console.error("> Error getting my invoices:", error);
    return sendResponse(
      res,
      500,
      "Failed to get invoices",
      null,
      createError("SERVER_ERROR", error.message)
    );
  }
};

/**
 * Admin Controllers
 */

/**
 * Generate invoice for order
 * @route POST /api/admin/invoices/generate/:orderId
 */
export const generateInvoice = async (req, res) => {
  try {
    console.log("> Generating invoice for order:", req.params.orderId);

    const { orderId } = req.params;
    const { includeShippingCharges = true, includeDiscounts = true, notes } = req.body;

    // Check if order exists
    const order = await Order.findById(orderId);

    if (!order) {
      console.log("> Order not found");
      return sendResponse(
        res,
        404,
        "Order not found",
        null,
        "Order not found"
      );
    }

    // Check if invoice already exists
    const existingInvoice = await Invoice.findOne({ orderId });

    if (existingInvoice) {
      console.log("> Invoice already exists for this order");
      return sendResponse(
        res,
        400,
        "Invoice already exists",
        null,
        "An invoice has already been generated for this order"
      );
    }

    // Check if order is in a valid status for invoice generation
    if (!["confirmed", "processing", "shipped", "delivered"].includes(order.status)) {
      console.log("> Order not in valid status for invoice generation");
      return sendResponse(
        res,
        400,
        "Order not eligible for invoice generation",
        null,
        createError(
          "INVALID_STATUS",
          "Invoice can only be generated for confirmed, processing, shipped, or delivered orders"
        )
      );
    }

    // Get order items
    const orderItems = await OrderItem.find({ orderId });

    // Calculate invoice amounts
    let subtotal = 0;
    let totalTax = 0;

    for (const item of orderItems) {
      subtotal += item.lineTotal;
      totalTax += item.lineTax;
    }

    let total = subtotal + totalTax;

    // Add shipping charges if included
    if (includeShippingCharges && order.shippingCharges) {
      total += order.shippingCharges;
    }

    // Subtract discounts if included
    let totalDiscount = 0;
    if (includeDiscounts && order.totalDiscount) {
      totalDiscount = order.totalDiscount;
      total -= totalDiscount;
    }

    // Generate invoice number (format: INV-YYYYMMDD-XXXXX)
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const count = await Invoice.countDocuments();
    const invoiceNumber = `INV-${dateStr}-${String(count + 1).padStart(5, "0")}`;

    // Create invoice
    const invoice = await Invoice.create({
      invoiceNumber,
      orderId,
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
        lineDiscount: includeDiscounts ? item.lineDiscount : 0,
        lineTax: item.lineTax,
        lineTotal: item.lineTotal
      })),
      subtotal,
      totalTax,
      totalDiscount: includeDiscounts ? totalDiscount : 0,
      shippingCharges: includeShippingCharges ? order.shippingCharges : 0,
      total,
      notes: notes || null,
      generatedBy: req.user._id.toString()
    });

    console.log("> Invoice generated successfully:", invoice.invoiceNumber);

    // Send invoice email
    try {
      await sendInvoiceEmailNotification(invoice, order, orderItems);
    } catch (emailError) {
      console.error("> Failed to send invoice email:", emailError);
    }

    return sendResponse(
      res,
      201,
      "Invoice generated successfully",
      { invoice },
      null
    );
  } catch (error) {
    console.error("> Error generating invoice:", error);
    return sendResponse(
      res,
      500,
      "Failed to generate invoice",
      null,
      createError("SERVER_ERROR", error.message)
    );
  }
};

/**
 * Get all invoices with filters
 * @route GET /api/admin/invoices
 */
export const getAllInvoices = async (req, res) => {
  try {
    console.log("> Getting all invoices");

    const {
      page = 1,
      limit = 20,
      userId,
      orderId,
      startDate,
      endDate,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    // Build filter
    const filter = {};

    if (userId) filter.userId = userId;
    if (orderId) filter.orderId = orderId;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Count total documents
    const total = await Invoice.countDocuments(filter);

    // Get paginated invoices
    const invoices = await Invoice.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    console.log(`> Retrieved ${invoices.length} invoices`);

    return sendResponse(
      res,
      200,
      "Invoices retrieved successfully",
      {
        invoices,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      },
      null
    );
  } catch (error) {
    console.error("> Error getting all invoices:", error);
    return sendResponse(
      res,
      500,
      "Failed to get invoices",
      null,
      createError("SERVER_ERROR", error.message)
    );
  }
};

/**
 * Get invoice by ID (admin)
 * @route GET /api/admin/invoices/:invoiceId
 */
export const getInvoiceByIdAdmin = async (req, res) => {
  try {
    console.log("> Admin getting invoice by ID:", req.params.invoiceId);

    const { invoiceId } = req.params;

    // Find invoice
    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      console.log("> Invoice not found");
      return sendResponse(
        res,
        404,
        "Invoice not found",
        null,
        "Invoice not found"
      );
    }

    // Get related data
    const order = await Order.findById(invoice.orderId);
    const payment = await Payment.findOne({ orderId: invoice.orderId });

    console.log("> Invoice retrieved successfully");
    return sendResponse(
      res,
      200,
      "Invoice retrieved successfully",
      {
        invoice,
        order,
        payment
      },
      null
    );
  } catch (error) {
    console.error("> Error getting invoice:", error);
    return sendResponse(
      res,
      500,
      "Failed to get invoice",
      null,
      createError("SERVER_ERROR", error.message)
    );
  }
};

/**
 * Send invoice email
 * @route POST /api/admin/invoices/:invoiceId/send-email
 */
export const sendInvoiceEmail = async (req, res) => {
  try {
    console.log("> Sending invoice email:", req.params.invoiceId);

    const { invoiceId } = req.params;
    const { recipientEmail, subject, message } = req.body;

    // Find invoice
    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      console.log("> Invoice not found");
      return sendResponse(
        res,
        404,
        "Invoice not found",
        null,
        "Invoice not found"
      );
    }

    // Get order details
    const order = await Order.findById(invoice.orderId);
    const orderItems = await OrderItem.find({ orderId: invoice.orderId });

    // Generate PDF
    const pdfBuffer = await generateInvoicePdf(invoice, order, orderItems);

    // Determine recipient email
    const toEmail = recipientEmail || invoice.customerEmail;

    // Send email with PDF attachment
    const emailData = {
      to: toEmail,
      subject: subject || `Invoice ${invoice.invoiceNumber} - Cleanse Ayurveda`,
      template: "invoice",
      context: {
        customerName: invoice.customerName,
        invoiceNumber: invoice.invoiceNumber,
        orderNumber: order.orderNumber,
        total: invoice.total,
        message: message || ""
      },
      attachments: [
        {
          filename: `invoice-${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf"
        }
      ]
    };

    await sendInvoiceEmailService(emailData);

    // Update invoice
    invoice.emailSentAt = new Date();
    invoice.emailSentTo = toEmail;
    await invoice.save();

    console.log("> Invoice email sent successfully");
    return sendResponse(
      res,
      200,
      "Invoice email sent successfully",
      { invoice },
      null
    );
  } catch (error) {
    console.error("> Error sending invoice email:", error);
    return sendResponse(
      res,
      500,
      "Failed to send invoice email",
      null,
      createError("SERVER_ERROR", error.message)
    );
  }
};

/**
 * Regenerate invoice
 * @route POST /api/admin/invoices/:invoiceId/regenerate
 */
export const regenerateInvoice = async (req, res) => {
  try {
    console.log("> Regenerating invoice:", req.params.invoiceId);

    const { invoiceId } = req.params;
    const { reason, notes } = req.body;

    // Find invoice
    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      console.log("> Invoice not found");
      return sendResponse(
        res,
        404,
        "Invoice not found",
        null,
        "Invoice not found"
      );
    }

    // Get order and items
    const order = await Order.findById(invoice.orderId);
    const orderItems = await OrderItem.find({ orderId: invoice.orderId });

    // Recalculate amounts
    let subtotal = 0;
    let totalTax = 0;

    for (const item of orderItems) {
      subtotal += item.lineTotal;
      totalTax += item.lineTax;
    }

    let total = subtotal + totalTax + (order.shippingCharges || 0) - (order.totalDiscount || 0);

    // Update invoice
    invoice.items = orderItems.map((item) => ({
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
    }));
    invoice.subtotal = subtotal;
    invoice.totalTax = totalTax;
    invoice.totalDiscount = order.totalDiscount || 0;
    invoice.shippingCharges = order.shippingCharges || 0;
    invoice.total = total;
    invoice.regenerationReason = reason;
    invoice.notes = notes || invoice.notes;
    invoice.regeneratedBy = req.user._id.toString();
    invoice.regeneratedAt = new Date();

    await invoice.save();

    console.log("> Invoice regenerated successfully");
    return sendResponse(
      res,
      200,
      "Invoice regenerated successfully",
      { invoice },
      null
    );
  } catch (error) {
    console.error("> Error regenerating invoice:", error);
    return sendResponse(
      res,
      500,
      "Failed to regenerate invoice",
      null,
      createError("SERVER_ERROR", error.message)
    );
  }
};

/**
 * Get invoice statistics
 * @route GET /api/admin/invoices/stats
 */
export const getInvoiceStats = async (req, res) => {
  try {
    console.log("> Getting invoice statistics");

    const { startDate, endDate, groupBy = "day" } = req.query;

    // Build match filter
    const matchFilter = {};

    if (startDate || endDate) {
      matchFilter.createdAt = {};
      if (startDate) matchFilter.createdAt.$gte = new Date(startDate);
      if (endDate) matchFilter.createdAt.$lte = new Date(endDate);
    }

    // Determine date grouping format
    let dateFormat;
    switch (groupBy) {
      case "day":
        dateFormat = "%Y-%m-%d";
        break;
      case "week":
        dateFormat = "%Y-W%V";
        break;
      case "month":
        dateFormat = "%Y-%m";
        break;
      case "year":
        dateFormat = "%Y";
        break;
      default:
        dateFormat = "%Y-%m-%d";
    }

    // Get aggregate statistics
    const stats = await Invoice.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
          count: { $sum: 1 },
          totalAmount: { $sum: "$total" },
          avgAmount: { $avg: "$total" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get overall statistics
    const overall = await Invoice.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalRevenue: { $sum: "$total" },
          avgInvoiceAmount: { $avg: "$total" },
          minInvoiceAmount: { $min: "$total" },
          maxInvoiceAmount: { $max: "$total" }
        }
      }
    ]);

    console.log("> Invoice statistics retrieved successfully");

    return sendResponse(
      res,
      200,
      "Invoice statistics retrieved successfully",
      {
        stats,
        overall: overall[0] || {
          totalInvoices: 0,
          totalRevenue: 0,
          avgInvoiceAmount: 0,
          minInvoiceAmount: 0,
          maxInvoiceAmount: 0
        }
      },
      null
    );
  } catch (error) {
    console.error("> Error getting invoice statistics:", error);
    return sendResponse(
      res,
      500,
      "Failed to get invoice statistics",
      null,
      createError("SERVER_ERROR", error.message)
    );
  }
};

/**
 * Helper Functions
 */

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

      // Company details (left side)
      doc.fontSize(12).text("Cleanse Ayurveda", { continued: false });
      doc.fontSize(10).text("Address Line 1");
      doc.text("Address Line 2");
      doc.text("Phone: +91-XXXXXXXXXX");
      doc.text("Email: support@cleanseayurveda.com");
      doc.moveDown();

      // Invoice details (right side)
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

      // Table header
      doc.fontSize(10).font("Helvetica-Bold");
      doc.text("Item", itemCodeX, tableTop);
      doc.text("Description", descriptionX, tableTop);
      doc.text("Qty", quantityX, tableTop);
      doc.text("Price", priceX, tableTop);
      doc.text("Amount", amountX, tableTop);

      // Horizontal line
      doc
        .moveTo(itemCodeX, tableTop + 15)
        .lineTo(520, tableTop + 15)
        .stroke();

      // Table rows
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

      // Horizontal line
      doc
        .moveTo(itemCodeX, yPosition)
        .lineTo(520, yPosition)
        .stroke();

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

      // Grand total
      doc.font("Helvetica-Bold").fontSize(12);
      doc.text("Total:", priceX, yPosition);
      doc.text(`₹${invoice.total.toFixed(2)}`, amountX, yPosition);

      // Notes
      if (invoice.notes) {
        doc.moveDown(2);
        doc.fontSize(10).font("Helvetica");
        doc.text("Notes:", { underline: true });
        doc.text(invoice.notes);
      }

      // Footer
      doc.moveDown(2);
      doc.fontSize(8).text("Thank you for your business!", { align: "center" });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Send invoice email notification
 */
async function sendInvoiceEmailNotification(invoice, order, orderItems) {
  const pdfBuffer = await generateInvoicePdf(invoice, order, orderItems);

  const emailData = {
    to: invoice.customerEmail,
    subject: `Your Invoice ${invoice.invoiceNumber} - Cleanse Ayurveda`,
    template: "invoice",
    context: {
      customerName: invoice.customerName,
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

  await sendInvoiceEmailService(emailData);

  invoice.emailSentAt = new Date();
  invoice.emailSentTo = invoice.customerEmail;
  await invoice.save();
}

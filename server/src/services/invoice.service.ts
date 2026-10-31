import { env } from '../config/env';
import { IOrderDocument } from '../models/Order';
import { User } from '../models/User';

export interface IInvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  orderNumber: string;
  orderDate: string;
  store: {
    name: string;
    phone: string;
    email: string;
    address: string;
  };
  customer: {
    name: string;
    phone: string;
    deliveryAddress: {
      recipientName: string;
      recipientPhone: string;
      streetAddress: string;
      landmark?: string;
      city: string;
      state: string;
      postalCode: string;
    };
  };
  items: Array<{
    name: string;
    unit: string;
    quantity: number;
    unitPriceRupees: string;
    totalPriceRupees: string;
  }>;
  pricing: {
    subtotalRupees: string;
    discountRupees: string;
    deliveryFeeRupees: string;
    packagingFeeRupees: string;
    totalAmountRupees: string;
  };
  payment: {
    method: string;
    status: string;
  };
}

export class InvoiceService {
  /**
   * Generate structured invoice data for an order
   */
  public static async generateInvoiceData(order: IOrderDocument): Promise<IInvoiceData> {
    const customer = await User.findById(order.user);

    // If order has no invoiceNumber yet, generate one
    if (!order.invoiceNumber) {
      const now = new Date();
      const monthStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const suffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      order.invoiceNumber = `INV-${monthStr}-${suffix}`;
      await order.save();
    }

    return {
      invoiceNumber: order.invoiceNumber,
      invoiceDate: order.createdAt.toISOString().split('T')[0],
      orderNumber: order.orderNumber,
      orderDate: order.createdAt.toISOString(),
      store: {
        name: env.STORE_NAME,
        phone: env.STORE_PHONE,
        email: env.STORE_EMAIL,
        address: env.STORE_ADDRESS,
      },
      customer: {
        name: customer?.name || order.deliveryAddress.recipientName,
        phone: customer?.phone || order.deliveryAddress.recipientPhone,
        deliveryAddress: {
          recipientName: order.deliveryAddress.recipientName,
          recipientPhone: order.deliveryAddress.recipientPhone,
          streetAddress: order.deliveryAddress.streetAddress,
          landmark: order.deliveryAddress.landmark,
          city: order.deliveryAddress.city,
          state: order.deliveryAddress.state,
          postalCode: order.deliveryAddress.postalCode,
        },
      },
      items: order.items.map((item) => ({
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        unitPriceRupees: (item.unitPrice / 100).toFixed(2),
        totalPriceRupees: (item.totalUnitPrice / 100).toFixed(2),
      })),
      pricing: {
        subtotalRupees: (order.totalAmount / 100).toFixed(2),
        discountRupees: (order.discountAmount / 100).toFixed(2),
        deliveryFeeRupees: (order.deliveryFee / 100).toFixed(2),
        packagingFeeRupees: (order.packagingFee / 100).toFixed(2),
        totalAmountRupees: (order.finalAmount / 100).toFixed(2),
      },
      payment: {
        method: order.paymentMethod,
        status: order.paymentStatus,
      },
    };
  }

  /**
   * Generate clean, printable HTML invoice
   */
  public static generateHtmlInvoice(data: IInvoiceData): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${data.invoiceNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #1e293b; background: #fff; }
    .invoice-card { max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 24px; }
    .brand h1 { margin: 0; color: #059669; font-size: 24px; font-weight: 800; }
    .brand p { margin: 4px 0 0; color: #64748b; font-size: 12px; }
    .meta { text-align: right; }
    .meta h2 { margin: 0; color: #0f172a; font-size: 18px; }
    .meta p { margin: 2px 0 0; color: #64748b; font-size: 12px; }
    .grid { display: flex; justify-content: space-between; margin-bottom: 24px; }
    .box { width: 48%; }
    .box h3 { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; color: #94a3b8; font-weight: 700; }
    .box p { margin: 2px 0; font-size: 13px; color: #334155; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f8fafc; text-align: left; padding: 10px 12px; font-size: 12px; text-transform: uppercase; color: #475569; border-bottom: 1px solid #cbd5e1; }
    td { padding: 12px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
    .text-right { text-align: right; }
    .summary-table { width: 300px; margin-left: auto; border-collapse: collapse; }
    .summary-table td { padding: 6px 12px; font-size: 13px; border: none; }
    .total-row { border-top: 2px solid #059669 !important; font-weight: 800; font-size: 15px !important; color: #059669; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
    @media print {
      body { padding: 0; }
      .invoice-card { border: none; padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header">
      <div class="brand">
        <h1>${data.store.name}</h1>
        <p>${data.store.address}</p>
        <p>Phone: ${data.store.phone} | Email: ${data.store.email}</p>
      </div>
      <div class="meta">
        <h2>TAX INVOICE</h2>
        <p><strong>Invoice #:</strong> ${data.invoiceNumber}</p>
        <p><strong>Order #:</strong> ${data.orderNumber}</p>
        <p><strong>Date:</strong> ${data.invoiceDate}</p>
      </div>
    </div>

    <div class="grid">
      <div class="box">
        <h3>Billed / Delivered To</h3>
        <p><strong>${data.customer.deliveryAddress.recipientName}</strong></p>
        <p>${data.customer.deliveryAddress.streetAddress}</p>
        ${data.customer.deliveryAddress.landmark ? `<p>Landmark: ${data.customer.deliveryAddress.landmark}</p>` : ''}
        <p>${data.customer.deliveryAddress.city}, ${data.customer.deliveryAddress.state} - ${data.customer.deliveryAddress.postalCode}</p>
        <p>Phone: ${data.customer.deliveryAddress.recipientPhone}</p>
      </div>
      <div class="box" style="text-align: right;">
        <h3>Payment Information</h3>
        <p><strong>Method:</strong> ${data.payment.method}</p>
        <p><strong>Payment Status:</strong> ${data.payment.status}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Item Description</th>
          <th>Pack / Unit</th>
          <th class="text-right">Unit Price</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Total (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${data.items
          .map(
            (item, index) => `<tr>
          <td>${index + 1}</td>
          <td><strong>${item.name}</strong></td>
          <td>${item.unit}</td>
          <td class="text-right">₹${item.unitPriceRupees}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">₹${item.totalPriceRupees}</td>
        </tr>`
          )
          .join('')}
      </tbody>
    </table>

    <table class="summary-table">
      <tr>
        <td>Items Subtotal:</td>
        <td class="text-right">₹${data.pricing.subtotalRupees}</td>
      </tr>
      ${
        Number(data.pricing.discountRupees) > 0
          ? `<tr>
        <td style="color: #059669;">Promo Discount:</td>
        <td class="text-right" style="color: #059669;">-₹${data.pricing.discountRupees}</td>
      </tr>`
          : ''
      }
      <tr>
        <td>Delivery Fee:</td>
        <td class="text-right">${Number(data.pricing.deliveryFeeRupees) === 0 ? 'FREE' : `₹${data.pricing.deliveryFeeRupees}`}</td>
      </tr>
      <tr>
        <td>Packaging Charge:</td>
        <td class="text-right">₹${data.pricing.packagingFeeRupees}</td>
      </tr>
      <tr class="total-row">
        <td>Total Payable:</td>
        <td class="text-right">₹${data.pricing.totalAmountRupees}</td>
      </tr>
    </table>

    <div class="footer">
      <p>Thank you for shopping with ${data.store.name}!</p>
      <p>This is a computer generated invoice and does not require a physical signature.</p>
    </div>
  </div>
</body>
</html>`;
  }
}

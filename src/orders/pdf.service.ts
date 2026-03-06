import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

@Injectable()
export class PdfService {
  /**
   * BUY-03: Generate a PDF invoice/receipt for an order.
   * Returns a Buffer containing the PDF bytes.
   */
  async generateOrderPdf(order: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Header ──
      doc
        .fontSize(22)
        .fillColor('#2d6a4f')
        .text('DeOrigen', 50, 50)
        .fontSize(10)
        .fillColor('#666')
        .text('Conectamos el campo colombiano con el mundo', 50, 76)
        .moveDown(2);

      // ── Title ──
      doc
        .fontSize(16)
        .fillColor('#111')
        .text('Comprobante de pedido', { align: 'center' })
        .moveDown(0.5);

      doc
        .fontSize(10)
        .fillColor('#444')
        .text(`Número de pedido: ${order.orderNumber}`, { align: 'center' })
        .text(`Fecha: ${new Date(order.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' })
        .moveDown(1.5);

      // ── Divider ──
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke().moveDown(1);

      // ── Buyer info ──
      if (order.user?.name || order.guestName) {
        doc
          .fontSize(11)
          .fillColor('#111')
          .text('Comprador:', { continued: true })
          .fillColor('#444')
          .text(` ${order.user?.name ?? order.guestName ?? '—'}`);
        const email = order.user?.email ?? order.guestEmail;
        if (email) {
          doc.text(`Correo: ${email}`);
        }
        doc.moveDown(0.5);
      }

      if (order.shippingAddress) {
        doc
          .fontSize(10)
          .fillColor('#444')
          .text(`Dirección de envío: ${order.shippingAddress}, ${order.shippingCity ?? ''} ${order.shippingCountry ?? ''}`)
          .moveDown(1);
      }

      // ── Items table header ──
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke().moveDown(0.5);

      doc
        .fontSize(10)
        .fillColor('#fff')
        .rect(50, doc.y, 495, 18)
        .fill('#2d6a4f');

      const tableTop = doc.y;
      doc
        .fillColor('#fff')
        .fontSize(10)
        .text('Producto', 55, tableTop + 3)
        .text('Cant.', 350, tableTop + 3)
        .text('Precio u.', 400, tableTop + 3)
        .text('Total', 475, tableTop + 3)
        .moveDown(1.2);

      // ── Items ──
      let rowY = doc.y;
      let isAlt = false;
      for (const item of order.items ?? []) {
        if (isAlt) {
          doc.rect(50, rowY - 2, 495, 18).fill('#f6f6f6');
        }
        doc
          .fillColor('#111')
          .fontSize(9)
          .text(item.productName ?? '—', 55, rowY, { width: 280 })
          .text(String(item.quantity), 355, rowY)
          .text(`${Number(item.unitPrice).toFixed(2)} ${order.currency}`, 395, rowY)
          .text(`${Number(item.total).toFixed(2)} ${order.currency}`, 465, rowY);
        rowY += 20;
        isAlt = !isAlt;
      }

      doc.y = rowY + 5;
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke().moveDown(1);

      // ── Totals ──
      const totalsX = 380;
      doc.fontSize(10).fillColor('#444');

      const subtotal = Number(order.subtotal ?? 0);
      const tax = Number(order.tax ?? 0);
      const shippingCost = Number(order.shippingCost ?? 0);
      const supportAmount = Number(order.supportAmount ?? 0);
      const total = Number(order.total ?? 0);
      const cur = order.currency ?? 'EUR';

      doc.text(`Subtotal:`, totalsX, doc.y, { continued: true, width: 150 })
         .text(`${subtotal.toFixed(2)} ${cur}`, { align: 'right', width: 100 });

      if (shippingCost > 0) {
        doc.text(`Envío:`, totalsX, doc.y, { continued: true, width: 150 })
           .text(`${shippingCost.toFixed(2)} ${cur}`, { align: 'right', width: 100 });
      }

      if (tax > 0) {
        doc.text(`IVA:`, totalsX, doc.y, { continued: true, width: 150 })
           .text(`${tax.toFixed(2)} ${cur}`, { align: 'right', width: 100 });
      }

      if (supportAmount > 0) {
        // BUY-01: support contribution shown separately and marked as voluntary
        doc.fillColor('#2d6a4f')
           .text(`Apoyo voluntario:`, totalsX, doc.y, { continued: true, width: 150 })
           .text(`${supportAmount.toFixed(2)} ${cur}`, { align: 'right', width: 100 })
           .fillColor('#444');
      }

      doc.moveDown(0.5);
      doc
        .fontSize(12)
        .fillColor('#111')
        .text(`TOTAL:`, totalsX, doc.y, { continued: true, width: 150 })
        .text(`${total.toFixed(2)} ${cur}`, { align: 'right', width: 100, underline: true });

      // ── Tracking ──
      if (order.trackingNumber) {
        doc
          .moveDown(1.5)
          .fontSize(10)
          .fillColor('#555')
          .text(`Número de rastreo: ${order.trackingNumber}`);
      }

      // ── Footer ──
      doc
        .moveDown(3)
        .fontSize(8)
        .fillColor('#999')
        .text('Este documento es un comprobante de tu pedido en DeOrigen.', { align: 'center' })
        .text('deorigencampesino.com', { align: 'center' });

      doc.end();
    });
  }
}

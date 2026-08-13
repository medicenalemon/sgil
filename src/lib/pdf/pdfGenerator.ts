/**
 * SGIL v2.0 — PDF Generator
 * 
 * Creates PDF documents for comprobantes (ventas), remitos (compras),
 * and notas de crédito/comprobantes de devolución.
 * 
 * Uses jspdf + jspdf-autotable for table rendering.
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface PdfColumn {
  header: string
  dataKey: string
}

interface PdfInfoRow {
  label: string
  value: string
}

interface PdfConfig {
  title: string
  subtitle?: string
  infoLeft: PdfInfoRow[]
  infoRight: PdfInfoRow[]
  columns: PdfColumn[]
  rows: Record<string, string | number>[]
  totalLabel: string
  totalValue: string
  totalColor?: [number, number, number]
  warningText?: string
  fileName: string
}

export function generatePdf(config: PdfConfig) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()

  // ---- Header ----
  doc.setFillColor(124, 58, 237) // primary-600
  doc.rect(0, 0, pageWidth, 35, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('SGIL - Sistema de Gestión Integral de Librerías', 14, 16)
  
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(config.title, 14, 26)

  // ---- Info section ----
  let y = 45

  if (config.subtitle) {
    doc.setTextColor(100, 100, 100)
    doc.setFontSize(9)
    doc.text(config.subtitle, 14, y)
    y += 8
  }

  // Two-column info
  doc.setFontSize(9)
  const colWidth = (pageWidth - 28) / 2

  config.infoLeft.forEach((row, i) => {
    doc.setTextColor(100, 100, 100)
    doc.setFont('helvetica', 'bold')
    doc.text(row.label, 14, y + i * 6)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 30, 30)
    doc.text(row.value, 14 + 40, y + i * 6)
  })

  config.infoRight.forEach((row, i) => {
    doc.setTextColor(100, 100, 100)
    doc.setFont('helvetica', 'bold')
    doc.text(row.label, 14 + colWidth, y + i * 6)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 30, 30)
    doc.text(row.value, 14 + colWidth + 40, y + i * 6)
  })

  y += Math.max(config.infoLeft.length, config.infoRight.length) * 6 + 8

  // ---- Table ----
  autoTable(doc, {
    startY: y,
    head: [config.columns.map((c) => c.header)],
    body: config.rows.map((row) => config.columns.map((c) => String(row[c.dataKey] ?? ''))),
    headStyles: {
      fillColor: [124, 58, 237],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    margin: { left: 14, right: 14 },
    theme: 'grid',
  })

  // Get final Y after table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY ?? y + 40

  // ---- Total ----
  const totalY = finalY + 10
  const [r, g, b] = config.totalColor ?? [124, 58, 237]
  
  doc.setFillColor(r, g, b)
  doc.roundedRect(pageWidth - 14 - 80, totalY - 5, 80, 12, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(`${config.totalLabel}: ${config.totalValue}`, pageWidth - 14 - 75, totalY + 3)

  // ---- Warning box (for devoluciones) ----
  if (config.warningText) {
    const warnY = totalY + 20
    doc.setFillColor(254, 249, 195) // yellow-100
    doc.setDrawColor(234, 179, 8) // yellow-500
    doc.roundedRect(14, warnY, pageWidth - 28, 24, 2, 2, 'FD')
    doc.setTextColor(146, 64, 14) // amber-800
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('⚠ IMPORTANTE', 18, warnY + 6)
    doc.setFont('helvetica', 'normal')
    
    const lines = doc.splitTextToSize(config.warningText, pageWidth - 36)
    doc.text(lines, 18, warnY + 12)
  }

  // ---- Footer ----
  const footerY = doc.internal.pageSize.getHeight() - 10
  doc.setTextColor(150, 150, 150)
  doc.setFontSize(7)
  doc.text(
    `Generado por SGIL v2.0 — ${new Date().toLocaleString('es-AR')}`,
    14,
    footerY
  )
  doc.text(
    'Este documento es un comprobante válido del sistema.',
    pageWidth - 14,
    footerY,
    { align: 'right' }
  )

  // ---- Save & Open ----
  doc.save(config.fileName)
  window.open(doc.output('bloburl'), '_blank')
}

/** Format currency ARS */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(value)
}

/** Format date to local string */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/** Format datetime to local string */
export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

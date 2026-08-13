import jsPDF from 'jspdf'
import { formatUGX, formatDate } from './format'

// Generates a printable payment-proof receipt for a verified payment.
// Works entirely client-side — no server round-trip needed once the
// payment record and member record are already loaded.
export function generateReceiptPDF({ member, payment }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const marginX = 56

  // Header band
  doc.setFillColor(62, 26, 91) // forest purple (brand primary)
  doc.rect(0, 0, pageWidth, 90, 'F')
  doc.setTextColor(246, 243, 249) // canvas
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Uganda Scouts Association', marginX, 40)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text('Official Payment Receipt', marginX, 60)

  let y = 130
  doc.setTextColor(23, 19, 27) // ink

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('Payment Confirmation', marginX, y)
  y += 10
  doc.setDrawColor(200, 16, 46) // ember red (brand accent)
  doc.setLineWidth(1.2)
  doc.line(marginX, y, pageWidth - marginX, y)
  y += 28

  const rows = [
    ['Member Name', member?.full_name || '—'],
    ['Member ID', member?.member_code || '—'],
    ['District', member?.district || '—'],
    ['Membership Type', member?.membership_type || '—'],
    ['Payment Purpose', payment?.purpose || '—'],
    ['Amount Paid', formatUGX(payment?.amount)],
    ['Payment Method', payment?.payment_method || '—'],
    ['Reference Number', payment?.reference_number || '—'],
    ['Payment Date', formatDate(payment?.payment_date)],
    ['Verification Status', (payment?.status || 'pending').toUpperCase()],
    ['Verified On', payment?.verified_at ? formatDate(payment.verified_at) : 'Not yet verified'],
    ['Record Year', String(payment?.year || '—')],
  ]

  doc.setFontSize(11)
  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold')
    doc.text(label + ':', marginX, y)
    doc.setFont('helvetica', 'normal')
    doc.text(String(value), marginX + 170, y)
    y += 24
  })

  y += 10
  doc.setDrawColor(200, 16, 46)
  doc.line(marginX, y, pageWidth - marginX, y)
  y += 24

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9.5)
  doc.setTextColor(90, 82, 95)
  const note = payment?.status === 'verified'
    ? 'This receipt confirms a payment that has been verified by an Association admin against the official bank/mobile money statement.'
    : 'This payment has not yet been verified by an Association admin. This document is not proof of a completed transaction until verified.'
  const wrapped = doc.splitTextToSize(note, pageWidth - marginX * 2)
  doc.text(wrapped, marginX, y)

  doc.save(`Receipt_${member?.member_code || 'member'}_${payment?.reference_number || ''}.pdf`)
}

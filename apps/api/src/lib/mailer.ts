import nodemailer from 'nodemailer'

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5173'

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (transporter) return transporter
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_APP_PASSWORD

  if (!host || !user || !pass) return null

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  return transporter
}

async function sendMail(to: string, subject: string, html: string) {
  const mailer = getTransporter()
  if (!mailer) {
    console.log(`[mail skipped] ${subject} -> ${to}`)
    return
  }

  await mailer.sendMail({
    from: process.env.MAIL_FROM || 'no-reply@taxos.local',
    to,
    subject,
    html,
  })
}

export async function sendFounderApplicationReceivedEmail(to: string, name: string) {
  await sendMail(to, 'Verify your founder email', `<p>Hi ${name},</p><p>Your workspace has been created. Verify your email to continue onboarding before the admin reviews your incorporation details.</p>`) 
}

export async function sendFounderApprovedEmail(to: string) {
  const url = `${APP_BASE_URL}/login`
  await sendMail(to, 'Founder application approved', `<p>Your founder application was approved.</p><p>You can now sign in to TaxOS: <a href="${url}">${url}</a></p>`)
}

export async function sendFounderRejectedEmail(to: string, reason?: string) {
  await sendMail(to, 'Founder application update', `<p>Your founder application was not approved.</p><p>${reason || 'Please contact support for more details.'}</p>`)
}

export async function sendInviteEmail(to: string, token: string, organizationName: string) {
  const url = `${APP_BASE_URL}/accept-invite?token=${encodeURIComponent(token)}`
  await sendMail(to, `Invitation to join ${organizationName}`, `<p>You were invited to join ${organizationName} on TaxOS.</p><p>Accept the invite here: <a href="${url}">${url}</a></p>`)
}

export async function sendVerificationEmail(to: string, token: string) {
  const url = `${APP_BASE_URL}/verify-email?token=${encodeURIComponent(token)}`
  await sendMail(to, 'Verify your TaxOS account', `<p>Verify your email here: <a href="${url}">${url}</a></p>`)
}

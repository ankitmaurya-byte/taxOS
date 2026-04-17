import { Resend } from 'resend'

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5173'
const FROM = process.env.MAIL_FROM || 'TaxOS <onboarding@resend.dev>'

let client: Resend | null = null

function getClient(): Resend | null {
  if (client) return client
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  client = new Resend(apiKey)
  return client
}

async function sendMail(to: string, subject: string, html: string) {
  const resend = getClient()
  if (!resend) {
    console.log(`[mail skipped — RESEND_API_KEY missing] ${subject} -> ${to}`)
    return
  }

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [to],
    subject,
    html,
  })

  if (error) {
    console.error(`[resend] send failed:`, error)
    return
  }

  console.log(`[resend] sent ${data?.id ?? '?'} (${subject}) -> ${to}`)
}

export async function sendFounderApplicationReceivedEmail(to: string, name: string) {
  await sendMail(
    to,
    'Verify your founder email',
    `<p>Hi ${name},</p><p>Your workspace has been created. Verify your email to continue onboarding before the admin reviews your incorporation details.</p>`,
  )
}

export async function sendFounderApprovedEmail(to: string) {
  const url = `${APP_BASE_URL}/login`
  await sendMail(
    to,
    'Founder application approved',
    `<p>Your founder application was approved.</p><p>You can now sign in to TaxOS: <a href="${url}">${url}</a></p>`,
  )
}

export async function sendFounderRejectedEmail(to: string, reason?: string) {
  await sendMail(
    to,
    'Founder application update',
    `<p>Your founder application was not approved.</p><p>${reason || 'Please contact support for more details.'}</p>`,
  )
}

export async function sendInviteEmail(to: string, token: string, organizationName: string) {
  const url = `${APP_BASE_URL}/accept-invite?token=${encodeURIComponent(token)}`
  await sendMail(
    to,
    `Invitation to join ${organizationName}`,
    `<p>You were invited to join ${organizationName} on TaxOS.</p><p>Accept the invite here: <a href="${url}">${url}</a></p>`,
  )
}

export async function sendVerificationEmail(to: string, token: string) {
  const url = `${APP_BASE_URL}/verify-email?token=${encodeURIComponent(token)}`
  await sendMail(
    to,
    'Verify your TaxOS account',
    `<p>Verify your email here: <a href="${url}">${url}</a></p>`,
  )
}

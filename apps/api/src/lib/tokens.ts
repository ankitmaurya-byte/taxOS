import crypto from 'crypto'

export function generateAppToken() {
  return crypto.randomBytes(24).toString('hex')
}

export function getFutureIso(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
}

export function isExpired(iso: string) {
  return new Date(iso).getTime() < Date.now()
}

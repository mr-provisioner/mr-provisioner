import validator from 'validator'
import ipaddr from 'ipaddr.js'

export const validateMacField = mac =>
  validator.isEmpty(mac) || validator.isMACAddress(mac)

export const validateNonNull = f => typeof f !== 'undefined' && f !== null

export const validateLength = opts => field => validator.isLength(field, opts)

export const validateFile = f =>
  typeof FileList !== 'undefined' &&
  f instanceof FileList &&
  Array.from(f).length === 1

export const validateRepeat = fieldName => (field, otherFields) =>
  field === otherFields[fieldName]

export const validateAscii = f =>
  typeof f === 'string' && /^[\x00-\x7F]*$/.test(f)

export const validateCIDR = ipVersion => f => {
  try {
    const net =
      ipVersion === 6 ? ipaddr.IPv6.parseCIDR(f) : ipaddr.IPv4.parseCIDR(f)
    return true
  } catch (e) {
    return false
  }
}

export const validateIP = ipVersion => f =>
  ipVersion === 6 ? ipaddr.IPv6.isValid(f) : ipaddr.IPv4.isValid(f)

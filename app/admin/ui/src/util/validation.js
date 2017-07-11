export const Validator = (val, message) => (field, otherFields) =>
  !val(field, otherFields) ? [false, message] : [true, null]

export const ExtendedValidator = (val, ...args) => (field, otherFields) => {
  const [ok, message] = val(field, otherFields, ...args)
  return [ok, !ok ? message : null]
}

export const ArrayValidator = (val, message) => (field, otherFields) =>
  field.reduce(
    (result, elem) => {
      const valResult = val(elem, otherFields)
      return [
        !(!result[0] || !valResult),
        Array.concat(result[1], valResult ? [null] : [message]),
      ]
    },
    [true, []]
  )

export function runValidationRules(rules, fields) {
  let errors = {}

  const keys = Object.keys(rules)
  const pass = keys.reduce((res, fieldName) => {
    // XXX: consider handling promises?
    const ok = rules[fieldName].reduce((ok, rule) => {
      if (!ok) return false

      const [valOk, message] = rule(fields[fieldName], fields)
      if (!valOk) errors[fieldName] = message

      return valOk
    }, true)
    return !(!ok || !res)
  }, true)

  return [pass, errors]
}

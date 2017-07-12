import * as constants from './constants'

let messageId = 0
const DEFAULT_TIMEOUT = 5000

export const showMessage = (type, message, timeout = DEFAULT_TIMEOUT) => ({
  type: constants.SHOW_MESSAGE,
  payload: { type, message, timeout, id: messageId++ },
})

export const showWarningMessage = (message, timeout = DEFAULT_TIMEOUT) =>
  showMessage('warning', message, timeout)
export const showErrorMessage = (message, timeout = DEFAULT_TIMEOUT) =>
  showMessage('critical', message, timeout)
export const showOkMessage = (message, timeout = DEFAULT_TIMEOUT) =>
  showMessage('ok', message, timeout)
export const showUnknownMessage = (message, timeout = DEFAULT_TIMEOUT) =>
  showMessage('unknown', message, timeout)

export const expireMessage = id => ({
  type: constants.EXPIRE_MESSAGE,
  payload: { id },
})

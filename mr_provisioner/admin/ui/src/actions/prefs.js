import * as constants from './constants'

export const setPref = (key, value) => ({
  type: constants.SET_PREF,
  payload: { key, value },
})

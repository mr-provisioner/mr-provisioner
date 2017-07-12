import * as constants from './constants'

export const loggedIn = (token, ownUser) => ({
  type: constants.LOGGED_IN,
  payload: {
    token,
    ownUser,
  },
})

export const logout = () => ({
  type: constants.LOGOUT,
  payload: {},
})

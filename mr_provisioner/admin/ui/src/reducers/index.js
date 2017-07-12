import { combineReducers } from 'redux-loop'
import { loop, Effects } from 'redux-loop'
import { expireMessage, showWarningMessage } from '../actions/message'
import * as constants from '../actions/constants'
import reject from 'ramda/src/reject'
import prepend from 'ramda/src/prepend'

const timeoutPromise = (timeout, id) =>
  new Promise((resolve, reject) => {
    setTimeout(() => resolve(expireMessage(id)), timeout)
  })

const logoutPromise = token =>
  new Promise((resolve, reject) => {
    const options = {
      credentials: 'same-origin',
    }

    fetch('/admin/logout2', {
      method: 'POST',
      body: JSON.stringify({
        token,
      }),
      ...options,
    })
      .then(response => {
        // (Almost) fire & forget - don't bother with checking for response.ok
        resolve(showWarningMessage('You have been logged out.'))
      })
      .catch(error => {
        resolve(showErrorMessage(`Error logging out: ${error.message}.`))
      })
  })

function messages(state = [], action) {
  switch (action.type) {
    case constants.SHOW_MESSAGE:
      return loop(
        prepend(action.payload, state),
        action.payload.timeout !== 0
          ? Effects.promise(
              timeoutPromise,
              action.payload.timeout,
              action.payload.id
            )
          : Effects.none()
      )

    case constants.EXPIRE_MESSAGE:
      return reject(m => m.id === action.payload.id, state)

    default:
      return state
  }
}

function auth(state = {}, action) {
  switch (action.type) {
    case constants.LOGGED_IN:
      return {
        ...state,
        loggedIn: true,
        token: action.payload.token,
        self: action.payload.ownUser,
      }

    case constants.LOGOUT:
      return loop(
        { ...state, loggedIn: false },
        state.loggedIn
          ? Effects.promise(logoutPromise, state.token)
          : Effects.none()
      )

    default:
      return state
  }
}

const defaultPrefs = {
  'machinesList.onlyMine': false,
}

function prefs(state = defaultPrefs, action) {
  switch (action.type) {
    case constants.SET_PREF:
      return {
        ...state,
        [action.payload.key]: action.payload.value,
      }

    default:
      return state
  }
}

export default combineReducers({
  messages,
  auth,
  prefs,
})

import { createStore, applyMiddleware, compose } from 'redux'
import { install as loopInstall } from 'redux-loop'
import persistState from 'redux-localstorage'
import DevTools from './devtools'
import { createLogger } from 'redux-logger'

const enhancer = compose(
  loopInstall(),
  persistState(['prefs', 'auth']),
  applyMiddleware(createLogger()),
  DevTools.instrument()
)

export default function configureStore(reducer, initialState) {
  return {
    ...createStore(reducer, initialState, enhancer),
  }
}

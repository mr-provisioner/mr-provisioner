import { createStore, applyMiddleware, compose } from 'redux'
import { install as loopInstall } from 'redux-loop'
import persistState from 'redux-localstorage'

const enhancer = compose(loopInstall(), persistState(['prefs', 'auth']))

export default function configureStore(reducer, initialState) {
  return {
    ...createStore(reducer, initialState, enhancer),
  }
}

import React from 'react'
import {
  createEagerFactory,
  setDisplayName,
  wrapDisplayName,
  withHandlers,
} from 'recompose'
import { capitalize } from '../util'

export const withLayerState = (
  layerStates,
  propName = 'layers'
) => BaseComponent => {
  const createCloseHandler = (name, varFn) => props => (...args) =>
    props.setLayerState(state => ({
      ...state,
      [`show${capitalize(name)}`]: false,
      [`${name}Var`]: null,
    }))

  const createOpenHandler = (name, varFn) => props => (...args) =>
    props.setLayerState(state => ({
      ...state,
      [`show${capitalize(name)}`]: true,
      [`${name}Var`]: varFn ? varFn(props, ...args) : null,
    }))

  const initialState = props =>
    layerStates.reduce((acc, item) => {
      const name = typeof item === 'string' ? item : item[0]
      return {
        ...acc,
        [`show${capitalize(name)}`]:
          typeof item === 'string'
            ? false
            : typeof item[2] === 'function' ? item[2](props) || false : false,
      }
    }, {})

  const handlers = layerStates.reduce((acc, item) => {
    const name = typeof item === 'string' ? item : item[0]
    const varFn = typeof item === 'string' ? null : item[1]

    return {
      ...acc,
      [`open${capitalize(name)}`]: createOpenHandler(name, varFn),
      [`close${capitalize(name)}`]: createCloseHandler(name, varFn),
    }
  }, {})

  const hoc = withHandlers(handlers)(BaseComponent)

  const factory = createEagerFactory(hoc)

  class WithLayerState extends React.Component {
    constructor(props) {
      super(props)
      this.state = initialState(props)
    }

    setLayerState = swapFn => this.setState((state, props) => swapFn(state))

    render() {
      return factory({
        ...this.props,
        setLayerState: this.setLayerState,
        [propName]: this.state,
      })
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    return setDisplayName(wrapDisplayName(BaseComponent, 'withLayerState'))(
      WithLayerState
    )
  }
  return WithLayerState
}

export default withLayerState

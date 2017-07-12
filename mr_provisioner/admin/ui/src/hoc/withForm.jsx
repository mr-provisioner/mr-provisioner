import React from 'react'
import {
  withHandlers,
  createEagerFactory,
  setDisplayName,
  wrapDisplayName,
  mapProps,
} from 'recompose'
import update from 'ramda/src/update'
import repeat from 'ramda/src/repeat'
import { runValidationRules } from '../util/validation'
import { capitalize } from '../util'

// XXX: support defaultValue as a function taking props, array index.
export const withForm = (fields, validationRules) => BaseComponent => {
  const initialFieldState = props =>
    Object.keys(fields).reduce((state, field) => {
      const defVal = fields[field].defaultValue
      const defValType = typeof defVal

      if (fields[field].array) {
        const defCount = fields[field].defaultCount || 1
        const initialValue =
          defValType === 'undefined'
            ? repeat(null, defCount)
            : defValType === 'function'
              ? defVal(props)
              : repeat(defVal, defCount)

        return { ...state, [field]: initialValue }
      } else {
        const initialValue =
          defValType === 'undefined'
            ? null
            : defValType === 'function' ? defVal(props) : defVal
        return { ...state, [field]: initialValue }
      }
    }, {})

  const createChangeHandler = (field, accessor) => props => ev => {
    const value = accessor(ev)
    props.setFields(state => ({
      ...state,
      [field]: value,
    }))
  }

  const createAryChangeHandler = (field, accessor) => props => index => ev => {
    const value = accessor(ev)
    props.setFields(state => ({
      ...state,
      [field]: update(index, value, state[field]),
    }))
  }

  const createAddHandler = (field, defaultVal) => props => () => {
    props.setFields(state => ({
      ...state,
      [field]: Array.concat(state[field], [defaultVal]),
    }))
  }

  const handlers = Object.keys(fields).reduce((acc, field) => {
    acc = {
      ...acc,
      [`onChange${capitalize(field)}`]: fields[field].array
        ? createAryChangeHandler(field, fields[field].accessor)
        : createChangeHandler(field, fields[field].accessor),
    }

    if (fields[field].array)
      acc[`onAdd${capitalize(field)}`] = createAddHandler(
        field,
        fields[field].defaultValue
      )

    return acc
  }, {})

  const hoc = withHandlers(handlers)(BaseComponent)

  const factory = createEagerFactory(hoc)

  class WithForm extends React.Component {
    constructor(props) {
      super(props)

      this.state = {
        fields: initialFieldState(props),
        fieldErrors: {},
      }

      if (typeof validationRules === 'function')
        this.validationRules = validationRules(props)
      else this.validationRules = validationRules
    }

    componentWillReceiveProps(nextProps) {
      if (typeof validationRules === 'function')
        this.validationRules = validationRules(nextProps)
    }

    setFields = swapFn =>
      this.setState(
        (state, props) => ({
          fields: swapFn(state.fields),
        }),
        this.validateFields
      )

    validateFields = () => {
      const [ok, errors] = runValidationRules(
        this.validationRules,
        this.state.fields
      )

      this.setState({ fieldErrors: errors })

      return ok
    }

    render() {
      return factory({
        ...this.props,
        fields: this.state.fields,
        fieldErrors: this.state.fieldErrors,
        setFields: this.setFields,
        validateFields: this.validateFields,
      })
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    return setDisplayName(wrapDisplayName(hoc, 'withForm'))(WithForm)
  }
  return WithForm
}

export default withForm

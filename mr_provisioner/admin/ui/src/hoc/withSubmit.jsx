import React from 'react'
import { createEagerFactory, setDisplayName, wrapDisplayName } from 'recompose'

export const withSubmit = (
  mutationName,
  mutationSuccessAction,
  mutationFailedAction,
  mapFieldsToVars = null
) => BaseComponent => {
  const factory = createEagerFactory(BaseComponent)

  class WithSubmit extends React.Component {
    state = {
      showFieldErrors: false,
    }

    handleSubmit = ev => {
      ev.preventDefault()

      if (this.props.validateFields()) {
        this.setState({ showFieldErrors: false })

        this.props
          [mutationName]({
            variables: mapFieldsToVars
              ? mapFieldsToVars(this.props.fields, this.props)
              : this.props.fields,
          })
          .then(result => this.props[mutationSuccessAction](result))
          .catch(error => this.props[mutationFailedAction](error))
      } else {
        this.setState({ showFieldErrors: true })
      }
    }

    render() {
      return factory({
        ...this.props,
        showFieldErrors: this.state.showFieldErrors,
        handleSubmit: this.handleSubmit,
      })
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    return setDisplayName(wrapDisplayName(BaseComponent, 'withSubmit'))(
      WithSubmit
    )
  }
  return WithSubmit
}

export default withSubmit

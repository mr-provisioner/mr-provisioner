import React from 'react'
import { connect } from 'react-redux'
import LoginForm from 'grommet/components/LoginForm'
import Box from 'grommet/components/Box'
import { bindActionCreators } from 'redux'
import { compose } from 'recompose'
import { withApollo, graphql } from 'react-apollo'
import * as messageActions from '../actions/message'
import * as authActions from '../actions/auth'
import { selfGQL } from '../graphql/self'

function Login({ onSubmit }) {
  return (
    <Box align="stretch" alignContent="center" justify="center" direction="row">
      <LoginForm onSubmit={onSubmit} rememberMe={false} usernameType="text" />
    </Box>
  )
}

class RequireLogin extends React.Component {
  clearCache = () => this.props.client.resetStore()

  componentDidMount() {
    if (!this.props.loggedIn) {
      this.clearCache()
    }
  }

  componentWillReceiveProps(nextProps) {
    if (!nextProps.loggedIn) {
      this.clearCache()
    }
  }

  refreshUser = () => {
    this.props.client
      .query({
        query: selfGQL,
        fetchPolicy: 'network-only',
      })
      .then(({ data }) => {
        this.props.actions.loggedIn(null /* token */, data.ownUser)
      })
      .catch(error => {
        this.props.actions.showErrorMessage(
          `Error getting permission information: ${error.message}.`
        )
      })
  }

  handleLoginSubmit = ({ username, password }) => {
    const options = {
      credentials: 'same-origin',
    }

    // XXX: consider moving this to the reducer. The only reason it currently
    //      lives here is so that a handle to the apollo client is readily
    //      available.
    fetch('/admin/login', {
      method: 'POST',
      body: JSON.stringify({
        username,
        password,
      }),
      ...options,
    })
      .then(response => {
        if (response.ok) {
          this.refreshUser()
        } else {
          response
            .json()
            .then(({ errors }) => {
              this.props.actions.showErrorMessage(
                `Login failed: ${errors.join(', ')}.`
              )
            })
            .catch(error => {
              this.props.actions.showErrorMessage(
                `Login failed: ${error.message}.`
              )
            })
        }
      })
      .catch(error => {
        this.props.actions.showErrorMessage(`Login failed: ${error.message}.`)
      })
  }

  render() {
    return this.props.loggedIn
      ? this.props.children
      : <Login onSubmit={this.handleLoginSubmit} />
  }
}

const mapStateToProps = (state, ownProps) => ({
  loggedIn: state.auth.loggedIn,
})

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ ...messageActions, ...authActions }, dispatch),
})

export default compose(
  withApollo,
  connect(mapStateToProps, mapDispatchToProps)
)(RequireLogin)

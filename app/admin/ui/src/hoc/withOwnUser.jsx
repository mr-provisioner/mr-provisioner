import { connect } from 'react-redux'

export const withOwnUser = (propName = 'ownUser') =>
  connect(state => ({
    [propName]: state.auth.self,
  }))

export default withOwnUser

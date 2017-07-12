import React from 'react'
import ConfirmDialog from '../confirmDialog'
import { graphql } from 'react-apollo'
import { withHandlers, compose, withProps } from 'recompose'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { deleteUserGQL, usersListGQL } from '../../graphql/user'
import * as messageActions from '../../actions/message'

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ ...messageActions }, dispatch),
})

const mutationHandlers = {
  mutationResponse: ({ actions, onDone = null }) => ({
    data: { deleteUser: { ok, user, errors } },
  }) => {
    if (ok && errors.length > 0)
      actions.showWarningMessage(
        `User ${user.username} deleted, but: ${errors.join(', ')}.`
      )
    else if (ok)
      actions.showOkMessage(`User ${user.username} deleted successfully.`)
    else actions.showErrorMessage(`Error deleting user: ${errors.join(', ')}.`)

    if (ok && onDone) onDone()
  },
  mutationFailed: ({ actions }) => error =>
    actions.showErrorMessage(error.message || error),
}

const mapFieldsToVars = (fields, props) => ({
  id: props.user.id,
})

export const UserDelete = compose(
  graphql(deleteUserGQL, {
    name: 'deleteUser',
    options: {
      refetchQueries: [
        {
          query: usersListGQL,
        },
      ],
    },
  }),
  connect(null, mapDispatchToProps),
  withHandlers(mutationHandlers)
)(
  ConfirmDialog(
    'deleteUser',
    'mutationResponse',
    'mutationFailed',
    mapFieldsToVars,
    props => ({
      title: 'Delete User',
      actionText: 'Delete',
      confirmation: 'I acknowledge that this action is irrevocable.',
      onCancel: props.onCancel,
      text: `Are you sure you want to delete user ${props.user.username}?`,
    })
  )
)

export default UserDelete

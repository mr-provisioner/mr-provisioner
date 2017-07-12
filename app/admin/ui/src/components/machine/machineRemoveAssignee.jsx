import React from 'react'
import ConfirmDialog from '../confirmDialog'
import { graphql } from 'react-apollo'
import { withHandlers, compose, withProps } from 'recompose'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import {
  machineNewGQL,
  deleteMachineAssigneeGQL,
  machineGQL,
} from '../../graphql/machine'
import * as messageActions from '../../actions/message'

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ ...messageActions }, dispatch),
})

const mutationHandlers = {
  mutationResponse: ({ actions, onDone = null }) => ({
    data: { deleteMachineAssignee: { ok, user, errors } },
  }) => {
    if (ok && errors.length > 0)
      actions.showWarningMessage(
        `Assignee ${user.username} removed, but: ${errors.join(', ')}.`
      )
    else if (ok)
      actions.showOkMessage(`Assignee ${user.username} removed successfully.`)
    else
      actions.showErrorMessage(`Error removing assignee: ${errors.join(', ')}.`)

    if (ok && onDone) onDone()
  },
  mutationFailed: ({ actions }) => error =>
    actions.showErrorMessage(error.message || error),
}

const mapFieldsToVars = (fields, props) => ({
  machineId: props.machine.id,
  id: props.assignee.id,
})

export const MachineRemoveAssignee = compose(
  graphql(deleteMachineAssigneeGQL, {
    name: 'deleteMachineAssignee',
    options: ({ match, machine }) => ({
      refetchQueries: [
        {
          query: machineGQL,
          variables: {
            id: machine.id,
          },
        },
      ],
    }),
  }),
  connect(null, mapDispatchToProps),
  withHandlers(mutationHandlers)
)(
  ConfirmDialog(
    'deleteMachineAssignee',
    'mutationResponse',
    'mutationFailed',
    mapFieldsToVars,
    props => ({
      title: 'Remove Assignee',
      actionText: 'Delete',
      onCancel: props.onCancel,
      text: `Are you sure you want to remove assignee ${props.assignee.user
        .username}?`,
    })
  )
)

export default MachineRemoveAssignee

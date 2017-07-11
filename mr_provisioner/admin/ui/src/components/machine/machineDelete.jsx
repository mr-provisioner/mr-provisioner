import React from 'react'
import ConfirmDialog from '../confirmDialog'
import { graphql } from 'react-apollo'
import { withHandlers, compose, withProps } from 'recompose'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { deleteMachineGQL, machinesListGQL } from '../../graphql/machine'
import * as messageActions from '../../actions/message'

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ ...messageActions }, dispatch),
})

const mutationHandlers = {
  mutationResponse: ({ actions, onDone = null }) => ({
    data: { deleteMachine: { ok, machine, errors } },
  }) => {
    if (ok && errors.length > 0)
      actions.showWarningMessage(
        `Machine ${machine.name} deleted, but: ${errors.join(', ')}.`
      )
    else if (ok)
      actions.showOkMessage(`Machine ${machine.name} deleted successfully.`)
    else
      actions.showErrorMessage(`Error deleting machine: ${errors.join(', ')}.`)

    if (ok && onDone) onDone()
  },
  mutationFailed: ({ actions }) => error =>
    actions.showErrorMessage(error.message || error),
}

const mapFieldsToVars = (fields, props) => ({
  id: props.machine.id,
})

export const MachineDelete = compose(
  graphql(deleteMachineGQL, {
    name: 'deleteMachine',
    options: {
      refetchQueries: [
        {
          query: machinesListGQL,
        },
      ],
    },
  }),
  connect(null, mapDispatchToProps),
  withHandlers(mutationHandlers)
)(
  ConfirmDialog(
    'deleteMachine',
    'mutationResponse',
    'mutationFailed',
    mapFieldsToVars,
    props => ({
      title: 'Delete Machine',
      actionText: 'Delete',
      confirmation: 'I acknowledge that this action is irrevocable.',
      onCancel: props.onCancel,
      text: `Are you sure you want to delete machine ${props.machine.name}?`,
    })
  )
)

export default MachineDelete

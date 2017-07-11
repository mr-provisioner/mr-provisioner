import React from 'react'
import ConfirmDialog from '../confirmDialog'
import { graphql } from 'react-apollo'
import { withHandlers, compose, withProps } from 'recompose'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import {
  machineNewGQL,
  deleteMachineInterfaceGQL,
  machineGQL,
} from '../../graphql/machine'
import * as messageActions from '../../actions/message'

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ ...messageActions }, dispatch),
})

const mutationHandlers = {
  mutationResponse: ({ actions, onDone = null }) => ({
    data: { deleteMachineInterface: { ok, intf, errors } },
  }) => {
    if (ok && errors.length > 0)
      actions.showWarningMessage(
        `Interface ${intf.mac} removed, but: ${errors.join(', ')}.`
      )
    else if (ok)
      actions.showOkMessage(`Interface ${intf.mac} removed successfully.`)
    else
      actions.showErrorMessage(
        `Error removing interface: ${errors.join(', ')}.`
      )

    if (ok && onDone) onDone()
  },
  mutationFailed: ({ actions }) => error =>
    actions.showErrorMessage(error.message || error),
}

const mapFieldsToVars = (fields, props) => ({
  machineId: props.machine.id,
  id: props.intf.id,
})

export const MachineRemoveInterface = compose(
  graphql(deleteMachineInterfaceGQL, {
    name: 'deleteMachineInterface',
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
    'deleteMachineInterface',
    'mutationResponse',
    'mutationFailed',
    mapFieldsToVars,
    props => ({
      title: 'Remove Interface',
      actionText: 'Delete',
      onCancel: props.onCancel,
      text: `Are you sure you want to remove interface ${props.intf.mac}?`,
    })
  )
)

export default MachineRemoveInterface

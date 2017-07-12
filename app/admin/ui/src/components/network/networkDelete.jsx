import React from 'react'
import ConfirmDialog from '../confirmDialog'
import { graphql } from 'react-apollo'
import { withHandlers, compose, withProps } from 'recompose'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { deleteNetworkGQL, networksListGQL } from '../../graphql/network'
import * as messageActions from '../../actions/message'

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ ...messageActions }, dispatch),
})

const mutationHandlers = {
  mutationResponse: ({ actions, onDone = null }) => ({
    data: { deleteNetwork: { ok, network, errors } },
  }) => {
    if (ok && errors.length > 0)
      actions.showWarningMessage(
        `Network ${network.name} deleted, but: ${errors.join(', ')}.`
      )
    else if (ok)
      actions.showOkMessage(`Network ${network.name} deleted successfully.`)
    else
      actions.showErrorMessage(`Error deleting Network: ${errors.join(', ')}.`)

    if (ok && onDone) onDone()
  },
  mutationFailed: ({ actions }) => error =>
    actions.showErrorMessage(error.message || error),
}

const mapFieldsToVars = (fields, props) => ({
  id: props.network.id,
})

export const NetworkDelete = compose(
  graphql(deleteNetworkGQL, {
    name: 'deleteNetwork',
    options: {
      refetchQueries: [
        {
          query: networksListGQL,
        },
      ],
    },
  }),
  connect(null, mapDispatchToProps),
  withHandlers(mutationHandlers)
)(
  ConfirmDialog(
    'deleteNetwork',
    'mutationResponse',
    'mutationFailed',
    mapFieldsToVars,
    props => ({
      title: 'Delete Network',
      actionText: 'Delete',
      confirmation: 'I acknowledge that this action is irrevocable.',
      onCancel: props.onCancel,
      text: `Are you sure you want to delete network ${props.network.name}?`,
    })
  )
)

export default NetworkDelete

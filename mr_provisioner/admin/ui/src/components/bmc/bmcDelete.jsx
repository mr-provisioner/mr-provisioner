import React from 'react'
import ConfirmDialog from '../confirmDialog'
import { graphql } from 'react-apollo'
import { withHandlers, compose, withProps } from 'recompose'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { deleteBmcGQL, bmcsListGQL } from '../../graphql/bmc'
import * as messageActions from '../../actions/message'

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ ...messageActions }, dispatch),
})

const mutationHandlers = {
  mutationResponse: ({ actions, onDone = null }) => ({
    data: { deleteBmc: { ok, bmc, errors } },
  }) => {
    if (ok && errors.length > 0)
      actions.showWarningMessage(
        `BMC ${bmc.name} deleted, but: ${errors.join(', ')}.`
      )
    else if (ok) actions.showOkMessage(`BMC ${bmc.name} deleted successfully.`)
    else actions.showErrorMessage(`Error deleting BMC: ${errors.join(', ')}.`)

    if (ok && onDone) onDone()
  },
  mutationFailed: ({ actions }) => error =>
    actions.showErrorMessage(error.message || error),
}

const mapFieldsToVars = (fields, props) => ({
  id: props.bmc.id,
})

export const BmcDelete = compose(
  graphql(deleteBmcGQL, {
    name: 'deleteBmc',
    options: {
      refetchQueries: [
        {
          query: bmcsListGQL,
        },
      ],
    },
  }),
  connect(null, mapDispatchToProps),
  withHandlers(mutationHandlers)
)(
  ConfirmDialog(
    'deleteBmc',
    'mutationResponse',
    'mutationFailed',
    mapFieldsToVars,
    props => ({
      title: 'Delete BMC',
      actionText: 'Delete',
      confirmation: 'I acknowledge that this action is irrevocable.',
      onCancel: props.onCancel,
      text: `Are you sure you want to delete BMC ${props.bmc.name}?`,
    })
  )
)

export default BmcDelete

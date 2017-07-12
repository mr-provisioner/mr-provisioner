import React from 'react'
import ConfirmDialog from '../confirmDialog'
import { graphql } from 'react-apollo'
import { withHandlers, compose, withProps } from 'recompose'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { deletePreseedGQL, preseedsListGQL } from '../../graphql/preseed'
import * as messageActions from '../../actions/message'

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ ...messageActions }, dispatch),
})

const mutationHandlers = {
  mutationResponse: ({ actions, onDone = null }) => ({
    data: { deletePreseed: { ok, preseed, errors } },
  }) => {
    if (ok && errors.length > 0)
      actions.showWarningMessage(
        `Preseed ${preseed.filename} deleted, but: ${errors.join(', ')}.`
      )
    else if (ok)
      actions.showOkMessage(`Preseed ${preseed.filename} deleted successfully.`)
    else
      actions.showErrorMessage(`Error deleting Preseed: ${errors.join(', ')}.`)

    if (ok && onDone) onDone()
  },
  mutationFailed: ({ actions }) => error =>
    actions.showErrorMessage(error.message || error),
}

const mapFieldsToVars = (fields, props) => ({
  id: props.preseed.id,
})

export const PreseedDelete = compose(
  graphql(deletePreseedGQL, {
    name: 'deletePreseed',
    options: {
      refetchQueries: [
        {
          query: preseedsListGQL,
        },
      ],
    },
  }),
  connect(null, mapDispatchToProps),
  withHandlers(mutationHandlers)
)(
  ConfirmDialog(
    'deletePreseed',
    'mutationResponse',
    'mutationFailed',
    mapFieldsToVars,
    props => ({
      title: 'Delete Preseed',
      actionText: 'Delete',
      confirmation: 'I acknowledge that this action is irrevocable.',
      onCancel: props.onCancel,
      text: `Are you sure you want to delete Preseed ${props.preseed
        .filename}?`,
    })
  )
)

export default PreseedDelete

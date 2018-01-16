import React from 'react'
import ConfirmDialog from '../confirmDialog'
import { graphql } from 'react-apollo'
import { withHandlers, compose, withProps } from 'recompose'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { deleteArchGQL, archsListGQL } from '../../graphql/arch'
import * as messageActions from '../../actions/message'

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ ...messageActions }, dispatch),
})

const mutationHandlers = {
  mutationResponse: ({ actions, onDone = null }) => ({
    data: { deleteArch: { ok, arch, errors } },
  }) => {
    if (ok && errors.length > 0)
      actions.showWarningMessage(
        `Architecture ${arch.name} deleted, but: ${errors.join(', ')}.`
      )
    else if (ok)
      actions.showOkMessage(`Architecture ${arch.name} deleted successfully.`)
    else actions.showErrorMessage(`Error deleting arch: ${errors.join(', ')}.`)

    if (ok && onDone) onDone()
  },
  mutationFailed: ({ actions }) => error =>
    actions.showErrorMessage(error.message || error),
}

const mapFieldsToVars = (fields, props) => ({
  id: props.arch.id,
})

export const ArchDelete = compose(
  graphql(deleteArchGQL, {
    name: 'deleteArch',
    options: {
      refetchQueries: [
        {
          query: archsListGQL,
        },
      ],
    },
  }),
  connect(null, mapDispatchToProps),
  withHandlers(mutationHandlers)
)(
  ConfirmDialog(
    'deleteArch',
    'mutationResponse',
    'mutationFailed',
    mapFieldsToVars,
    props => ({
      title: 'Delete Architecture',
      actionText: 'Delete',
      confirmation: 'I acknowledge that this action is irrevocable.',
      onCancel: props.onCancel,
      text: `Are you sure you want to delete arch ${props.arch.name}?`,
    })
  )
)

export default ArchDelete

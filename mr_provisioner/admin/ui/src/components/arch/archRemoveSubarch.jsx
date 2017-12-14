import React from 'react'
import ConfirmDialog from '../confirmDialog'
import { graphql } from 'react-apollo'
import { withHandlers, compose, withProps } from 'recompose'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { deleteSubarchGQL, archGQL } from '../../graphql/arch'
import * as messageActions from '../../actions/message'

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ ...messageActions }, dispatch),
})

const mutationHandlers = {
  mutationResponse: ({ actions, onDone = null }) => ({
    data: { deleteSubarch: { ok, subarch, errors } },
  }) => {
    if (ok && errors.length > 0)
      actions.showWarningMessage(
        `Subarch ${subarch.name} removed, but: ${errors.join(', ')}.`
      )
    else if (ok)
      actions.showOkMessage(
        `Subarchitecture ${subarch.name} removed successfully.`
      )
    else
      actions.showErrorMessage(
        `Error removing subarchitecture: ${errors.join(', ')}.`
      )

    if (ok && onDone) onDone()
  },
  mutationFailed: ({ actions }) => error =>
    actions.showErrorMessage(error.message || error),
}

const mapFieldsToVars = (fields, props) => ({
  id: props.subarch.id,
})

export const ArchRemoveSubarch = compose(
  graphql(deleteSubarchGQL, {
    name: 'deleteSubarch',
    options: ({ match, arch }) => ({
      refetchQueries: [
        {
          query: archGQL,
          variables: {
            id: arch.id,
          },
        },
      ],
    }),
  }),
  connect(null, mapDispatchToProps),
  withHandlers(mutationHandlers)
)(
  ConfirmDialog(
    'deleteSubarch',
    'mutationResponse',
    'mutationFailed',
    mapFieldsToVars,
    props => ({
      title: 'Remove Subarchitecture',
      actionText: 'Delete',
      onCancel: props.onCancel,
      text: `Are you sure you want to remove subarchitecture ${props.subarch
        .name}?`,
    })
  )
)

export default ArchRemoveSubarch

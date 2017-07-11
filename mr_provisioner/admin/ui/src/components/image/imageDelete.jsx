import React from 'react'
import ConfirmDialog from '../confirmDialog'
import { graphql } from 'react-apollo'
import { withHandlers, compose, withProps } from 'recompose'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { deleteImageGQL, imagesListGQL } from '../../graphql/image'
import * as messageActions from '../../actions/message'

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ ...messageActions }, dispatch),
})

const mutationHandlers = {
  mutationResponse: ({ actions, onDone = null }) => ({
    data: { deleteImage: { ok, image, errors } },
  }) => {
    if (ok && errors.length > 0)
      actions.showWarningMessage(
        `Image ${image.filename} deleted, but: ${errors.join(', ')}.`
      )
    else if (ok)
      actions.showOkMessage(`Image ${image.filename} deleted successfully.`)
    else actions.showErrorMessage(`Error deleting Image: ${errors.join(', ')}.`)

    if (ok && onDone) onDone()
  },
  mutationFailed: ({ actions }) => error =>
    actions.showErrorMessage(error.message || error),
}

const mapFieldsToVars = (fields, props) => ({
  id: props.image.id,
})

export const ImageDelete = compose(
  graphql(deleteImageGQL, {
    name: 'deleteImage',
    options: {
      refetchQueries: [
        {
          query: imagesListGQL,
        },
      ],
    },
  }),
  connect(null, mapDispatchToProps),
  withHandlers(mutationHandlers)
)(
  ConfirmDialog(
    'deleteImage',
    'mutationResponse',
    'mutationFailed',
    mapFieldsToVars,
    props => ({
      title: 'Delete Image',
      actionText: 'Delete',
      confirmation: 'I acknowledge that this action is irrevocable.',
      onCancel: props.onCancel,
      text: `Are you sure you want to delete Image ${props.image.filename}?`,
    })
  )
)

export default ImageDelete

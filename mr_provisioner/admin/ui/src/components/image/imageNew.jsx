import React from 'react'
import Header from 'grommet/components/Header'
import Box from 'grommet/components/Box'
import Heading from 'grommet/components/Heading'
import Form from 'grommet/components/Form'
import FormField from 'grommet/components/FormField'
import FormFields from 'grommet/components/FormFields'
import TextInput from 'grommet/components/TextInput'
import Button from 'grommet/components/Button'
import Footer from 'grommet/components/Footer'
import Select from '../select'
import withForm from '../../hoc/withForm'
import withSubmit from '../../hoc/withSubmit'
import { NetworkLoading, NetworkError } from '../network'
import { withApolloStatus } from '../../hoc/apollo'
import { graphql } from 'react-apollo'
import { withHandlers, compose } from 'recompose'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { Validator, ArrayValidator } from '../../util/validation'
import {
  validateLength,
  validateFile,
  validateAscii,
  validateNonNull,
} from '../../util/validators'
import validator from 'validator'
import { createImageGQL, imagesListGQL } from '../../graphql/image'
import { archsListGQL } from '../../graphql/arch'
import * as messageActions from '../../actions/message'

function ImageNew_({ fields, fieldErrors, ...props }) {
  return (
    <div>
      <Header>
        <Heading tag="h2">Add Image</Heading>
      </Header>
      <Form>
        <FormFields>
          <fieldset>
            <FormField
              label="Description"
              help={null}
              error={props.showFieldErrors && fieldErrors.description}
            >
              <TextInput
                value={fields.description}
                onDOMChange={props.onChangeDescription}
              />
            </FormField>

            <FormField
              label="Type"
              help={null}
              error={props.showFieldErrors && fieldErrors.fileType}
            >
              <Select
                required={true}
                options={[
                  { name: 'Kernel' },
                  { name: 'Initrd' },
                  { name: 'bootloader' },
                ]}
                value={fields.fileType}
                searchKeys={['name']}
                onChange={props.onChangeFileType}
                valueKey="name"
                labelFn={t => t.name}
              />
            </FormField>

            <FormField
              label="Architecture"
              help={null}
              error={props.showFieldErrors && fieldErrors.archId}
            >
              <Select
                options={props.data.archs}
                value={fields.archId}
                searchKeys={['name', 'description']}
                onChange={props.onChangeArchId}
                valueKey="id"
                labelFn={arch => `${arch.name} (${arch.description || ''})`}
              />
            </FormField>

            <FormField
              label="File"
              help={null}
              error={props.showFieldErrors && fieldErrors.file}
            >
              <input type="file" onChange={props.onChangeFile} />
            </FormField>
          </fieldset>
        </FormFields>
        <Footer pad={{ vertical: 'medium' }}>
          <Button
            label="Add Image"
            type="submit"
            primary={true}
            onClick={props.handleSubmit}
          />
        </Footer>
      </Form>
    </div>
  )
}

const formFields = {
  fileType: { defaultValue: 'Kernel', accessor: e => e },
  description: { defaultValue: '', accessor: e => e.target.value },
  file: { defaultValue: null, accessor: e => e.target.files },
  archId: { defaultValue: null, accessor: e => e },
}

const validationRules = {
  description: [
    Validator(
      validateLength({ min: 0, max: 256 }),
      'Must be between 0 and 256 characters long'
    ),
    Validator(validateAscii, 'Must contain only ASCII characters'),
  ],
  file: [Validator(validateFile, 'Must be a valid file')],
  archId: [Validator(validateNonNull, 'Must be selected')],
}

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ ...messageActions }, dispatch),
})

const mutationHandlers = {
  mutationResponse: ({ actions, onDone = null }) => ({
    data: { createImage: { ok, image, errors } },
  }) => {
    if (ok && errors.length > 0)
      actions.showWarningMessage(
        `Image ${image.filename} created, but: ${errors.join(', ')}.`
      )
    else if (ok)
      actions.showOkMessage(`Image ${image.filename} created successfully.`)
    else actions.showErrorMessage(`Error creating image: ${errors.join(', ')}.`)

    if (ok && onDone) onDone()
  },
  mutationFailed: ({ actions }) => error =>
    actions.showErrorMessage(error.message || error),
}

export const ImageNew = compose(
  graphql(archsListGQL, { options: { notifyOnNetworkStatusChange: true } }),
  graphql(createImageGQL, {
    name: 'createImage',
    options: {
      refetchQueries: [
        {
          query: imagesListGQL,
        },
      ],
    },
  }),
  connect(null, mapDispatchToProps),
  withHandlers(mutationHandlers),
  withForm(formFields, validationRules),
  withSubmit('createImage', 'mutationResponse', 'mutationFailed'),
  withApolloStatus(NetworkLoading, NetworkError)
)(ImageNew_)

export default ImageNew

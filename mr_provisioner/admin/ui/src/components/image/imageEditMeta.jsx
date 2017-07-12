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
import { graphql } from 'react-apollo'
import { withHandlers, compose } from 'recompose'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { Validator, ArrayValidator } from '../../util/validation'
import { validateLength, validateAscii } from '../../util/validators'
import validator from 'validator'
import { changeImageMetaGQL, imageGQL } from '../../graphql/image'
import * as messageActions from '../../actions/message'

function ImageEditMeta_({ fields, fieldErrors, ...props }) {
  return (
    <div>
      <Header>
        <Heading tag="h2">Edit Overview</Heading>
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
                options={[{ name: 'Kernel' }, { name: 'Initrd' }]}
                value={fields.fileType}
                searchKeys={['name']}
                onChange={props.onChangeFileType}
                valueKey="name"
                labelFn={t => t.name}
              />
            </FormField>
          </fieldset>
        </FormFields>
        <Footer pad={{ vertical: 'medium' }}>
          <Button
            label="Save changes"
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
  fileType: { defaultValue: ({ image }) => image.fileType, accessor: e => e },
  description: {
    defaultValue: ({ image }) => image.description,
    accessor: e => e.target.value,
  },
}

const validationRules = {
  description: [
    Validator(
      validateLength({ min: 0, max: 256 }),
      'Must be between 0 and 256 characters long'
    ),
    Validator(validateAscii, 'Must contain only ASCII characters'),
  ],
}

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ ...messageActions }, dispatch),
})

const mutationHandlers = {
  mutationResponse: ({ actions, onDone = null }) => ({
    data: { changeImageMeta: { ok, image, errors } },
  }) => {
    if (ok && errors.length > 0)
      actions.showWarningMessage(
        `Changes to ${image.filename} saved, but: ${errors.join(', ')}.`
      )
    else if (ok)
      actions.showOkMessage(`Changes to ${image.filename} saved successfully.`)
    else actions.showErrorMessage(`Error saving changes: ${errors.join(', ')}.`)

    if (ok && onDone) onDone()
  },
  mutationFailed: ({ actions }) => error =>
    actions.showErrorMessage(error.message || error),
}

const mapFieldsToVars = (fields, props) => ({
  id: props.image.id,
  ...fields,
})

export const ImageEditMeta = compose(
  graphql(changeImageMetaGQL, {
    name: 'changeImageMeta',
    options: ({ match, image }) => ({
      refetchQueries: [
        {
          query: imageGQL,
          variables: {
            id: image.id,
          },
        },
      ],
    }),
  }),
  connect(null, mapDispatchToProps),
  withHandlers(mutationHandlers),
  withForm(formFields, validationRules),
  withSubmit(
    'changeImageMeta',
    'mutationResponse',
    'mutationFailed',
    mapFieldsToVars
  )
)(ImageEditMeta_)

export default ImageEditMeta

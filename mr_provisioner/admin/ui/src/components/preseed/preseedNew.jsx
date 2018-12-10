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
import { createPreseedGQL, preseedsListGQL } from '../../graphql/preseed'
import * as messageActions from '../../actions/message'

function PreseedNew_({ fields, fieldErrors, ...props }) {
  return (
    <div>
      <Header>
        <Heading tag="h2">Add Preseed</Heading>
      </Header>
      <Form>
        <FormFields>
          <fieldset>
            <FormField
              label="Name"
              help={null}
              error={props.showFieldErrors && fieldErrors.filename}
            >
              <TextInput
                value={fields.filename}
                onDOMChange={props.onChangeFilename}
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
                  { name: 'kickstart' },
                  { name: 'preseed' },
                  { name: 'autoyast' },
                ]}
                value={fields.fileType}
                searchKeys={['name']}
                onChange={props.onChangeFileType}
                valueKey="name"
                labelFn={t => t.name}
              />
            </FormField>

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
          </fieldset>
          <fieldset>
            <p>
              You will be able to edit the preseed contents after creating it.
            </p>
          </fieldset>
        </FormFields>
        <Footer pad={{ vertical: 'medium' }}>
          <Button
            label="Add Preseed"
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
  filename: { defaultValue: '', accessor: e => e.target.value },
  fileType: { defaultValue: 'preseed', accessor: e => e },
  description: { defaultValue: '', accessor: e => e.target.value },
}

const validationRules = {
  filename: [
    Validator(
      validateLength({ min: 2, max: 256 }),
      'Must be between 2 and 256 characters long'
    ),
    Validator(validateAscii, 'Must contain only ASCII characters'),
  ],
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
    data: { createPreseed: { ok, preseed, errors } },
  }) => {
    if (ok && errors.length > 0)
      actions.showWarningMessage(
        `Preseed ${preseed.filename} created, but: ${errors.join(', ')}.`
      )
    else if (ok)
      actions.showOkMessage(`Preseed ${preseed.filename} created successfully.`)
    else
      actions.showErrorMessage(`Error creating preseed: ${errors.join(', ')}.`)

    if (ok && onDone) onDone()
  },
  mutationFailed: ({ actions }) => error =>
    actions.showErrorMessage(error.message || error),
}

export const PreseedNew = compose(
  graphql(createPreseedGQL, {
    name: 'createPreseed',
    options: {
      refetchQueries: [
        {
          query: preseedsListGQL,
        },
      ],
    },
  }),
  connect(null, mapDispatchToProps),
  withHandlers(mutationHandlers),
  withForm(formFields, validationRules),
  withSubmit('createPreseed', 'mutationResponse', 'mutationFailed')
)(PreseedNew_)

export default PreseedNew

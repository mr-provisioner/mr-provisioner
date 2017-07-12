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
import withForm from '../../hoc/withForm'
import withSubmit from '../../hoc/withSubmit'
import { graphql } from 'react-apollo'
import { withHandlers, compose } from 'recompose'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { Validator, ArrayValidator } from '../../util/validation'
import { validateLength, validateAscii } from '../../util/validators'
import validator from 'validator'
import { createOwnTokenGQL, ownTokensListGQL } from '../../graphql/self'
import * as messageActions from '../../actions/message'

function SelfAddToken_({ fields, fieldErrors, ...props }) {
  return (
    <div>
      <Header>
        <Heading tag="h2">Create a new token</Heading>
      </Header>
      <Form>
        <FormFields>
          <fieldset>
            <FormField
              label="Description"
              help={null}
              error={props.showFieldErrors && fieldErrors.desc}
            >
              <TextInput value={fields.desc} onDOMChange={props.onChangeDesc} />
            </FormField>
          </fieldset>
        </FormFields>
        <Footer pad={{ vertical: 'medium' }}>
          <Button
            label="Create token"
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
  desc: { defaultValue: '', accessor: e => e.target.value },
}

const validationRules = {
  desc: [
    Validator(
      validateLength({ min: 0, max: 140 }),
      'Must be between 0 and 140 characters long'
    ),
    Validator(validateAscii, 'Must contain only ASCII characters'),
  ],
}

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ ...messageActions }, dispatch),
})

const mutationHandlers = {
  mutationResponse: ({ actions, onDone = null }) => ({
    data: { createOwnToken: { ok, errors } },
  }) => {
    if (ok && errors.length > 0)
      actions.showWarningMessage(
        `Token created successfully, but: ${errors.join(', ')}.`
      )
    else if (ok) actions.showOkMessage(`Token created successfully.`)
    else actions.showErrorMessage(`Error creating token: ${errors.join(', ')}.`)

    if (ok && onDone) onDone()
  },
  mutationFailed: ({ actions }) => error =>
    actions.showErrorMessage(error.message || error),
}

export const SelfAddToken = compose(
  graphql(createOwnTokenGQL, {
    name: 'createOwnToken',
    options: {
      refetchQueries: [
        {
          query: ownTokensListGQL,
        },
      ],
    },
  }),
  connect(null, mapDispatchToProps),
  withHandlers(mutationHandlers),
  withForm(formFields, validationRules),
  withSubmit('createOwnToken', 'mutationResponse', 'mutationFailed')
)(SelfAddToken_)

export default SelfAddToken

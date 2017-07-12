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
import { changeUserInfoGQL, userGQL } from '../../graphql/user'
import * as messageActions from '../../actions/message'

function UserEditInfo_({ fields, fieldErrors, ...props }) {
  return (
    <div>
      <Header>
        <Heading tag="h2">Edit User info</Heading>
      </Header>
      <Form>
        <FormFields>
          <fieldset>
            <FormField
              label="Username"
              help={null}
              error={props.showFieldErrors && fieldErrors.username}
            >
              <TextInput
                value={fields.username}
                onDOMChange={props.onChangeUsername}
              />
            </FormField>

            <FormField
              label="Email"
              help={null}
              error={props.showFieldErrors && fieldErrors.email}
            >
              <TextInput
                value={fields.email}
                onDOMChange={props.onChangeEmail}
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
  username: {
    defaultValue: ({ user }) => user.username,
    accessor: e => e.target.value,
  },
  email: {
    defaultValue: ({ user }) => user.email,
    accessor: e => e.target.value,
  },
}

const validationRules = {
  username: [
    Validator(
      validateLength({ min: 2, max: 128 }),
      'Must be between 2 and 128 characters long'
    ),
    Validator(validateAscii, 'Must contain only ASCII characters'),
  ],
  email: [
    Validator(validator.isEmail, 'Must be a valid email address'),
    Validator(
      validateLength({ min: 2, max: 1024 }),
      'Must be between 2 and 1024 characters long'
    ),
  ],
}

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ ...messageActions }, dispatch),
})

const mutationHandlers = {
  mutationResponse: ({ actions, onDone = null }) => ({
    data: { changeUserInfo: { ok, user, errors } },
  }) => {
    if (ok && errors.length > 0)
      actions.showWarningMessage(
        `Changes to user ${user.username} saved, but: ${errors.join(', ')}.`
      )
    else if (ok)
      actions.showOkMessage(`Changes to ${user.username} saved successfully.`)
    else actions.showErrorMessage(`Error saving changes: ${errors.join(', ')}.`)

    if (ok && onDone) onDone()
  },
  mutationFailed: ({ actions }) => error =>
    actions.showErrorMessage(error.message || error),
}

const mapFieldsToVars = (fields, props) => ({
  id: props.user.id,
  ...fields,
})

export const UserEditInfo = compose(
  graphql(changeUserInfoGQL, {
    name: 'changeUserInfo',
    options: ({ match, user }) => ({
      refetchQueries: [
        {
          query: userGQL,
          variables: {
            id: user.id,
          },
        },
      ],
    }),
  }),
  connect(null, mapDispatchToProps),
  withHandlers(mutationHandlers),
  withForm(formFields, validationRules),
  withSubmit(
    'changeUserInfo',
    'mutationResponse',
    'mutationFailed',
    mapFieldsToVars
  )
)(UserEditInfo_)

export default UserEditInfo

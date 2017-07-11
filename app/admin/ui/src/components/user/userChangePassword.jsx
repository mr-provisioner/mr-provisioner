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
import {
  validateLength,
  validateRepeat,
  validateAscii,
} from '../../util/validators'
import validator from 'validator'
import { changeUserPasswordGQL, userGQL } from '../../graphql/user'
import * as messageActions from '../../actions/message'

function UserChangePassword_({ fields, fieldErrors, ...props }) {
  return (
    <div>
      <Header>
        <Heading tag="h2">Change password</Heading>
      </Header>
      <Form>
        <FormFields>
          <fieldset>
            <FormField
              label="New password"
              help={null}
              error={props.showFieldErrors && fieldErrors.password}
            >
              <input
                type="password"
                value={fields.password}
                onChange={props.onChangePassword}
              />
            </FormField>
            <FormField
              label="Repeat"
              help={null}
              error={props.showFieldErrors && fieldErrors.passwordRepeat}
            >
              <input
                type="password"
                value={fields.passwordRepeat}
                onChange={props.onChangePasswordRepeat}
              />
            </FormField>
          </fieldset>
        </FormFields>
        <Footer pad={{ vertical: 'medium' }}>
          <Button
            label="Change password"
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
  password: { defaultValue: '', accessor: e => e.target.value },
  passwordRepeat: { defaultValue: '', accessor: e => e.target.value },
}

const validationRules = {
  password: [
    Validator(
      validateLength({ min: 6, max: 128 }),
      'Must be between 6 and 128 characters long'
    ),
    Validator(validateAscii, 'Must contain only ASCII characters'),
  ],
  passwordRepeat: [
    Validator(validateRepeat('password'), 'Must match password'),
  ],
}

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ ...messageActions }, dispatch),
})

const mutationHandlers = {
  mutationResponse: ({ actions, onDone = null }) => ({
    data: { changeUserPassword: { ok, user, errors } },
  }) => {
    if (ok && errors.length > 0)
      actions.showWarningMessage(
        `Password for user ${user.username} changed, but: ${errors.join(', ')}.`
      )
    else if (ok)
      actions.showOkMessage(
        `Password for ${user.username} changed successfully.`
      )
    else
      actions.showErrorMessage(`Error changing password: ${errors.join(', ')}.`)

    if (ok && onDone) onDone()
  },
  mutationFailed: ({ actions }) => error =>
    actions.showErrorMessage(error.message || error),
}

const mapFieldsToVars = (fields, props) => ({
  id: props.user.id,
  ...fields,
})

export const UserChangePassword = compose(
  graphql(changeUserPasswordGQL, {
    name: 'changeUserPassword',
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
    'changeUserPassword',
    'mutationResponse',
    'mutationFailed',
    mapFieldsToVars
  )
)(UserChangePassword_)

export default UserChangePassword

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
import { createUserGQL, usersListGQL } from '../../graphql/user'
import * as messageActions from '../../actions/message'

function UserNew_({ fields, fieldErrors, ...props }) {
  return (
    <div>
      <Header>
        <Heading tag="h2">Add User</Heading>
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
          <fieldset>
            <FormField
              label="Privilege level"
              help={null}
              error={props.showFieldErrors && fieldErrors.privilegeLevel}
            >
              <Select
                required={true}
                options={[{ name: 'user' }, { name: 'admin' }]}
                value={fields.privilegeLevel}
                searchKeys={['name']}
                onChange={props.onChangePrivilegeLevel}
                valueKey="name"
                labelFn={t => t.name}
              />
            </FormField>
          </fieldset>
        </FormFields>
        <Footer pad={{ vertical: 'medium' }}>
          <Button
            label="Add User"
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
  username: { defaultValue: '', accessor: e => e.target.value },
  email: { defaultValue: '', accessor: e => e.target.value },
  privilegeLevel: { defaultValue: 'user', accessor: e => e },
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
    data: { createUser: { ok, user, password, errors } },
  }) => {
    if (ok && errors.length > 0)
      actions.showWarningMessage(
        `User ${user.username} created with password: '${password}', but: ${errors.join(
          ', '
        )}.`,
        0
      )
    else if (ok)
      actions.showOkMessage(
        `User ${user.username} created successfully with password: '${password}'.`,
        0
      )
    else actions.showErrorMessage(`Error creating user: ${errors.join(', ')}.`)

    if (ok && onDone) onDone()
  },
  mutationFailed: ({ actions }) => error =>
    actions.showErrorMessage(error.message || error),
}

const mapFieldsToVars = (fields, props) => ({
  username: fields.username,
  email: fields.email,
  admin: fields.privilegeLevel === 'admin',
})

export const UserNew = compose(
  graphql(createUserGQL, {
    name: 'createUser',
    options: {
      refetchQueries: [
        {
          query: usersListGQL,
        },
      ],
    },
  }),
  connect(null, mapDispatchToProps),
  withHandlers(mutationHandlers),
  withForm(formFields, validationRules),
  withSubmit(
    'createUser',
    'mutationResponse',
    'mutationFailed',
    mapFieldsToVars
  )
)(UserNew_)

export default UserNew

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
import { validateLength } from '../../util/validators'
import validator from 'validator'
import { changeUserAdminGQL, userGQL } from '../../graphql/user'
import * as messageActions from '../../actions/message'

function UserEditPrivilege_({ fields, fieldErrors, ...props }) {
  return (
    <div>
      <Header>
        <Heading tag="h2">Edit User privilege</Heading>
      </Header>
      <Form>
        <FormFields>
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
  privilegeLevel: {
    defaultValue: ({ user }) => (user.admin ? 'admin' : 'user'),
    accessor: e => e,
  },
}

const validationRules = {}

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ ...messageActions }, dispatch),
})

const mutationHandlers = {
  mutationResponse: ({ actions, onDone = null }) => ({
    data: { changeUserAdmin: { ok, user, errors } },
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
  admin: fields.privilegeLevel === 'admin',
})

export const UserEditPrivilege = compose(
  graphql(changeUserAdminGQL, {
    name: 'changeUserAdmin',
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
    'changeUserAdmin',
    'mutationResponse',
    'mutationFailed',
    mapFieldsToVars
  )
)(UserEditPrivilege_)

export default UserEditPrivilege

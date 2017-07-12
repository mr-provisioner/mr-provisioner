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
import { NetworkLoading, NetworkError } from '../network'
import { withApolloStatus } from '../../hoc/apollo'
import withForm from '../../hoc/withForm'
import withSubmit from '../../hoc/withSubmit'
import { graphql } from 'react-apollo'
import { withHandlers, compose } from 'recompose'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { Validator, ArrayValidator } from '../../util/validation'
import { validateLength, validateAscii } from '../../util/validators'
import validator from 'validator'
import { usersListLimitedGQL } from '../../graphql/user'
import { addMachineAssigneeGQL, machineGQL } from '../../graphql/machine'
import * as messageActions from '../../actions/message'

function MachineAddAssignee_({ fields, fieldErrors, ...props }) {
  return (
    <div>
      <Header>
        <Heading tag="h2">Add Assignee</Heading>
      </Header>
      <Form>
        <FormFields>
          <fieldset>
            <FormField
              label="User"
              help={null}
              error={props.showFieldErrors && fieldErrors.userId}
            >
              <Select
                required={true}
                options={props.data.users}
                value={fields.userId}
                searchKeys={['username']}
                onChange={props.onChangeUserId}
                valueKey="id"
                labelFn={user => user.username}
              />
            </FormField>

            <FormField
              label="Reason"
              help={null}
              error={props.showFieldErrors && fieldErrors.reason}
            >
              <TextInput
                value={fields.reason}
                onDOMChange={props.onChangeReason}
              />
            </FormField>
          </fieldset>
        </FormFields>
        <Footer pad={{ vertical: 'medium' }}>
          <Button
            label="Add assignee"
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
  reason: { defaultValue: '', accessor: e => e.target.value },
  userId: { defaultValue: null, accessor: e => e },
}

const validationRules = {
  reason: [
    Validator(
      validateLength({ min: 0, max: 140 }),
      'Must be between 0 and 140 characters long'
    ),
    Validator(validateAscii, 'Must contain only ASCII characters'),
  ],
  userId: [Validator(f => f !== null, 'Must be a valid user')],
}

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ ...messageActions }, dispatch),
})

const mutationHandlers = {
  mutationResponse: ({ actions, onDone = null }) => ({
    data: { addMachineAssignee: { ok, assignment, errors } },
  }) => {
    if (ok && errors.length > 0)
      actions.showWarningMessage(
        `Assignee ${assignment.user
          .username} added successfully, but: ${errors.join(', ')}.`
      )
    else if (ok)
      actions.showOkMessage(
        `Assignee ${assignment.user.username} added successfully.`
      )
    else
      actions.showErrorMessage(`Error adding assignee: ${errors.join(', ')}.`)

    if (ok && onDone) onDone()
  },
  mutationFailed: ({ actions }) => error =>
    actions.showErrorMessage(error.message || error),
}

const mapFieldsToVars = (fields, props) => ({
  machineId: props.machine.id,
  ...fields,
})

export const MachineAddAssignee = compose(
  graphql(usersListLimitedGQL, {
    options: { notifyOnNetworkStatusChange: true },
  }),
  graphql(addMachineAssigneeGQL, {
    name: 'addMachineAssignee',
    options: ({ match, machine }) => ({
      refetchQueries: [
        {
          query: machineGQL,
          variables: {
            id: machine.id,
          },
        },
      ],
    }),
  }),
  connect(null, mapDispatchToProps),
  withHandlers(mutationHandlers),
  withForm(formFields, validationRules),
  withSubmit(
    'addMachineAssignee',
    'mutationResponse',
    'mutationFailed',
    mapFieldsToVars
  ),
  withApolloStatus(NetworkLoading, NetworkError)
)(MachineAddAssignee_)

export default MachineAddAssignee

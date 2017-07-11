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
  validateMacField,
  validateAscii,
} from '../../util/validators'
import validator from 'validator'
import { usersListLimitedGQL } from '../../graphql/user'
import { changeMachineAssigneeGQL, machineGQL } from '../../graphql/machine'
import * as messageActions from '../../actions/message'

function MachineEditAssignee_({ fields, fieldErrors, ...props }) {
  return (
    <div>
      <Header>
        <Heading tag="h2">Edit Assignee</Heading>
      </Header>
      <Form>
        <FormFields>
          <fieldset>
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
  reason: {
    defaultValue: ({ assignee }) => assignee.reason,
    accessor: e => e.target.value,
  },
}

const validationRules = {
  reason: [
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
    data: { changeMachineAssignee: { ok, assignment, errors } },
  }) => {
    if (ok && errors.length > 0)
      actions.showWarningMessage(
        `Changes to assignee ${assignment.user
          .username} saved successfully, but: ${errors.join(', ')}.`
      )
    else if (ok)
      actions.showOkMessage(
        `Changes to assignee ${assignment.user.username} saved successfully.`
      )
    else actions.showErrorMessage(`Error saving changes: ${errors.join(', ')}.`)

    if (ok && onDone) onDone()
  },
  mutationFailed: ({ actions }) => error =>
    actions.showErrorMessage(error.message || error),
}

const mapFieldsToVars = (fields, props) => ({
  machineId: props.machine.id,
  id: props.assignee.id,
  ...fields,
})

export const MachineEditAssignee = compose(
  graphql(changeMachineAssigneeGQL, {
    name: 'changeMachineAssignee',
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
    'changeMachineAssignee',
    'mutationResponse',
    'mutationFailed',
    mapFieldsToVars
  )
)(MachineEditAssignee_)

export default MachineEditAssignee

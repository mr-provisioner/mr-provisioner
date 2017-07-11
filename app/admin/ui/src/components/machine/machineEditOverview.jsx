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
import {
  Validator,
  ArrayValidator,
  ExtendedValidator,
} from '../../util/validation'
import { validateLength, validateAscii } from '../../util/validators'
import validator from 'validator'
import {
  machineNewGQL,
  changeMachineOverviewGQL,
  machineGQL,
} from '../../graphql/machine'
import * as messageActions from '../../actions/message'
import { BMCInfoField, validateBmcInfo } from './bmcInfoField'

function MachineEditOverview_({ fields, fieldErrors, ...props }) {
  const bmc = props.data.bmcs.find(b => b.id === fields.bmcId)

  return (
    <div>
      <Header>
        <Heading tag="h2">Edit Overview</Heading>
      </Header>
      <Form>
        <FormFields>
          <fieldset>
            <FormField
              label="Name"
              help={null}
              error={props.showFieldErrors && fieldErrors.name}
            >
              <TextInput value={fields.name} onDOMChange={props.onChangeName} />
            </FormField>

            <FormField
              label="BMC"
              help={null}
              error={props.showFieldErrors && fieldErrors.bmcId}
            >
              <Select
                options={props.data.bmcs}
                value={fields.bmcId}
                searchKeys={['name', 'ip']}
                onChange={props.onChangeBmcId}
                valueKey="id"
                labelFn={bmc => `${bmc.name} (${bmc.ip})`}
              />
            </FormField>

            <BMCInfoField
              bmc={bmc}
              onChange={props.onChangeBmcInfo}
              showFieldErrors={props.showFieldErrors}
              value={fields.bmcInfo}
              error={fieldErrors.bmcInfo}
            />
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
  name: {
    defaultValue: ({ machine }) => machine.name,
    accessor: e => e.target.value,
  },
  bmcId: {
    defaultValue: ({ machine }) => (machine.bmc ? machine.bmc.id : null),
    accessor: e => e,
  },
  bmcInfo: { defaultValue: ({ machine }) => machine.bmcInfo, accessor: e => e },
}

const validationRules = props => ({
  name: [
    Validator(
      validateLength({ min: 2, max: 256 }),
      'Must be between 2 and 256 characters long'
    ),
    Validator(validateAscii, 'Must contain only ASCII characters'),
  ],
  bmcInfo: [
    ExtendedValidator(validateBmcInfo, props && props.data && props.data.bmcs),
  ],
})

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ ...messageActions }, dispatch),
})

const mutationHandlers = {
  mutationResponse: ({ actions, onDone = null }) => ({
    data: { changeMachineOverview: { ok, machine, errors } },
  }) => {
    if (ok && errors.length > 0)
      actions.showWarningMessage(
        `Changes to ${machine.name} saved, but: ${errors.join(', ')}.`
      )
    else if (ok)
      actions.showOkMessage(`Changes to ${machine.name} saved successfully.`)
    else actions.showErrorMessage(`Error saving changes: ${errors.join(', ')}.`)

    if (ok && onDone) onDone()
  },
  mutationFailed: ({ actions }) => error =>
    actions.showErrorMessage(error.message || error),
}

const mapFieldsToVars = (fields, props) => ({
  id: props.machine.id,
  ...fields,
})

export const MachineEditOverview = compose(
  graphql(machineNewGQL, { options: { notifyOnNetworkStatusChange: true } }),
  graphql(changeMachineOverviewGQL, {
    name: 'changeMachineOverview',
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
    'changeMachineOverview',
    'mutationResponse',
    'mutationFailed',
    mapFieldsToVars
  ),
  withApolloStatus(NetworkLoading, NetworkError)
)(MachineEditOverview_)

export default MachineEditOverview

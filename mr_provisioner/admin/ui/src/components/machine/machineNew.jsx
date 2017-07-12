import React from 'react'
import Header from 'grommet/components/Header'
import Box from 'grommet/components/Box'
import Heading from 'grommet/components/Heading'
import Form from 'grommet/components/Form'
import FormField from 'grommet/components/FormField'
import FormFields from 'grommet/components/FormFields'
import TextInput from 'grommet/components/TextInput'
import NumberInput from 'grommet/components/NumberInput'
import Button from 'grommet/components/Button'
import AddIcon from 'grommet/components/icons/base/Add'
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
import {
  validateLength,
  validateMacField,
  validateAscii,
} from '../../util/validators'
import validator from 'validator'
import {
  machineNewGQL,
  createMachineGQL,
  machinesListGQL,
} from '../../graphql/machine'
import * as messageActions from '../../actions/message'
import { BMCInfoField, validateBmcInfo } from './bmcInfoField'
import pathOr from 'ramda/src/pathOr'

function MachineNew_({ fields, fieldErrors, ...props }) {
  const bmc = props.data.bmcs.find(b => b.id === fields.bmcId)

  return (
    <div>
      <Header>
        <Heading tag="h2">Add Machine</Heading>
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
          <fieldset>
            <Box align="center" direction="row" justify="between">
              <Heading tag="h3" style={{ marginBottom: 0 }}>
                MACs
              </Heading>
              <Button icon={<AddIcon />} onClick={props.onAddMacs} />
            </Box>
            {fields.macs.map((mac, index) =>
              <FormField
                key={index}
                label={`MAC #${index}`}
                help={null}
                error={
                  props.showFieldErrors &&
                  fieldErrors.macs &&
                  fieldErrors.macs[index]
                }
              >
                <TextInput
                  value={mac}
                  onDOMChange={props.onChangeMacs(index)}
                />
              </FormField>
            )}
          </fieldset>
        </FormFields>
        <Footer pad={{ vertical: 'medium' }}>
          <Button
            label="Add Machine"
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
    defaultValue: props => pathOr('', ['query', 'hostname'], props),
    accessor: e => e.target.value,
  },
  bmcId: { defaultValue: null, accessor: e => e },
  bmcInfo: { defaultValue: '', accessor: e => e },
  macs: {
    array: true,
    defaultValue: props => (props.addWithMac ? [props.addWithMac] : ['']),
    accessor: e => e.target.value,
  },
}

const validationRules = props => ({
  name: [
    Validator(
      validateLength({ min: 2, max: 256 }),
      'Must be between 2 and 256 characters long'
    ),
    Validator(validateAscii, 'Must contain only ASCII characters'),
  ],
  macs: [
    ArrayValidator(validateMacField, 'Must be empty or a valid MAC address'),
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
    data: { createMachine: { ok, machine, errors } },
  }) => {
    if (ok && errors.length > 0)
      actions.showWarningMessage(
        `Machine ${machine.name} created, but: ${errors.join(', ')}.`
      )
    else if (ok)
      actions.showOkMessage(`Machine ${machine.name} created successfully.`)
    else
      actions.showErrorMessage(`Error creating machine: ${errors.join(', ')}.`)

    if (ok && onDone) onDone()
  },
  mutationFailed: ({ actions }) => error =>
    actions.showErrorMessage(error.message || error),
}

export const MachineNew = compose(
  graphql(machineNewGQL, { options: { notifyOnNetworkStatusChange: true } }),
  graphql(createMachineGQL, {
    name: 'newMachineMutation',
    options: {
      refetchQueries: [
        {
          query: machinesListGQL,
        },
      ],
    },
  }),
  connect(null, mapDispatchToProps),
  withHandlers(mutationHandlers),
  withForm(formFields, validationRules),
  withSubmit('newMachineMutation', 'mutationResponse', 'mutationFailed'),
  withApolloStatus(NetworkLoading, NetworkError)
)(MachineNew_)

export default MachineNew

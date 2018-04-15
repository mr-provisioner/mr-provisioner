import React from 'react'
import Header from 'grommet/components/Header'
import Box from 'grommet/components/Box'
import Heading from 'grommet/components/Heading'
import Form from 'grommet/components/Form'
import FormField from 'grommet/components/FormField'
import FormFields from 'grommet/components/FormFields'
import TextInput from 'grommet/components/TextInput'
import { TextInput2 } from '../grommetHacks'
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
import { netConfigType, netConfigIpv4, netName } from '../../util/net'
import {
  validateLength,
  validateMacField,
  validateAscii,
} from '../../util/validators'
import validator from 'validator'
import { changeMachineInterfaceGQL, machineGQL } from '../../graphql/machine'
import { availableIPsGQL, networksListGQL } from '../../graphql/network'
import * as messageActions from '../../actions/message'
import { check, perms, Check } from '../../util/permissions'

function MachineEditInterface_({
  fields,
  fieldErrors,
  data: { networks } = {},
  ipsData: { availableIps: { staticIps = [], reservedIps = [] } = {} } = {},
  ...props
}) {
  let ipConfigs = []

  const network = networks.find(n => n.id === fields.networkId)
  if (network) {
    ipConfigs.push({ name: 'dynamic' })
    if (network.staticNet) ipConfigs.push({ name: 'static' })
    if (network.reservedNet) ipConfigs.push({ name: 'dynamic-reserved' })
  }

  return (
    <div>
      <Header>
        <Heading tag="h2">Edit Interface</Heading>
      </Header>
      <Form>
        <FormFields>
          <fieldset>
            <FormField
              label="Identifier"
              help={null}
              error={props.showFieldErrors && fieldErrors.identifier}
            >
              <TextInput
                value={fields.identifier}
                onDOMChange={props.onChangeIdentifier}
              />
            </FormField>

            <Check permission={perms.MACHINE_ADMIN}>
              <FormField
                label="MAC"
                help={null}
                error={props.showFieldErrors && fieldErrors.mac}
              >
                <TextInput value={fields.mac} onDOMChange={props.onChangeMac} />
              </FormField>
            </Check>
            <Check permission={perms.MACHINE_ADMIN}>
              <FormField
                label="Network"
                help={null}
                error={props.showFieldErrors && fieldErrors.networkId}
              >
                <Select
                  options={networks}
                  value={fields.networkId}
                  searchKeys={['name', 'subnet']}
                  onChange={props.onChangeNetworkId}
                  valueKey="id"
                  labelFn={net => `${net.name} (${net.subnet})`}
                />
              </FormField>
            </Check>
          </fieldset>

          <fieldset>
            {network &&
              <FormField label="IP configuration" help={null}>
                <Select
                  required={true}
                  options={ipConfigs}
                  value={fields.ipConfig}
                  searchKeys={['name']}
                  onChange={props.onChangeIpConfig}
                  valueKey="name"
                  labelFn={t => `${t.name}`}
                />
              </FormField>}
            {network &&
              fields.ipConfig === 'static' &&
              <FormField
                label="Static IPv4"
                help={null}
                error={props.showFieldErrors && fieldErrors.staticIpv4}
              >
                <TextInput
                  value={fields.staticIpv4}
                  suggestions={staticIps}
                  onDOMChange={props.onChangeStaticIpv4}
                  onSelect={({ suggestion }) =>
                    props.onChangeStaticIpv4(suggestion)}
                />
              </FormField>}
            {network &&
              fields.ipConfig === 'dynamic-reserved' &&
              <FormField
                label="Reserved IPv4"
                help={null}
                error={props.showFieldErrors && fieldErrors.reservedIpv4}
              >
                <TextInput
                  value={fields.reservedIpv4}
                  suggestions={reservedIps}
                  onDOMChange={props.onChangeReservedIpv4}
                  onSelect={({ suggestion }) =>
                    props.onChangeReservedIpv4(suggestion)}
                />
              </FormField>}
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
  identifier: {
    defaultValue: ({ intf }) => intf.identifier || '',
    accessor: e => e.target.value,
  },
  networkId: {
    defaultValue: ({ intf }) => (intf.network ? intf.network.id : null),
    accessor: e => e,
  },
  mac: { defaultValue: ({ intf }) => intf.mac, accessor: e => e.target.value },
  staticIpv4: {
    defaultValue: ({ intf }) => intf.staticIpv4 || '',
    accessor: e => (typeof e === 'string' ? e : e.target.value),
  },
  reservedIpv4: {
    defaultValue: ({ intf }) => intf.reservedIpv4 || '',
    accessor: e => (typeof e === 'string' ? e : e.target.value),
  },
  ipConfig: {
    defaultValue: ({ intf }) => netConfigType(intf),
    accessor: e => e,
  },
}

const validationRules = {
  identifier: [
    Validator(
      validateLength({ min: 0, max: 64 }),
      'Must be between 0 and 64 characters long'
    ),
    Validator(validateAscii, 'Must contain only ASCII characters'),
  ],
  mac: [Validator(validator.isMACAddress, 'Must be a valid MAC address')],
  staticIpv4: [
    Validator(
      (f, fields) =>
        fields.ipConfig !== 'static' || (f && validator.isIP(f, 4)),
      'Must be a valid IPv4 address when static mode is selected'
    ),
  ],
  reservedIpv4: [
    Validator(
      (f, fields) =>
        fields.ipConfig !== 'dynamic-reserved' || (f && validator.isIP(f, 4)),
      'Must be a valid IPv4 address when dynamic-reserved mode is selected'
    ),
  ],
}

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ ...messageActions }, dispatch),
})

const mutationHandlers = {
  mutationResponse: ({ actions, onDone = null }) => ({
    data: { changeMachineInterface: { ok, intf, errors } },
  }) => {
    if (ok && errors.length > 0)
      actions.showWarningMessage(
        `Changes to interface ${intf.mac} saved, but: ${errors.join(', ')}.`
      )
    else if (ok)
      actions.showOkMessage(
        `Changes to interface ${intf.mac} saved successfully.`
      )
    else actions.showErrorMessage(`Error saving changes: ${errors.join(', ')}.`)

    if (ok && onDone) onDone()
  },
  mutationFailed: ({ actions }) => error =>
    actions.showErrorMessage(error.message || error),
}

const mapFieldsToVars = (fields, props) => ({
  id: props.intf.id,
  machineId: props.machine.id,
  identifier: fields.identifier,
  networkId: fields.networkId,
  mac: fields.mac,
  staticIpv4: fields.ipConfig === 'static' ? fields.staticIpv4 : '',
  reservedIpv4:
    fields.ipConfig === 'dynamic-reserved' ? fields.reservedIpv4 : '',
})

export const MachineEditInterface = compose(
  graphql(networksListGQL, { options: { notifyOnNetworkStatusChange: true } }),
  graphql(changeMachineInterfaceGQL, {
    name: 'changeMachineInterface',
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
    'changeMachineInterface',
    'mutationResponse',
    'mutationFailed',
    mapFieldsToVars
  ),
  graphql(availableIPsGQL, {
    name: 'ipsData',
    skip: ownProps => !ownProps.fields.networkId,
    options: ({ fields }) => ({
      notifyOnNetworkStatusChange: true,
      fetchPolicy: 'network-only',
      variables: {
        networkId: fields.networkId,
        limit: 5,
      },
    }),
  }),
  withApolloStatus(NetworkLoading, NetworkError)
)(MachineEditInterface_)

export default MachineEditInterface

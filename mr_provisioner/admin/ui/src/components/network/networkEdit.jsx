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
import {
  validateLength,
  validateAscii,
  validateCIDR,
} from '../../util/validators'
import validator from 'validator'
import { changeNetworkGQL, networkGQL } from '../../graphql/network'
import * as messageActions from '../../actions/message'

function NetworkEdit_({ fields, fieldErrors, ...props }) {
  return (
    <div>
      <Header>
        <Heading tag="h2">Edit Network</Heading>
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
              label="Subnet (CIDR notation)"
              help={null}
              error={props.showFieldErrors && fieldErrors.subnet}
            >
              <TextInput
                placeHolder="8.0.0.0/8"
                value={fields.subnet}
                onDOMChange={props.onChangeSubnet}
              />
            </FormField>
          </fieldset>
          <fieldset>
            <FormField
              label="Static IPv4 pool (CIDR notation)"
              help={null}
              error={props.showFieldErrors && fieldErrors.staticNet}
            >
              <TextInput
                placeHolder="8.8.0.0/16"
                value={fields.staticNet}
                onDOMChange={props.onChangeStaticNet}
              />
            </FormField>

            <FormField
              label="Reserved IPv4 pool (CIDR notation)"
              help={null}
              error={props.showFieldErrors && fieldErrors.reservedNet}
            >
              <TextInput
                placeHolder="8.9.0.0/16"
                value={fields.reservedNet}
                onDOMChange={props.onChangeReservedNet}
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
  name: {
    defaultValue: ({ network }) => network.name,
    accessor: e => e.target.value,
  },
  subnet: {
    defaultValue: ({ network }) => network.subnet,
    accessor: e => e.target.value,
  },
  staticNet: {
    defaultValue: ({ network }) => network.staticNet || '',
    accessor: e => e.target.value,
  },
  reservedNet: {
    defaultValue: ({ network }) => network.reservedNet || '',
    accessor: e => e.target.value,
  },
}

const validationRules = {
  name: [
    Validator(
      validateLength({ min: 2, max: 140 }),
      'Must be between 2 and 140 characters long'
    ),
    Validator(validateAscii, 'Must contain only ASCII characters'),
  ],
  subnet: [
    Validator(
      validateCIDR(4),
      'Subnet must be a valid IPv4 network in CIDR notation'
    ),
  ],
  staticNet: [
    Validator(
      f => f === '' || validateCIDR(4)(f),
      'Static subnet must be a valid IPv4 network in CIDR notation or left empty'
    ),
  ],
  reservedNet: [
    Validator(
      f => f === '' || validateCIDR(4)(f),
      'Reserved subnet must be a valid IPv4 network in CIDR notation or left empty'
    ),
  ],
}

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ ...messageActions }, dispatch),
})

const mutationHandlers = {
  mutationResponse: ({ actions, onDone = null }) => ({
    data: { changeNetwork: { ok, network, errors } },
  }) => {
    if (ok && errors.length > 0)
      actions.showWarningMessage(
        `Changes to network ${network.name} saved, but: ${errors.join(', ')}.`
      )
    else if (ok)
      actions.showOkMessage(
        `Changes to network ${network.name} saved successfully.`
      )
    else actions.showErrorMessage(`Error saving changes: ${errors.join(', ')}.`)

    if (ok && onDone) onDone()
  },
  mutationFailed: ({ actions }) => error =>
    actions.showErrorMessage(error.message || error),
}

const mapFieldsToVars = (fields, props) => ({
  id: props.network.id,
  ...fields,
})

export const NetworkEdit = compose(
  graphql(changeNetworkGQL, {
    name: 'changeNetwork',
    options: ({ match, network }) => ({
      refetchQueries: [
        {
          query: networkGQL,
          variables: {
            id: network.id,
          },
        },
      ],
    }),
  }),
  connect(null, mapDispatchToProps),
  withHandlers(mutationHandlers),
  withForm(formFields, validationRules),
  withSubmit(
    'changeNetwork',
    'mutationResponse',
    'mutationFailed',
    mapFieldsToVars
  )
)(NetworkEdit_)

export default NetworkEdit

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
import {
  machineNewGQL,
  changeMachineProvisioningGQL,
  machineGQL,
} from '../../graphql/machine'
import * as messageActions from '../../actions/message'
import filter from 'ramda/src/filter'

function MachineEditProvisioning_({ fields, fieldErrors, ...props }) {
  return (
    <div>
      <Header>
        <Heading tag="h2">Edit Provisioning</Heading>
      </Header>
      <Form>
        <FormFields>
          <fieldset>
            <FormField
              label="Subarchitecture"
              help={null}
              error={props.showFieldErrors && fieldErrors.subarchId}
            >
              <Select
                options={props.machine.arch ? props.machine.arch.subarchs : []}
                value={fields.subarchId}
                searchKeys={['name', 'description']}
                onChange={props.onChangeSubarchId}
                valueKey="id"
                labelFn={subarch =>
                  `${subarch.name} (${subarch.description || ''})`}
              />
            </FormField>
          </fieldset>
          <fieldset>
            <FormField
              label="Kernel"
              help={null}
              error={props.showFieldErrors && fieldErrors.kernelId}
            >
              <Select
                options={filter(
                  i =>
                    i.fileType === 'Kernel' &&
                    i.arch.id === props.machine.arch.id,
                  props.data.images.map(i => ({
                    ...i,
                    knownGoodText: i.knownGood ? 'known good' : '',
                  }))
                )}
                value={fields.kernelId}
                searchKeys={['filename', 'description', 'knownGoodText']}
                onChange={props.onChangeKernelId}
                valueKey="id"
                labelFn={image =>
                  `${image.description} (${image.filename})${image.knownGood
                    ? ' - known good'
                    : ''}`}
              />
            </FormField>

            <FormField
              label="Kernel cmdline"
              help={null}
              error={props.showFieldErrors && fieldErrors.kernelOpts}
            >
              <TextInput
                value={fields.kernelOpts}
                onDOMChange={props.onChangeKernelOpts}
              />
            </FormField>
          </fieldset>
          <fieldset>
            <FormField
              label="Initrd"
              help={null}
              error={props.showFieldErrors && fieldErrors.initrdId}
            >
              <Select
                options={filter(
                  i =>
                    i.fileType === 'Initrd' &&
                    i.arch.id === props.machine.arch.id,
                  props.data.images.map(i => ({
                    ...i,
                    knownGoodText: i.knownGood ? 'known good' : '',
                  }))
                )}
                value={fields.initrdId}
                searchKeys={['filename', 'description', 'knownGoodText']}
                onChange={props.onChangeInitrdId}
                valueKey="id"
                labelFn={image =>
                  `${image.description} (${image.filename})${image.knownGood
                    ? ' - known good'
                    : ''}`}
              />
            </FormField>
          </fieldset>
          <fieldset>
            <FormField
              label="Preseed"
              help={null}
              error={props.showFieldErrors && fieldErrors.preseedId}
            >
              <Select
                options={props.data.preseeds.map(p => ({
                  ...p,
                  knownGoodText: p.knownGood ? 'known good' : '',
                }))}
                value={fields.preseedId}
                searchKeys={[
                  'filename',
                  'description',
                  'knownGoodText',
                  'fileType',
                ]}
                onChange={props.onChangePreseedId}
                valueKey="id"
                labelFn={preseed =>
                  `${preseed.description} - ${preseed.fileType}${preseed.knownGood
                    ? ' - known good'
                    : ''}`}
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
  kernelId: {
    defaultValue: ({ machine }) => (machine.kernel ? machine.kernel.id : null),
    accessor: e => e,
  },
  kernelOpts: {
    defaultValue: ({ machine }) => machine.kernelOpts || '',
    accessor: e => e.target.value,
  },
  initrdId: {
    defaultValue: ({ machine }) => (machine.initrd ? machine.initrd.id : null),
    accessor: e => e,
  },
  preseedId: {
    defaultValue: ({ machine }) =>
      machine.preseed ? machine.preseed.id : null,
    accessor: e => e,
  },
  subarchId: {
    defaultValue: ({ machine }) =>
      machine.subarch ? machine.subarch.id : null,
    accessor: e => e,
  },
}

const validationRules = {
  kernelOpts: [
    Validator(
      validateLength({ min: 0, max: 1024 }),
      'Must be between 0 and 1024 characters long'
    ),
    Validator(validateAscii, 'Must contain only ASCII characters'),
  ],
}

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ ...messageActions }, dispatch),
})

const mutationHandlers = {
  mutationResponse: ({ actions, onDone = null }) => ({
    data: { changeMachineProvisioning: { ok, machine, errors } },
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

export const MachineEditProvisioning = compose(
  graphql(machineNewGQL, { options: { notifyOnNetworkStatusChange: true } }),
  graphql(changeMachineProvisioningGQL, {
    name: 'changeMachineProvisioning',
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
    'changeMachineProvisioning',
    'mutationResponse',
    'mutationFailed',
    mapFieldsToVars
  ),
  withApolloStatus(NetworkLoading, NetworkError)
)(MachineEditProvisioning_)

export default MachineEditProvisioning

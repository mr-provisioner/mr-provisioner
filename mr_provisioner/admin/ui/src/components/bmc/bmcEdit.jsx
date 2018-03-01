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
import { changeBmcGQL, bmcGQL } from '../../graphql/bmc'
import * as messageActions from '../../actions/message'

function BmcEdit_({ fields, fieldErrors, ...props }) {
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
              label="Type"
              help={null}
              error={props.showFieldErrors && fieldErrors.bmcType}
            >
              <Select
                required={true}
                options={[
                  { name: 'plain' },
                  { name: 'moonshot' },
                  { name: 'libvirt_bmc' },
                ]}
                value={fields.bmcType}
                searchKeys={['name']}
                onChange={props.onChangeBmcType}
                valueKey="name"
                labelFn={t => t.name}
              />
            </FormField>
          </fieldset>
          <fieldset>
            <FormField
              label="IP"
              help={null}
              error={props.showFieldErrors && fieldErrors.ip}
            >
              <TextInput value={fields.ip} onDOMChange={props.onChangeIp} />
            </FormField>
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
              label="Password"
              help={null}
              error={props.showFieldErrors && fieldErrors.password}
            >
              <TextInput
                value={fields.password}
                onDOMChange={props.onChangePassword}
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
  name: { defaultValue: ({ bmc }) => bmc.name, accessor: e => e.target.value },
  bmcType: { defaultValue: ({ bmc }) => bmc.bmcType, accessor: e => e },
  ip: { defaultValue: ({ bmc }) => bmc.ip, accessor: e => e.target.value },
  username: {
    defaultValue: ({ bmc }) => bmc.username,
    accessor: e => e.target.value,
  },
  password: {
    defaultValue: ({ bmc }) => bmc.password,
    accessor: e => e.target.value,
  },
}

const validationRules = {
  name: [
    Validator(
      validateLength({ min: 2, max: 256 }),
      'Must be between 2 and 256 characters long'
    ),
    Validator(validateAscii, 'Must contain only ASCII characters'),
  ],
  ip: [Validator(f => validator.isIP(f), 'Must be a valid IP')],
  username: [
    Validator(
      validateLength({ min: 0, max: 256 }),
      'Must be between 0 and 256 characters long'
    ),
  ],
  password: [
    Validator(
      validateLength({ min: 0, max: 256 }),
      'Must be between 0 and 256 characters long'
    ),
  ],
}

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ ...messageActions }, dispatch),
})

const mutationHandlers = {
  mutationResponse: ({ actions, onDone = null }) => ({
    data: { changeBmc: { ok, bmc, errors } },
  }) => {
    if (ok && errors.length > 0)
      actions.showWarningMessage(
        `Changes to ${bmc.name} saved, but: ${errors.join(', ')}.`
      )
    else if (ok)
      actions.showOkMessage(`Changes to ${bmc.name} saved successfully.`)
    else actions.showErrorMessage(`Error saving changes: ${errors.join(', ')}.`)

    if (ok && onDone) onDone()
  },
  mutationFailed: ({ actions }) => error =>
    actions.showErrorMessage(error.message || error),
}

const mapFieldsToVars = (fields, props) => ({
  id: props.bmc.id,
  ...fields,
})

export const BmcEdit = compose(
  graphql(changeBmcGQL, {
    name: 'changeBmc',
    options: ({ match, bmc }) => ({
      refetchQueries: [
        {
          query: bmcGQL,
          variables: {
            id: bmc.id,
          },
        },
      ],
    }),
  }),
  connect(null, mapDispatchToProps),
  withHandlers(mutationHandlers),
  withForm(formFields, validationRules),
  withSubmit('changeBmc', 'mutationResponse', 'mutationFailed', mapFieldsToVars)
)(BmcEdit_)

export default BmcEdit

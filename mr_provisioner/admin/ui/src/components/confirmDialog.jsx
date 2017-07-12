import React from 'react'
import Header from 'grommet/components/Header'
import Heading from 'grommet/components/Heading'
import Form from 'grommet/components/Form'
import FormField from 'grommet/components/FormField'
import FormFields from 'grommet/components/FormFields'
import CheckBox from 'grommet/components/CheckBox'
import Button from 'grommet/components/Button'
import Footer from 'grommet/components/Footer'
import withForm from '../hoc/withForm'
import withSubmit from '../hoc/withSubmit'
import { compose, withProps } from 'recompose'
import { Validator } from '../util/validation'

function ConfirmDialog_(props) {
  return (
    <div>
      <Header>
        <Heading tag="h2">
          {props.title}
        </Heading>
      </Header>
      <Form>
        <FormFields>
          <fieldset>
            <p>
              {props.text}
            </p>
            {props.confirmation &&
              <FormField
                help={null}
                error={props.showFieldErrors && props.fieldErrors.confirmation}
              >
                <CheckBox
                  checked={props.fields.confirmation}
                  onChange={props.onChangeConfirmation}
                  label={props.confirmation}
                />
              </FormField>}
          </fieldset>
        </FormFields>
        <Footer pad={{ vertical: 'medium' }} justify="between">
          <Button
            label={props.actionText || 'Confirm'}
            type="submit"
            critical={true}
            primary={true}
            onClick={props.handleSubmit}
          />

          {props.onCancel &&
            <Button
              label={props.cancelText || 'Cancel'}
              primary={true}
              onClick={props.onCancel}
            />}
        </Footer>
      </Form>
    </div>
  )
}

const formFields = {
  confirmation: { defaultValue: false, accessor: e => e.target.checked },
}

const validationRules = props =>
  props.confirmation
    ? {
        confirmation: [Validator(v => v, 'required')],
      }
    : {}

export const ConfirmDialog = (
  mutationName,
  mutationSuccessAction,
  mutationFailedAction,
  mapFieldsToVars = null,
  otherProps = {}
) =>
  compose(
    withProps(otherProps),
    withForm(formFields, validationRules),
    withSubmit(
      mutationName,
      mutationSuccessAction,
      mutationFailedAction,
      mapFieldsToVars
    )
  )(ConfirmDialog_)

export default ConfirmDialog

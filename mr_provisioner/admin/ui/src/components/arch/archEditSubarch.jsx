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
import { validateLength, validateAscii } from '../../util/validators'
import validator from 'validator'
import { changeSubarchGQL, archGQL } from '../../graphql/arch'
import { imagesListGQL } from '../../graphql/image'
import * as messageActions from '../../actions/message'
import filter from 'ramda/src/filter'

function ArchEditSubarch_({
  fields,
  fieldErrors,
  data: { images } = {},
  ...props
}) {
  return (
    <div>
      <Header>
        <Heading tag="h2">Edit subarchitecture</Heading>
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
              label="Description"
              help={null}
              error={props.showFieldErrors && fieldErrors.description}
            >
              <TextInput
                value={fields.description}
                onDOMChange={props.onChangeDescription}
              />
            </FormField>
          </fieldset>

          <fieldset>
            <FormField
              label="Bootloader"
              help={null}
              error={props.showFieldErrors && fieldErrors.bootloaderId}
            >
              <Select
                options={filter(
                  i =>
                    i.fileType === 'bootloader' && i.arch.id === props.arch.id,
                  images.map(i => ({
                    ...i,
                    knownGoodText: i.knownGood ? 'known good' : '',
                  }))
                )}
                value={fields.bootloaderId}
                searchKeys={['filename', 'description', 'knownGoodText']}
                onChange={props.onChangeBootloaderId}
                valueKey="id"
                labelFn={image =>
                  `${image.description} (${image.filename})${image.knownGood
                    ? ' - known good'
                    : ''}`}
              />
            </FormField>
          </fieldset>
        </FormFields>
        <Footer pad={{ vertical: 'medium' }}>
          <Button
            label="Edit subarchitecture"
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
    defaultValue: ({ subarch }) => subarch.name,
    accessor: e => e.target.value,
  },
  description: {
    defaultValue: ({ subarch }) => subarch.description || '',
    accessor: e => e.target.value,
  },
  bootloaderId: {
    defaultValue: ({ subarch }) =>
      subarch.bootloader ? subarch.bootloader.id : null,
    accessor: e => e,
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
  description: [
    Validator(
      validateLength({ min: 0, max: 256 }),
      'Must be between 0 and 256 characters long'
    ),
    Validator(validateAscii, 'Must contain only ASCII characters'),
  ],
}

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ ...messageActions }, dispatch),
})

const mutationHandlers = {
  mutationResponse: ({ actions, onDone = null }) => ({
    data: { changeSubarch: { ok, subarch, errors } },
  }) => {
    if (ok && errors.length > 0)
      actions.showWarningMessage(
        `Subarchitecture ${subarch.name} added successfully, but: ${errors.join(
          ', '
        )}.`
      )
    else if (ok)
      actions.showOkMessage(
        `Subarchitecture ${subarch.name} added successfully.`
      )
    else
      actions.showErrorMessage(
        `Error adding subarchitecture: ${errors.join(', ')}.`
      )

    if (ok && onDone) onDone()
  },
  mutationFailed: ({ actions }) => error =>
    actions.showErrorMessage(error.message || error),
}

const mapFieldsToVars = (fields, props) => ({
  id: props.subarch.id,
  ...fields,
})

export const ArchEditSubarch = compose(
  graphql(imagesListGQL, { options: { notifyOnNetworkStatusChange: true } }),
  graphql(changeSubarchGQL, {
    name: 'changeSubarch',
    options: ({ match, arch }) => ({
      refetchQueries: [
        {
          query: archGQL,
          variables: {
            id: arch.id,
          },
        },
      ],
    }),
  }),
  connect(null, mapDispatchToProps),
  withHandlers(mutationHandlers),
  withForm(formFields, validationRules),
  withSubmit(
    'changeSubarch',
    'mutationResponse',
    'mutationFailed',
    mapFieldsToVars
  ),
  withApolloStatus(NetworkLoading, NetworkError)
)(ArchEditSubarch_)

export default ArchEditSubarch

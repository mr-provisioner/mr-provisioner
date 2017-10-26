import React from 'react'
import Box from 'grommet/components/Box'
import Button from 'grommet/components/Button'
import ClearIcon from 'grommet/components/icons/base/Clear'
import SaveIcon from 'grommet/components/icons/base/Save'
import Label from 'grommet/components/Label'
import { graphql } from 'react-apollo'
import { withHandlers, withState, compose } from 'recompose'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { preseedGQL, changePreseedContentsGQL } from '../../graphql/preseed'
import * as messageActions from '../../actions/message'
import CodeMirror from 'react-codemirror'

function PreseedEditContents_(props) {
  const { content, onChange, onSave, onCancel } = props

  const options = {
    lineNumbers: true,
  }

  return (
    <div>
      <p>
        <a href="http://jinja.pocoo.org/docs/2.9/templates/">Jinja2</a>{' '}
        templating can be used in a preseed. The following variables are
        available:
      </p>
      <dl>
        <dt>
          <code>ssh_keys</code>
        </dt>
        <dd>
          is a list of all the ssh keys of all the assignees of a machine.
        </dd>
        <dt>
          <code>interfaces</code>
        </dt>
        <dd>
          is a list of interfaces of a machine that have a static IP configured.
          Each interface in the list has a <i>name</i> attribute matching the
          interface identifier, <i>static_ipv4</i> attribute with the configured
          static IPv4 and a <i>netmask</i> attribute with the netmask.
        </dd>
        <dt>
          <code>hostname</code>
        </dt>
        <dd>is the machine (host)name.</dd>
        <dt>
          <code>kernel_name</code>
        </dt>
        <dd>is the name of the kernel assigned to the machine.</dd>
        <dt>
          <code>kernel_description</code>
        </dt>
        <dd>is the description of the kernel assigned to the machine.</dd>
        <dt>
          <code>initrd_name</code>
        </dt>
        <dd>is the name of the initrd assigned to the machine.</dd>
        <dt>
          <code>initrd_description</code>
        </dt>
        <dd>is the description of the initrd assigned to the machine.</dd>
      </dl>
      <CodeMirror value={content} onChange={onChange} options={options} />
      <Box pad={{ vertical: 'medium', between: 'medium' }} direction="row">
        <Button
          icon={<SaveIcon />}
          label="Save changes"
          onClick={onSave}
          plain={false}
        />

        <Button
          icon={<ClearIcon />}
          label="Cancel changes"
          onClick={onCancel}
          plain={false}
        />
      </Box>
    </div>
  )
}

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ ...messageActions }, dispatch),
})

const PreseedEditContents = compose(
  graphql(changePreseedContentsGQL, {
    name: 'preseedContentMutation',
    options: ({ preseed }) => ({
      refetchQueries: [
        {
          query: preseedGQL,
          variables: { id: preseed.id },
        },
      ],
    }),
  }),
  connect(null, mapDispatchToProps),
  withState('content', 'updateContent', props => props.preseed.fileContent),
  withHandlers({
    onChange: props => newContent => props.updateContent(newContent),
    onSave: ({ onDone, actions, ...props }) => () => {
      props
        .preseedContentMutation({
          variables: {
            id: props.preseed.id,
            fileContent: props.content,
          },
        })
        .then(
          ({ data: { changePreseedContents: { ok, preseed, errors } } }) => {
            if (ok && errors.length > 0)
              actions.showWarningMessage(
                `Changes to preseed ${preeed.filename} saved, but: ${errors.join(
                  ', '
                )}.`
              )
            else if (ok)
              actions.showOkMessage(
                `Changes to preseed ${preseed.filename} saved successfully.`
              )
            else
              actions.showErrorMessage(
                `Error changing contents of preseed ${preseed.filename}: ${errors.join(
                  ', '
                )}.`
              )

            if (ok && onDone) onDone()
          }
        )
        .catch(error => {
          actions.showErrorMessage(error.message || error)
        })
    },
  })
)(PreseedEditContents_)

export default PreseedEditContents

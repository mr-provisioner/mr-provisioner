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
import { changeOwnSshKeyGQL, selfGQL } from '../../graphql/self'
import * as messageActions from '../../actions/message'
import CodeMirror from 'react-codemirror'

function SelfEditSSHKey_(props) {
  const { content, onChange, onSave, onCancel } = props

  const options = {
    lineNumbers: true,
  }

  return (
    <div>
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

const SelfEditSSHKey = compose(
  graphql(changeOwnSshKeyGQL, {
    name: 'sshKeyMutation',
    options: {
      refetchQueries: [
        {
          query: selfGQL,
        },
      ],
    },
  }),
  connect(null, mapDispatchToProps),
  withState('content', 'updateContent', props => props.ownUser.sshKey),
  withHandlers({
    onChange: props => newContent => props.updateContent(newContent),
    onSave: ({ actions, onDone, ...props }) => () => {
      props
        .sshKeyMutation({
          variables: {
            sshKey: props.content,
          },
        })
        .then(({ data: { changeOwnSshKey: { ok, errors } } }) => {
          if (ok && errors.length > 0)
            actions.showWarningMessage(
              `Changes to SSH keys saved, but: ${errors.join(', ')}.`
            )
          else if (ok)
            actions.showOkMessage(`Changes to SSH keys saved successfully.`)
          else
            actions.showErrorMessage(
              `Error changing SSH keys: ${errors.join(', ')}.`
            )

          if (ok && onDone) onDone()
        })
        .catch(error => {
          actions.showErrorMessage(error.message || error)
        })
    },
  })
)(SelfEditSSHKey_)

export default SelfEditSSHKey

import React from 'react'
import { Motion, spring } from 'react-motion'
import Notification from 'grommet/components/Notification'
import { compose, branch, renderComponent, renderNothing } from 'recompose'
import { connect } from 'react-redux'
import { expireMessage } from '../actions/message'

const outerDivStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 100,
}

const innerDivStyle = {
  minHeight: '72px',
  alignItems: 'center',
}

function Notifications_(props) {
  return (
    <div style={outerDivStyle}>
      <div style={innerDivStyle}>
        {props.messages.map(({ message, type, id }) =>
          <Motion
            key={id}
            defaultStyle={{ opacity: 0 }}
            style={{ opacity: spring(1) }}
          >
            {style =>
              <Notification
                key={id}
                style={style}
                message={message}
                status={type}
                closer={true}
                onClose={() => props.actions.expireMessage(id)}
                size="small"
                pad="small"
                separator="top"
              />}
          </Motion>
        )}
      </div>
    </div>
  )
}

const mapStateToProps = (state, ownProps) => ({
  messages: state.messages,
})

const mapDispatchToProps = dispatch => ({
  actions: {
    expireMessage: id => dispatch(expireMessage(id)),
  },
})

export const Notifications = compose(
  connect(mapStateToProps, mapDispatchToProps),
  branch(
    props => props.messages.length > 0,
    renderComponent(Notifications_),
    renderNothing
  )
)(Notifications_)

export default Notifications

import React from 'react'
import Notification from 'grommet/components/Notification'
import Spinning from 'grommet/components/icons/Spinning'

export const NetworkLoading = ({ data }) => <Spinning size="large" />

export const NetworkError = ({ data }) =>
  <Notification
    state={data.error.message}
    message="Network Error"
    status="critical"
    size="medium"
  />

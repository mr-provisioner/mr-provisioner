import React from 'react'
import PropTypes from 'prop-types'
import Layer_ from 'grommet/components/Layer'
import {
  branch,
  compose,
  renderComponent,
  renderNothing,
  withContext,
  getContext,
} from 'recompose'
import { omitProps } from '../hoc/util'

const ProperLayerOuter = branch(
  props => props.show,
  compose(omitProps('show'), renderComponent(Layer_)),
  renderNothing
)(Layer_)

const ProperLayerContents = withContext(
  {
    client: PropTypes.any,
  },
  props => ({
    client: props.client,
  })
)(props => React.Children.only(props.children))

export const Layer = getContext({
  client: PropTypes.any,
})(props =>
  <ProperLayerOuter {...props}>
    <ProperLayerContents client={props.client}>
      {React.Children.only(props.children)}
    </ProperLayerContents>
  </ProperLayerOuter>
)

export default Layer

import omit from 'ramda/src/omit'
import pick from 'ramda/src/pick'
import { mapProps } from 'recompose'

export const omitProps = (...keys) => mapProps(props => omit(keys, props))
export const pickProps = (...keys) => mapProps(props => pick(keys, props))

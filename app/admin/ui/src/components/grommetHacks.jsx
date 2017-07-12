import Select_ from 'grommet/components/Select'
import TextInput_ from 'grommet/components/TextInput'

// XXX: hack in handling of option.label in _renderValue since it hasn't landed
//      on npm yet.
export class Select extends Select_ {
  _renderValue(option) {
    const { intl } = this.context
    if (Array.isArray(option)) {
      return super._renderValue(option)
    } else if (option && typeof option === 'object') {
      return option.label || option.value || ''
    } else {
      return undefined === option || null === option ? '' : option
    }
  }
}

export class TextInput2 extends TextInput_ {
  _onFocus(event) {
    const { onFocus, suggestions } = this.props
    this.setState({
      focused: true,
      dropActive: !!suggestions,
      activeSuggestionIndex: -1,
    })

    if (onFocus) {
      onFocus(event)
    }
  }
}

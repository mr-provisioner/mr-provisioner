import React from 'react'
import { Select as Select_ } from './grommetHacks'
import Fuse from 'fuse.js'
import { escapeRegExp } from '../util/index'

export class Select extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      searchText: '',
    }
  }

  componentWillReceiveProps(nextProps) {}

  handleSearch = ev => this.setState({ searchText: ev.target.value })

  getFilteredData = () => {
    if (this.state.searchText.length === 0) {
      return this.props.options
    }

    let fuse = new Fuse(this.props.options, {
      shouldSort: true,
      caseSensitive: false,
      minMatchCharLength: 0,
      location: 0,
      distance: 25,
      tokenize: true,
      threshold: 0.4,
      keys: this.props.searchKeys,
    })

    let filteredData = fuse.search(escapeRegExp(this.state.searchText))

    return filteredData
  }

  handleChange = ev => this.props.onChange(ev.option.value)

  render() {
    let options = this.getFilteredData().map(opt => ({
      label: this.props.labelFn(opt),
      value: opt[this.props.valueKey],
    }))

    if (this.state.searchText.length === 0 && !this.props.required) {
      options = Array.concat(
        [
          {
            value: null,
            label: 'None',
          },
        ],
        options
      )
    }

    const match = options.find(opt => opt.value === this.props.value)

    return (
      <Select_
        options={options}
        value={match}
        onSearch={this.handleSearch}
        onChange={this.handleChange}
      />
    )
  }
}

export default Select

import React from 'react'
import FormField from 'grommet/components/FormField'
import Box from 'grommet/components/Box'
import Label from 'grommet/components/Label'
import NumberInput from 'grommet/components/NumberInput'
import validator from 'validator'

class BMCInfoFieldMoonshot extends React.Component {
  handleCartridgeChange = ev => {
    this.props.onChange('' + ev.target.value)
  }

  render() {
    const { showFieldErrors, value, error, ...props } = this.props

    const cartridge = parseInt(value || '0', 10)
    const cartridgeError = error && error.cartridge

    return (
      <div>
        <FormField
          label="Cartridge number"
          help={null}
          error={showFieldErrors && cartridgeError}
        >
          <NumberInput
            min={0}
            max={95}
            value={cartridge}
            onChange={this.handleCartridgeChange}
          />
        </FormField>
      </div>
    )
  }
}

const validateBmcInfoMoonshot = field => {
  let ok = true
  let message = {}

  if (!validator.isInt(field, { min: 0, max: 95 })) {
    ok = false
    message.cartridge = 'Catridge number must be between 0 and 95'
  }

  return [ok, message]
}

export function BMCInfoField({ bmc, ...otherProps }) {
  if (bmc && bmc.bmcType === 'moonshot')
    return <BMCInfoFieldMoonshot {...otherProps} />
  else return null
}

export const validateBmcInfo = (field, { bmcId }, bmcs) => {
  const bmc = bmcs.find(b => b.id === bmcId)

  if (bmc && bmc.bmcType === 'moonshot')
    return validateBmcInfoMoonshot(field, bmc)
  else return [true, null]
}

function BMCInfoMoonshot({ bmc, bmcInfo }) {
  const cartridge = parseInt(bmcInfo || '0', 10)

  return (
    <div>
      <Box justify="between" direction="row" pad="small">
        <span>
          <Label>Cartridge</Label>
        </span>
        <span className="secondary">
          {cartridge}
        </span>
      </Box>
    </div>
  )
}

export function BMCInfo({ bmc, bmcInfo, ...otherProps }) {
  if (bmc && bmc.bmcType === 'moonshot')
    return <BMCInfoMoonshot bmc={bmc} bmcInfo={bmcInfo} {...otherProps} />
  else return null
}

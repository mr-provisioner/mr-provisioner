export const netConfigType = (intf, bmc = false) =>
  (bmc || intf.network) && intf.staticIpv4
    ? 'static'
    : intf.network && intf.reservedIpv4 ? 'dynamic-reserved' : 'dynamic'

export const netConfigIpv4 = (intf, bmc = false) => {
  const configType = netConfigType(intf, bmc)
  return configType === 'static'
    ? intf.staticIpv4 || ''
    : configType === 'dynamic-reserved' ? intf.reservedIpv4 || '' : ''
}

export const netName = intf =>
  intf.network ? `${intf.network.name} (${intf.network.subnet})` : ''

import React from 'react'
import withOwnUser from '../hoc/withOwnUser'

export const perms = {
  BMC_ADMIN: '@@perm/bmcs/admin',
  USER_ADMIN: '@@perms/users/admin',
  MACHINE_ADMIN: '@@perms/machines/admin',
  MACHINE_USER: '@@perms/machines/user',
  IMAGE_ADMIN: '@@perms/images/admin',
  IMAGE_OWNER: '@@perms/images/owner',
  PRESEED_ADMIN: '@@perms/preseed/admin',
  PRESEED_OWNER: '@@perms/preseed/owner',
  NETWORK_ADMIN: '@@perms/network/admin',
  ARCH_ADMIN: '@@perms/arch/admin',
}

export function check(self, privLevel, entity) {
  if (self.admin) return true

  switch (privLevel) {
    case perms.MACHINE_USER:
      return !!entity.assignments.find(a => a.user.id === self.id)

    case perms.PRESEED_OWNER:
    case perms.IMAGE_OWNER:
      return entity.user.id === self.id

    default:
      return false
  }

  return false
}

function Check_({ ownUser, permission, entity, children }) {
  if (check(ownUser, permission, entity)) {
    return React.Children.count(children) === 1 &&
    React.isValidElement(children)
      ? React.Children.only(children)
      : <div>
          {children}
        </div>
  } else {
    return null
  }
}

export const Check = withOwnUser()(Check_)

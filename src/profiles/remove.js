const inq = require('inquirer')
const chk = require('chalk')
const utils = require('../utils')
const profileUtils = require('./utils')

module.exports = async function removeProfile (env, opts = {}) {
  utils.log.p()
  const { global, local } = opts
  let name = env
  let profile

  const { profiles, scope } = await profileUtils.getScopedProfiles(global, local, 'remove')

  if (name) {
    if (!Object.keys(profiles).includes(name)) throw new Error(`Profile ${name} does not exist!`)
    profile = { ...profiles[name], name }
  } else {
    profile = await profileUtils.selectProfile(profiles, 'Which profile would you like to remove?')
    name = profile.name
  }

  const message = `Are you sure you want to remove the profile ${chk.cyan(name)}?`

  const confirm = await inq.prompt([
    {
      type: 'confirm',
      message,
      default: false,
      name: 'remove',
    },
  ])

  if (!confirm.remove) return false

  delete profiles[name]

  if (scope === 'local') profileUtils.writeLocalProfiles(profiles)
  else profileUtils.writeGlobalProfiles(profiles)

  return utils.log.s(`Profile ${chk.cyan(name)} successfully removed!`, 2)
}

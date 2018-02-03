const inq = require('inquirer')
const chk = require('chalk')
const { log } = require('../utils')

const {
  getScopedProfiles,
  selectProfile,
  writeGlobalProfiles,
  writeLocalProfiles,
} = require('./utils')

module.exports = async function removeProfile (env, opts) {
  log.p()
  const { global, local } = opts
  let name = env
  let profile

  const { profiles, scope } = await getScopedProfiles(global, local, 'remove')

  if (name) {
    if (!Object.keys(profiles).includes(name)) throw new Error(`Profile ${name} does not exist!`)
    profile = { ...profiles[name], name }
  } else {
    profile = await selectProfile(profiles, 'Which profile would you like to remove?')
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

  if (scope === 'local') writeLocalProfiles(profiles)
  else writeGlobalProfiles(profiles)

  return log.s(`Profile ${chk.cyan(name)} successfully removed!`, 2)
}

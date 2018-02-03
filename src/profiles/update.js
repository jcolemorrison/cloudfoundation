const inq = require('inquirer')
const chk = require('chalk')
const { log } = require('../utils')

const {
  getScopedProfiles,
  selectProfile,
  writeGlobalProfiles,
  writeLocalProfiles,
} = require('./utils')

module.exports = async function updateProfile (env, opts) {
  log.p()
  const { global, local } = opts
  let name = env
  let profile

  const { profiles, scope } = await getScopedProfiles(global, local, 'update')

  if (name) {
    if (!Object.keys(profiles).includes(name)) throw new Error(`Profile ${name} does not exist!`)
    profile = { ...profiles[name], name }
  } else {
    profile = await selectProfile(profiles, 'Which profile would you like to update?')
    name = profile.name
  }

  const { aws_access_key_id, aws_secret_access_key, region } = profile

  const update = await inq.prompt([
    {
      type: 'input',
      name: 'aws_access_key_id',
      message: `Change ${chk.cyan(name)}'s aws_access_key_id to:`,
      default: aws_access_key_id,
    },
    {
      type: 'input',
      name: 'aws_secret_access_key',
      message: `Change ${chk.cyan(name)}'s aws_secret_access_key to:`,
      default: aws_secret_access_key,
    },
    {
      type: 'input',
      name: 'region',
      message: `Change ${chk.cyan(name)}'s region to:`,
      default: region,
    },
  ])

  const updatedProfiles = {
    ...profiles,
    [name]: {
      ...update,
    },
  }

  if (scope === 'local') writeLocalProfiles(updatedProfiles)
  else writeGlobalProfiles(updatedProfiles)

  return log.s(`Profile ${chk.cyan(name)} successfully updated!`, 2)
}

const inq = require('inquirer')
const chk = require('chalk')
const utils = require('../utils')
const profileUtils = require('./utils')

exports.updateProfileInquiry = async function updateProfileInquiry (profile, name) {
  const { aws_access_key_id, aws_secret_access_key, region } = profile

  return inq.prompt([
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
}

exports.updateProfile = async function updateProfile (env, opts) {
  utils.log.p()
  const { global, local } = opts || {}
  let name = env
  let profile

  const { profiles, scope } = await profileUtils.getScopedProfiles(global, local, 'update')

  if (name) {
    if (!Object.keys(profiles).includes(name)) throw new Error(`Profile ${name} does not exist!`)
    profile = { ...profiles[name], name }
  } else {
    profile = await profileUtils.selectProfile(profiles, 'Which profile would you like to update?')
    name = profile.name
  }

  const update = await exports.updateProfileInquiry(profile, name)

  const updatedProfiles = {
    ...profiles,
    [name]: {
      ...update,
    },
  }

  if (scope === 'local') profileUtils.writeLocalProfiles(updatedProfiles)
  else profileUtils.writeGlobalProfiles(updatedProfiles)

  return utils.log.s(`Profile ${chk.cyan(name)} successfully updated!`, 2)
}

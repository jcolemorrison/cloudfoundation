const os = require('os')
const chk = require('chalk')
const { log } = require('../utils')

const {
  getScopedProfiles,
  selectProfile,
  importAWSProfile,
  setupCFDNProfile,
  writeGlobalProfiles,
  writeLocalProfiles,
} = require('./utils')

module.exports = async function updateProfile (env, opts) {
  log.p()
  const name = env
  const { global, local } = opts
  let profile

  const { profiles, scope } = await getScopedProfiles(global, local)

  if (name) {
    if (!Object.keys(profiles).includes(name)) throw new Error(`Profile ${name} does not exist!`)
    profile = { ...profiles[name], name }
  } else {
    profile = await selectProfile(profiles, 'Which profile would you like to update?')
  }

  // Next up - inquirer them to update the keys and region.  I don't think we let them update names
  // The only question left is whether or not we turn the above into something reusable.
  // This way getting the profile of interest comes down to just a one liner...
  // However, until we see this flow needed again, we're not going to mess with that.

  return console.log(profile)
}

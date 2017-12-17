const { getAWSCreds, log } = require('../utils')

function getProfileData (file, isConfig) {
  const data = file.split(/\r?\n/)

  let profile

  const profiles = data.reduce((prev, curr, i) => {
    const line = curr.split(/(^|\s)[;#]/)[0]
    const prof = curr.match(/^\s*\[([^[\]]+)\]\s*$/)

    if (prof) {
      let [, p] = prof

      if (isConfig) p = p.replace(/^profile\s/, '')

      profile = p
    } else if (profile) {
      const val = line.match(/^\s*(.+?)\s*=\s*(.+?)\s*$/)

      if (val) {
        const [, k, v] = val

        prev[profile] = prev[profile] || {}

        prev[profile][k] = v
      }
    }

    return prev
  }, {})

  return profiles
}

function mergeProfileData (profiles, regions) {
  const keys = Object.keys(profiles)

  return keys.reduce((prev, curr) => {
    const full = Object.assign({}, profiles[curr], regions[curr])
    prev[curr] = full
    return prev
  }, {})
}

module.exports = async () => {
  try {
    const { creds, config } = getAWSCreds()

    const profiles = getProfileData(creds)

    const regions = getProfileData(config, true)

    const full = mergeProfileData(profiles, regions)
    log.p(full)
  } catch (error) {
    throw error
  }
}

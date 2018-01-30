const chk = require('chalk')
const AWS = require('aws-sdk')
const os = require('os')
const fs = require('fs-extra')

const { log } = require('./index.js')

const { NO_AWS_CREDENTIALS } = require('./constants')

exports.configAWS = (profile) => {
  if (profile) {
    AWS.config.update({
      accessKeyId: profile.aws_access_key_id,
      secretAccessKey: profile.aws_secret_access_key,
      region: profile.region,
    })
  }

  if (!AWS.config.credentials.accessKeyId || !AWS.config.region) {
    const msg = `${chk.cyan('cfdn validate | deploy | update')} all require AWS Credentials (Access Key Id, Secret Key, Region) to be set.

${chk.white(`Please use ${chk.cyan('cfdn profiles')} to set up credentials OR configure the AWS CLI credentials.`)}

Crednetials setup via the AWS CLI are used otherwise, however you must set a region via ${chk.cyan('export AWS_REGION=region')}
`

    throw new Error(msg)
  }

  return AWS
}

exports.hasAWSCreds = (homedir) => {
  const home = homedir || os.homedir()
  const creds = fs.existsSync(`${home}/.aws/credentials`, 'utf8')
  const config = fs.existsSync(`${home}/.aws/config`, 'utf8')
  if (!creds && !config) return false
  return true
}

exports.getAWSCreds = (homedir) => {
  const home = homedir || os.homedir()
  let creds
  let config

  if (!exports.hasAWSCreds(home)) throw new Error(NO_AWS_CREDENTIALS)

  try {
    creds = fs.readFileSync(`${home}/.aws/credentials`, 'utf8')
    config = fs.readFileSync(`${home}/.aws/config`, 'utf8')
  } catch (error) {
    throw error
  }

  return { creds, config }
}
exports.parseAWSCreds = (file, isConfig) => {
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

exports.mergeAWSCreds = (profiles, regions) => {
  const keys = Object.keys(profiles)

  return keys.reduce((prev, curr) => {
    const full = Object.assign({}, profiles[curr], regions[curr])
    prev[curr] = full
    return prev
  }, {})
}

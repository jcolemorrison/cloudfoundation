const fs = require('fs-extra')
const chk = require('chalk')
const AWS = require('aws-sdk')

const { log } = console

exports.log = {
  e: log.bind(this, `${chk.red('error')}: `),
  s: log.bind(this, `${chk.green('success')}: `),
  i: log.bind(this, `${chk.magenta('info')}: `),
}

exports.validateJSON = (j) => {
  let check

  try {
    check = JSON.parse(j)
    if (check && typeof check === 'object') throw new Error(`${check} is not valid JSON`)
  } catch (error) {
    throw error
  }

  return check
}

exports.checkValidProject = (cmd) => {
  if (!fs.existsSync(`${process.cwd()}/.cfdnrc`)) {
    throw new Error(`${chk.red('error')}: ${chk.cyan(`cfdn ${cmd}`)} can only be run in a valid cfdn project`)
  }
}

exports.AWS = () => {
  let rc

  try {
    rc = fs.readFileSync(`${process.cwd()}/.cfdnrc`, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('.cfdnrc file not found!')
    throw error
  }

  rc = JSON.parse(rc)

  if (rc.AWS_ACCESS_KEY_ID && rc.AWS_SECRET_ACCESS_KEY) {
    AWS.config.update({
      accessKeyId: rc.AWS_ACCESS_KEY_ID,
      secretAccessKey: rc.AWS_SECRET_ACCESS_KEY,
    })
  }

  if (rc.AWS_REGION) {
    AWS.config.update({ region: rc.AWS_REGION })
  } else if (!process.env.AWS_REGION) {
    throw new Error(`${chk.red('error')}: Region required for AWS - Either set ${chk.cyan('AWS_REGION')} in your .cfdnrc file
    OR set the env variable in your shell session i.e. ${chk.cyan('export AWS_REGION=us-east-1')}`) 
  }

  return AWS
}

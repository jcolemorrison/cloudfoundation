const fs = require('fs-extra')
const chk = require('chalk')

const createRcFile = (input) => {

}

exports.checkValidProject = (dir, cmd) => {
  if (!fs.existsSync(`${dir}/.cfdnrc`)) {
    throw new Error(`${chk.red('error')} ${chk.cyan(`cfdn ${cmd}`)} can only be run in a valid cfdn project`)
  }
}

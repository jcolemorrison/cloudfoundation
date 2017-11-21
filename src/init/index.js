const inq = require('inquirer')
const chk = require('chalk')

module.exports = async function init (env, options) {
  console.log('executing')
  let answers, extras
  try {
    answers = await inq.prompt([
      {
        type: "input",
        name: "stackname",
        message: "What is the name of your stack?",
      },
      {
        type: "confirm",
        name: "vpc",
        message: "Would you like a production VPC?",
        default: true,
      }
    ])
  } catch (err) {
    console.log(err)
    return err
  }

  if (answers && answers.vpc) {
    try {
      extras = await inq.prompt([
        {
          type: "confirm",
          name: "bastion",
          message: "Would you like a bastion server for your VPC?",
          default: true,
        },
        {
          type: "confirm",
          name: "rds",
          message: "Would you like an encrypted, multi-AZ RDS Aurora Database?",
          default: true,
        }
      ])
    } catch (err) {
      console.log(err)
      return err
    }
  }

  console.log(answers, extras)
}
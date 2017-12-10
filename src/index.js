const cmd = require('commander')
const init = require('./init')
const build = require('./build')
const create = require('./create')
const validate = require('./validate')
const { checkValidProject } = require('./utils')


cmd.version('1.0.0')
  .description('a tool and foundation for building production cloudformation templates')

cmd
  .command('init')
  .description('initialize a new CloudFoundation project')
  .action(init)

// TODO: import and use checkValidProject here so that I don't have to sprinkle that everywhere

cmd
  .command('build [stackname]')
  .description('build down all CloudFormation templates')
  .action((e, o) => checkValidProject('build [stackname]', build, e, o))

cmd
  .command('create [stackname]')
  .description('create a new stack named <stackname>')
  .action((e, o) => checkValidProject('create [stackname]', create, e, o))

cmd
  .command('validate [stackname]')
  .description('validate [stackname] for both valid JSON and CloudFormation syntax')
  .action((e, o) => checkValidProject('validate [stackname]', validate, e, o))

cmd
  .command('deploy [stackname]')
  .description('deploy [stackname] template')
  .action((e, o) => checkValidProject('deploy [stackname]', () =>  console.log('temp'), e, o))

cmd
  .command('update <stackname>')
  .description('update <stackname> template')
  .action(() => {
    console.log('building')
  })

cmd
  .command('add <filepath>')
  .description('add an AWS resource to the specified file')
  .option('-r, --resource [resource]', 'exact name of the CFN resource to add to the file i.e. AWS::EC2::Instance')
  .action((env, options) => {
    console.log(env, options)
  })

cmd.parse(process.argv)

const validArgs = ['init', 'build', 'add', 'create', 'validate', 'deploy']
// console.log(cmd.args,  cmd._execs)

if (cmd.args.length < 1 || validArgs.indexOf(cmd.args[cmd.args.length - 1]._name) === -1) {
  cmd.help()
}

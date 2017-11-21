const cmd = require('commander')

cmd.version('1.0.0')
  .description('a tool and foundation for building production cloudformation templates')

cmd
  .command('init')
  .description('initialize a new CloudFoundation project')
  .action(() => {
    console.log('yep')
  })

cmd
  .command('build')
  .description('build down all CloudFormation templates\n')
  .action(() => {
    console.log('building')
  })

cmd.parse(process.argv)

const validArgs = ['init', 'build']
console.log(cmd.args,  cmd._execs)


if (cmd.args.length < 1 || cmd.args.length >= 1 && validArgs.indexOf(cmd.args[0]) === -1) {
  cmd.help()
}

/*
 * Copyright 2025 BigRack.dev
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { createCLI } from '../index';
import { success, error, info } from '../utils';

function generateBashCompletion(program: Command): string {
  const commands: string[] = [];
  const options: string[] = [];

  // Collect all commands and options
  function collectCommands(cmd: Command, prefix = '') {
    const name = prefix ? `${prefix} ${cmd.name()}` : cmd.name();

    // Add command
    commands.push(name);

    // Add options
    cmd.options.forEach((opt) => {
      const flags = opt.flags.split(',').map((f) => f.trim());
      flags.forEach((flag) => {
        if (flag.startsWith('--')) {
          options.push(flag.split(' ')[0]);
        } else if (flag.startsWith('-') && !flag.startsWith('--')) {
          options.push(flag);
        }
      });
    });

    // Recursively process subcommands
    cmd.commands.forEach((subcmd) => {
      collectCommands(subcmd, name);
    });
  }

  collectCommands(program);

  const uniqueCommands = [...new Set(commands)].sort();
  const uniqueOptions = [...new Set(options)].sort();

  return `# Bash completion for bigrack
_bigrack_completion() {
    local cur prev words cword
    COMPREPLY=()
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"
    words=("\${COMP_WORDS[@]}")
    cword="\${COMP_CWORD}"

    # Commands
    local commands="${uniqueCommands.join(' ')}"
    
    # Options
    local options="${uniqueOptions.join(' ')}"
    
    # Global options
    local global_opts="--verbose --quiet --json --help --version"
    
    # If current word starts with -, complete options
    if [[ "\${cur}" == -* ]]; then
        COMPREPLY=($(compgen -W "\${global_opts} \${options}" -- "\${cur}"))
        return 0
    fi
    
    # Complete commands
    COMPREPLY=($(compgen -W "\${commands}" -- "\${cur}"))
    return 0
}

complete -F _bigrack_completion bigrack
`;
}

function generateZshCompletion(program: Command): string {
  const topLevelCommands: string[] = [];
  const allOptions: string[] = [];
  const subcommandsMap: Map<string, string[]> = new Map();
  const commandOptionsMap: Map<string, string[]> = new Map();

  // Collect top-level commands and their subcommands
  function collectCommands(cmd: Command, prefix = '', isRoot = false) {
    const isTopLevel = !prefix && !isRoot;
    const cmdName = cmd.name();

    // Collect options for this command
    const cmdOptions: string[] = [];
    cmd.options.forEach((opt) => {
      const flags = opt.flags.split(',').map((f) => f.trim());
      flags.forEach((flag) => {
        const flagName = flag.split(' ')[0];
        if (flagName.startsWith('--') || (flagName.startsWith('-') && !flagName.startsWith('--'))) {
          cmdOptions.push(flagName);
          allOptions.push(flagName);
        }
      });
    });

    if (isRoot) {
      // Root command - collect its direct subcommands as top-level commands
      cmd.commands.forEach((subcmd) => {
        topLevelCommands.push(subcmd.name());
        const subcommands: string[] = [];
        const subCmdOptions: string[] = [];

        // Collect options for this subcommand
        subcmd.options.forEach((opt) => {
          const flags = opt.flags.split(',').map((f) => f.trim());
          flags.forEach((flag) => {
            const flagName = flag.split(' ')[0];
            if (
              flagName.startsWith('--') ||
              (flagName.startsWith('-') && !flagName.startsWith('--'))
            ) {
              subCmdOptions.push(flagName);
              allOptions.push(flagName);
            }
          });
        });

        commandOptionsMap.set(subcmd.name(), subCmdOptions);

        // Collect subcommands of this top-level command
        subcmd.commands.forEach((nestedSubcmd) => {
          subcommands.push(nestedSubcmd.name());
          collectCommands(nestedSubcmd, subcmd.name(), false);
        });

        if (subcommands.length > 0) {
          subcommandsMap.set(subcmd.name(), subcommands);
        }
      });
    } else if (isTopLevel) {
      // This shouldn't happen with the new logic, but keep for safety
      topLevelCommands.push(cmdName);
      commandOptionsMap.set(cmdName, cmdOptions);

      const subcommands: string[] = [];
      cmd.commands.forEach((subcmd) => {
        subcommands.push(subcmd.name());
        collectCommands(subcmd, cmdName, false);
      });
      if (subcommands.length > 0) {
        subcommandsMap.set(cmdName, subcommands);
      }
    } else {
      // Subcommand - store with full path
      const fullPath = `${prefix} ${cmdName}`;
      commandOptionsMap.set(fullPath, cmdOptions);

      // Collect nested subcommands
      const subcommands: string[] = [];
      cmd.commands.forEach((subcmd) => {
        subcommands.push(subcmd.name());
        collectCommands(subcmd, fullPath, false);
      });
      if (subcommands.length > 0) {
        subcommandsMap.set(fullPath, subcommands);
      }
    }
  }

  collectCommands(program, '', true);

  const globalOptions = ['--verbose', '--quiet', '--json', '--help', '--version'];
  const allOptionsList = [...allOptions, ...globalOptions];
  const uniqueOptions = [...new Set(allOptionsList)].sort();

  // Build zsh completion with hierarchical command support
  let completionCode = `#compdef bigrack

# Zsh completion for bigrack
_bigrack() {
    local curcontext="\${curcontext}" state line
    local -a commands subcommands options
    
    commands=(
${topLevelCommands.map((cmd) => `        "${cmd}"`).join('\n')}
    )
    
    options=(
${uniqueOptions.map((opt) => `        "${opt}"`).join('\n')}
    )
    
    _arguments -C \\
        "1:command:->commands" \\
        "*::arg:->args"
    
    case $state in
        commands)
            _describe -t commands 'bigrack command' commands
            ;;
        args)
            case $words[2] in`;

  // Add completion for each top-level command
  topLevelCommands.forEach((cmd) => {
    const subcommands = subcommandsMap.get(cmd);
    const cmdOptions = commandOptionsMap.get(cmd) || [];

    if (subcommands && subcommands.length > 0) {
      const optionsArgs =
        cmdOptions.length > 0
          ? cmdOptions.map((opt) => `"${opt}"`).join(' \\\n                        ')
          : '';
      const optionsLine = optionsArgs ? `${optionsArgs} \\\n                        ` : '';

      completionCode += `
                ${cmd})
                    subcommands=(
${subcommands.map((sub) => `                        "${sub}"`).join('\n')}
                    )
                    _arguments \\
                        ${optionsLine}"1:subcommand:->subcommands" \\
                        "*::arg:->subargs"
                    case $state in
                        subcommands)
                            _describe -t subcommands 'subcommand' subcommands
                            ;;
                        subargs)
                            _describe -t options 'option' options
                            ;;
                    esac
                    ;;`;
    } else {
      const optionsArgs =
        cmdOptions.length > 0
          ? cmdOptions.map((opt) => `"${opt}"`).join(' \\\n                        ')
          : '';
      const optionsLine = optionsArgs ? `${optionsArgs} \\\n                        ` : '';

      completionCode += `
                ${cmd})
                    _arguments \\
                        ${optionsLine}"*::arg:->args"
                    _describe -t options 'option' options
                    ;;`;
    }
  });

  completionCode += `
                *)
                    _describe -t options 'option' options
                    ;;
            esac
            ;;
    esac
}
`;

  return completionCode;
}

export const completionCommand = new Command('completion')
  .description('Generate shell completion scripts')
  .addCommand(
    new Command('bash').description('Generate bash completion script').action(() => {
      try {
        const program = createCLI();
        const script = generateBashCompletion(program);
        console.log(script);
        console.error('\n# To install, run:');
        console.error('#   bigrack completion bash > ~/.bigrack-completion.bash');
        console.error('#   echo "source ~/.bigrack-completion.bash" >> ~/.bashrc');
      } catch (err) {
        error(`Failed to generate bash completion: ${err}`);
        process.exit(1);
      }
    })
  )
  .addCommand(
    new Command('zsh').description('Generate zsh completion script').action(() => {
      try {
        const program = createCLI();
        const script = generateZshCompletion(program);
        console.log(script);
        console.error('\n# To install, run:');
        console.error('#   bigrack completion zsh > ~/.bigrack-completion.zsh');
        console.error('#   echo "source ~/.bigrack-completion.zsh" >> ~/.zshrc');
      } catch (err) {
        error(`Failed to generate zsh completion: ${err}`);
        process.exit(1);
      }
    })
  )
  .addCommand(
    new Command('install')
      .description('Install completion script for current shell')
      .option('--shell <shell>', 'Shell type (bash|zsh), auto-detected if not provided')
      .action((options) => {
        try {
          const shell = options.shell || process.env.SHELL?.split('/').pop() || 'zsh';

          if (shell !== 'bash' && shell !== 'zsh') {
            error(`Unsupported shell: ${shell}. Supported shells: bash, zsh`);
            process.exit(1);
          }

          const program = createCLI();
          const script =
            shell === 'bash' ? generateBashCompletion(program) : generateZshCompletion(program);

          const homeDir = process.env.HOME || process.env.USERPROFILE || '~';
          const rcFile = shell === 'bash' ? '.bashrc' : '.zshrc';
          const completionFile =
            shell === 'bash'
              ? `${homeDir}/.bigrack-completion.bash`
              : `${homeDir}/.bigrack-completion.zsh`;

          // Write completion script
          fs.writeFileSync(completionFile, script, 'utf8');
          success(`Completion script written to ${completionFile}`);

          // Check if already in rc file
          const rcPath = path.join(homeDir, rcFile);
          let rcContent = '';
          if (fs.existsSync(rcPath)) {
            rcContent = fs.readFileSync(rcPath, 'utf8');
          }

          const sourceLine = `source ${completionFile}`;
          if (rcContent.includes(sourceLine)) {
            info(`Completion already configured in ${rcFile}`);
          } else {
            // Append to rc file
            fs.appendFileSync(rcPath, `\n# BigRack CLI completion\n${sourceLine}\n`, 'utf8');
            success(`Completion added to ${rcFile}`);
            info(`\nPlease restart your shell or run: source ${rcFile}`);
          }
        } catch (err) {
          error(`Failed to install completion: ${err}`);
          process.exit(1);
        }
      })
  );

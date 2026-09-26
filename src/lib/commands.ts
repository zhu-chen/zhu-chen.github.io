import { sections, sectionText } from '../data/homepage';

type Entry =
  | { kind: 'directory'; children: Map<string, Entry> }
  | { kind: 'file'; text: string };

type ResolvedPath =
  | { entry: Entry; path: string; error?: never }
  | { error: string; entry?: never; path?: never };

const root: Entry = {
  kind: 'directory',
  children: new Map<string, Entry>([
    [
      'README.txt',
      {
        kind: 'file',
        text: '欢迎来到我的主页。\n输入 ls 查看目录，cd about 进入简介，cat README.txt 阅读内容。\n输入 help 查看全部命令。',
      },
    ],
    ...sections.map<[string, Entry]>((section) => [
      section.id,
      {
        kind: 'directory',
        children: new Map([
          ['README.txt', { kind: 'file', text: sectionText(section) }],
        ]),
      },
    ]),
  ]),
};

const commandHelp = [
  {
    name: 'help',
    usage: 'help [命令]',
    description: '查看全部命令或某个命令的用法。',
  },
  {
    name: 'ls',
    usage: 'ls [路径]',
    description: '列出目录内容；目录以 / 结尾。',
  },
  {
    name: 'cd',
    usage: 'cd [目录]',
    description: '进入目录；.. 返回上级，~ 回到根目录，- 返回上一次目录。',
  },
  { name: 'pwd', usage: 'pwd', description: '显示当前位置的绝对路径。' },
  {
    name: 'cat',
    usage: 'cat <文件>',
    description: '阅读内容，例如 cat ~/about/README.txt。',
  },
  { name: 'whoami', usage: 'whoami', description: '查看主页主人的简介。' },
  {
    name: 'history',
    usage: 'history',
    description: '查看本次访问最近 50 条命令，刷新后清空。',
  },
  {
    name: 'clear',
    usage: 'clear',
    description: '清空终端显示，保留当前目录和命令历史。',
  },
];

export const MAX_COMMAND_LENGTH = 256;

export function displayPath(path: string): string {
  return path === '/' ? '~' : `~${path}`;
}

// Never pass user-supplied terminal control sequences through to xterm.
export function plainText(text: string): string {
  return text.replace(/[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/g, ' ');
}

function resolvePath(target: string, cwd: string): ResolvedPath {
  if (target.startsWith('~') && target !== '~' && !target.startsWith('~/')) {
    return { error: `不支持此路径：${target}。使用 ~ 表示主页根目录。` };
  }
  const absolute = target.startsWith('/') || target.startsWith('~');
  const parts = [
    ...(absolute ? [] : cwd.split('/')),
    ...target.replace(/^~/, '').split('/'),
  ];
  const stack: { name: string; entry: Entry }[] = [{ name: '', entry: root }];
  for (const part of parts) {
    if (!part) continue;
    const current = stack[stack.length - 1]!.entry;
    if (current.kind !== 'directory') {
      return { error: `不是目录：${target}` };
    }
    if (part === '.') continue;
    if (part === '..') {
      if (stack.length > 1) stack.pop();
      continue;
    }
    const entry = current.children.get(part);
    if (!entry) return { error: `找不到路径：${target}` };
    stack.push({ name: part, entry });
  }
  const entry = stack[stack.length - 1]!.entry;
  if (target.endsWith('/') && entry.kind !== 'directory') {
    return { error: `不是目录：${target}` };
  }
  return {
    entry,
    path:
      '/' +
      stack
        .slice(1)
        .map((item) => item.name)
        .join('/'),
  };
}

export interface CommandResult {
  command: string;
  lines: string[];
  clear: boolean;
}

/** A small, read-only content navigator. It never invokes a real shell. */
export class CommandSession {
  private currentPath = '/';
  private previousPath = '/';
  private entries: string[] = [];

  get cwd(): string {
    return this.currentPath;
  }

  get history(): readonly string[] {
    return this.entries;
  }

  execute(raw: string): CommandResult {
    const command = plainText(raw).replace(/\n/g, ' ').trim();
    const result = (lines: string[], clear = false): CommandResult => ({
      command,
      lines,
      clear,
    });
    if (!command) return result([]);
    if (command.length > MAX_COMMAND_LENGTH) {
      return {
        command: '',
        lines: [`命令过长，请控制在 ${MAX_COMMAND_LENGTH} 个字符内。`],
        clear: false,
      };
    }
    this.entries.push(command);
    if (this.entries.length > 50) this.entries.shift();

    const [name, ...args] = command.split(/\s+/);
    const definition = commandHelp.find((item) => item.name === name);
    if (!definition)
      return result([`未知命令：${name}。输入 help 查看可用命令。`]);
    const usage = () =>
      result([`用法：${definition.usage}`, definition.description]);
    if (args[0] === '--help' && args.length === 1) return usage();

    switch (name) {
      case 'help': {
        if (args.length > 1) return usage();
        if (args[0]) {
          const help = commandHelp.find((item) => item.name === args[0]);
          return result(
            help
              ? [`用法：${help.usage}`, help.description]
              : [`未知命令：${args[0]}。输入 help 查看可用命令。`],
          );
        }
        return result([
          '可用命令：',
          ...commandHelp.map((item) => `${item.usage} — ${item.description}`),
          '试一试：ls → cd about → cat README.txt',
          '也可以通过页面链接直接浏览内容。',
        ]);
      }
      case 'ls': {
        if (args.length > 1 || args[0]?.startsWith('-')) return usage();
        const found = resolvePath(args[0] ?? '.', this.cwd);
        if (found.error !== undefined) return result([found.error]);
        if (found.entry.kind === 'file')
          return result([found.path.split('/').pop()!]);
        return result(
          [...found.entry.children].map(
            ([name, entry]) => name + (entry.kind === 'directory' ? '/' : ''),
          ),
        );
      }
      case 'cd': {
        if (args.length > 1) return usage();
        const target = args[0] === '-' ? this.previousPath : (args[0] ?? '~');
        const found = resolvePath(target, this.cwd);
        if (found.error !== undefined) return result([found.error]);
        if (found.entry.kind !== 'directory')
          return result([`不是目录：${target}`]);
        this.previousPath = this.currentPath;
        this.currentPath = found.path;
        return result([
          `当前位置：${displayPath(this.cwd)}。输入 ls 查看内容。`,
        ]);
      }
      case 'cat': {
        if (args.length !== 1) return usage();
        const found = resolvePath(args[0]!, this.cwd);
        if (found.error !== undefined) return result([found.error]);
        if (found.entry.kind !== 'file')
          return result([`这是目录：${args[0]}。使用 ls 查看其中的文件。`]);
        return result(found.entry.text.split('\n'));
      }
      default: {
        if (args.length) return usage();
        switch (name) {
          case 'pwd':
            return result([this.cwd]);
          case 'whoami':
            return result(
              sectionText(
                sections.find((section) => section.id === 'about')!,
              ).split('\n'),
            );
          case 'history':
            return result(
              this.entries.map((entry, index) => `${index + 1}  ${entry}`),
            );
          case 'clear':
            return result([], true);
          default:
            return usage();
        }
      }
    }
  }
}

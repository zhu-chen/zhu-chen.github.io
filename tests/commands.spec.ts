import { expect, test } from '@playwright/test';
import { CommandSession, MAX_COMMAND_LENGTH } from '../src/lib/commands';
import { sections, sectionText } from '../src/data/homepage';

test('browse content with relative, absolute and home paths', () => {
  const shell = new CommandSession();
  expect(shell.execute('ls').lines).toEqual([
    'README.txt',
    'about/',
    'projects/',
    'contact/',
  ]);
  shell.execute('cd about');
  expect(shell.execute('pwd').lines).toEqual(['/about']);
  expect(shell.execute('ls').lines).toEqual(['README.txt']);
  expect(shell.execute('cat README.txt').lines.join('\n')).toBe(
    sectionText(sections[0]!),
  );
  shell.execute('cd ../projects/./');
  expect(shell.cwd).toBe('/projects');
  shell.execute('cd -');
  expect(shell.cwd).toBe('/about');
  shell.execute('cd //contact//');
  expect(shell.cwd).toBe('/contact');
  expect(shell.execute('cat ~/about/README.txt').lines).toEqual(
    shell.execute('whoami').lines,
  );
  shell.execute('cd');
  expect(shell.cwd).toBe('/');
  shell.execute('cd ../../..');
  expect(shell.cwd).toBe('/');
});

test('invalid paths preserve location and cannot bypass missing directories or files', () => {
  const shell = new CommandSession();
  shell.execute('cd about');
  for (const command of [
    'cd missing',
    'cd README.txt',
    'cd missing/../..',
    'cd README.txt/../..',
    'cd ~someone',
    'cd a b',
  ]) {
    expect(shell.execute(command).lines.length).toBeGreaterThan(0);
    expect(shell.cwd).toBe('/about');
  }
  expect(shell.execute('ls README.txt/').lines.join()).toContain('不是目录');
  expect(shell.execute('cat .').lines.join()).toContain('这是目录');
  expect(shell.execute('ls README.txt').lines).toEqual(['README.txt']);
  expect(shell.execute('cd -').lines.join()).toContain('当前位置：~。');
});

test('help and errors describe the supported command set without executing shell syntax', () => {
  const shell = new CommandSession();
  const help = shell.execute('help').lines.join('\n');
  for (const command of [
    'help',
    'ls',
    'cd',
    'pwd',
    'cat',
    'clear',
    'whoami',
    'history',
  ]) {
    expect(help).toContain(command);
    expect(shell.execute(`help ${command}`).lines).toEqual(
      shell.execute(`${command} --help`).lines,
    );
  }
  expect(shell.execute('ls -l').lines[0]).toContain('用法：');
  expect(shell.execute('pwd extra').lines[0]).toContain('用法：');
  expect(shell.execute('constructor').lines[0]).toContain('未知命令');
  expect(shell.execute('help __proto__').lines[0]).toContain('未知命令');
  expect(shell.execute('cd about; clear').clear).toBe(false);
  expect(shell.cwd).toBe('/');
  expect(shell.execute('\x1b[2Junknown').command).not.toContain('\x1b');
});

test('history is bounded, clear preserves navigation and new visits start fresh', () => {
  const shell = new CommandSession();
  shell.execute('   ');
  expect(shell.history).toEqual([]);
  shell.execute('x'.repeat(MAX_COMMAND_LENGTH + 1));
  expect(shell.history).toEqual([]);
  shell.execute('cd projects');
  expect(shell.execute('clear').clear).toBe(true);
  expect(shell.cwd).toBe('/projects');
  expect(shell.execute('history').lines).toEqual([
    '1  cd projects',
    '2  clear',
    '3  history',
  ]);
  for (let i = 0; i < 55; i++) shell.execute(`unknown-${i}`);
  expect(shell.history).toHaveLength(50);
  expect(shell.history[0]).toBe('unknown-5');
  expect(new CommandSession().history).toEqual([]);
});

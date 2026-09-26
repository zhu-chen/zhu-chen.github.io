import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { CommandSession, displayPath, plainText } from '../lib/commands';

class HomepageTerminal extends HTMLElement {
  private terminal?: Terminal;
  private observer?: ResizeObserver;
  private events?: AbortController;

  connectedCallback() {
    const screen = this.querySelector<HTMLElement>('[data-terminal-screen]');
    const surface = this.querySelector<HTMLElement>('[data-terminal-surface]');
    const fallback = this.querySelector<HTMLElement>(
      '[data-terminal-fallback]',
    );
    const controls = this.querySelectorAll<HTMLElement>(
      '[data-terminal-controls]',
    );
    const form = this.querySelector<HTMLFormElement>('form');
    const input = this.querySelector<HTMLInputElement>('input');
    const path = this.querySelector<HTMLElement>('[data-terminal-path]');
    if (
      !screen ||
      !surface ||
      !fallback ||
      !controls.length ||
      !form ||
      !input ||
      !path ||
      this.terminal
    )
      return;

    const session = new CommandSession();
    path.textContent = displayPath(session.cwd);
    input.value = '';
    let historyIndex = 0;
    let draft = '';
    let composing = false;
    let ready = false;
    const styles = getComputedStyle(this);
    const terminal = new Terminal({
      rows: 16,
      disableStdin: true,
      cursorBlink: false,
      cursorInactiveStyle: 'none',
      screenReaderMode: true,
      scrollback: 500,
      fontSize: 16,
      lineHeight: 1.4,
      fontFamily: styles.fontFamily,
      theme: {
        background: styles.getPropertyValue('--background').trim(),
        foreground: styles.getPropertyValue('--foreground').trim(),
        cursor: styles.getPropertyValue('--accent').trim(),
      },
    });
    const fit = new FitAddon();
    this.terminal = terminal;
    this.events = new AbortController();
    const { signal } = this.events;
    terminal.loadAddon(fit);
    screen.hidden = false;
    terminal.open(screen);
    fit.fit();

    // Every output ends with CRLF, leaving the cursor's row for native editing.
    // Clip unused rows instead of placing a separate form below a blank screen.
    const syncPrompt = () => {
      if (!ready || signal.aborted) return;
      const renderedScreen = screen.querySelector<HTMLElement>('.xterm-screen');
      if (!renderedScreen) return;
      const { height, width } = renderedScreen.getBoundingClientRect();
      const rowHeight = height / terminal.rows;
      const buffer = terminal.buffer.active;
      surface.style.height = `${(buffer.cursorY + 1) * rowHeight}px`;
      surface.style.setProperty(
        '--prompt-top',
        `${buffer.cursorY * rowHeight}px`,
      );
      surface.style.setProperty('--terminal-row-height', `${rowHeight}px`);
      surface.style.setProperty('--terminal-width', `${width}px`);
      // The live prompt must not cover old output when browsing scrollback.
      form.hidden = buffer.viewportY !== buffer.baseY;
    };
    terminal.onRender(syncPrompt);
    terminal.onScroll(syncPrompt);

    // Keep browser editing, selection, IME and mobile keyboards on the native
    // editor embedded at the terminal cursor; output never traps focus or Tab.
    terminal.attachCustomKeyEventHandler(() => false);
    if (terminal.textarea) {
      terminal.textarea.readOnly = true;
      terminal.textarea.tabIndex = -1;
      terminal.textarea.setAttribute('aria-label', '终端输出');
    }
    terminal.write(
      'Welcome to my homepage.\r\n输入 help 查看帮助，ls 浏览目录。\r\n',
      () => {
        if (signal.aborted) return;
        fallback.hidden = true;
        ready = true;
        for (const control of controls) control.hidden = false;
        syncPrompt();
      },
    );

    const execute = (command: string) => {
      const prompt = `${displayPath(session.cwd)} $ `;
      const result = session.execute(command);
      if (result.clear) {
        // Queue the clear with writes so rapid consecutive commands stay ordered.
        terminal.write('\x1b[2J\x1b[3J\x1b[H', syncPrompt);
      } else if (result.command || result.lines.length) {
        const lines = [
          ...(result.command ? [prompt + result.command] : []),
          ...result.lines,
        ];
        terminal.write(lines.map(plainText).join('\r\n') + '\r\n', () => {
          if (signal.aborted) return;
          terminal.scrollToBottom();
          syncPrompt();
        });
      }
      path.textContent = displayPath(session.cwd);
      input.value = '';
      draft = '';
      historyIndex = session.history.length;
    };

    form.addEventListener('click', () => input.focus(), { signal });
    input.addEventListener('focus', () => terminal.scrollToBottom(), {
      signal,
    });
    form.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();
        if (!composing) execute(input.value);
      },
      { signal },
    );
    input.addEventListener(
      'compositionstart',
      () => {
        composing = true;
      },
      { signal },
    );
    input.addEventListener(
      'compositionend',
      () => {
        composing = false;
      },
      { signal },
    );
    input.addEventListener(
      'keydown',
      (event) => {
        if (event.isComposing || composing) return;
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
          return;
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
        event.preventDefault();
        if (historyIndex === session.history.length) draft = input.value;
        historyIndex = Math.max(
          0,
          Math.min(
            session.history.length,
            historyIndex + (event.key === 'ArrowUp' ? -1 : 1),
          ),
        );
        input.value = session.history[historyIndex] ?? draft;
        input.setSelectionRange(input.value.length, input.value.length);
      },
      { signal },
    );
    for (const button of this.querySelectorAll<HTMLButtonElement>(
      '[data-command]',
    )) {
      button.addEventListener(
        'click',
        () => execute(button.dataset.command ?? ''),
        { signal },
      );
    }

    this.observer = new ResizeObserver(() => {
      fit.fit();
      syncPrompt();
    });
    this.observer.observe(screen);
  }

  disconnectedCallback() {
    this.events?.abort();
    this.observer?.disconnect();
    this.terminal?.dispose();
    this.events = undefined;
    this.observer = undefined;
    this.terminal = undefined;
    const screen = this.querySelector<HTMLElement>('[data-terminal-screen]');
    const fallback = this.querySelector<HTMLElement>(
      '[data-terminal-fallback]',
    );
    const controls = this.querySelectorAll<HTMLElement>(
      '[data-terminal-controls]',
    );
    if (screen) {
      screen.replaceChildren();
      screen.hidden = true;
    }
    if (fallback) fallback.hidden = false;
    for (const control of controls) control.hidden = true;
    this.querySelector<HTMLElement>('[data-terminal-surface]')?.removeAttribute(
      'style',
    );
  }
}

if (!customElements.get('homepage-terminal')) {
  customElements.define('homepage-terminal', HomepageTerminal);
}

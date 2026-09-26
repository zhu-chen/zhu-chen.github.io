import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';

// A read-only integration preview. Commands will be designed separately.
class TerminalPreview extends HTMLElement {
  private terminal?: Terminal;
  private observer?: ResizeObserver;

  connectedCallback() {
    const screen = this.querySelector<HTMLElement>('[data-terminal-screen]');
    const fallback = this.querySelector<HTMLElement>(
      '[data-terminal-fallback]',
    );

    if (!screen || !fallback || this.terminal) return;

    const terminal = new Terminal({
      rows: 5,
      disableStdin: true,
      cursorBlink: false,
      cursorInactiveStyle: 'none',
      screenReaderMode: true,
      scrollback: 0,
      fontSize: 14,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      theme: {
        background: '#11171b',
        foreground: '#dce7e3',
        cursor: '#8ed6b0',
      },
    });
    const fit = new FitAddon();
    this.terminal = terminal;

    terminal.loadAddon(fit);
    screen.hidden = false;
    terminal.open(screen);
    fit.fit();

    // Keep native Tab navigation even when the terminal has focus.
    terminal.attachCustomKeyEventHandler((event) => event.key !== 'Tab');
    terminal.write('Welcome to my homepage.\r\n', () => {
      fallback.hidden = true;
    });

    this.observer = new ResizeObserver(() => fit.fit());
    this.observer.observe(screen);
  }

  disconnectedCallback() {
    this.observer?.disconnect();
    this.terminal?.dispose();
    this.observer = undefined;
    this.terminal = undefined;

    const screen = this.querySelector<HTMLElement>('[data-terminal-screen]');
    const fallback = this.querySelector<HTMLElement>(
      '[data-terminal-fallback]',
    );
    if (screen) screen.hidden = true;
    if (fallback) fallback.hidden = false;
  }
}

if (!customElements.get('terminal-preview')) {
  customElements.define('terminal-preview', TerminalPreview);
}

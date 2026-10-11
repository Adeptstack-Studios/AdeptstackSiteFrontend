import {computed, effect, Injectable, signal} from '@angular/core';

export type ThemeMode = 'system' | 'light' | 'dark';

/**
 * Light, dark or whatever the operating system uses. The choice is remembered;
 * "system" removes data-theme so the CSS media query decides.
 * index.html applies the stored choice before Angular starts, so nothing flashes.
 */
@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  static readonly STORAGE_KEY = 'theme';

  private readonly media = window.matchMedia('(prefers-color-scheme: dark)');
  private readonly systemDark = signal(this.media.matches);

  readonly mode = signal<ThemeMode>(ThemeService.read());
  readonly isDark = computed(() => this.mode() === 'dark' || (this.mode() === 'system' && this.systemDark()));

  constructor() {
    this.media.addEventListener('change', event => this.systemDark.set(event.matches));

    effect(() => {
      const mode = this.mode();
      const root = document.documentElement;
      if (mode === 'system') {
        root.removeAttribute('data-theme');
      } else {
        root.setAttribute('data-theme', mode);
      }
      ThemeService.write(mode);
    });
  }

  setMode(mode: ThemeMode) {
    this.mode.set(mode);
  }

  /** Switches to the opposite of what is shown right now. */
  toggle() {
    this.mode.set(this.isDark() ? 'light' : 'dark');
  }

  private static read(): ThemeMode {
    try {
      const stored = localStorage.getItem(ThemeService.STORAGE_KEY);
      return stored === 'light' || stored === 'dark' ? stored : 'system';
    } catch {
      return 'system';
    }
  }

  private static write(mode: ThemeMode) {
    try {
      if (mode === 'system') {
        localStorage.removeItem(ThemeService.STORAGE_KEY);
      } else {
        localStorage.setItem(ThemeService.STORAGE_KEY, mode);
      }
    } catch {
      // storage blocked: the choice simply lasts until the tab is closed
    }
  }
}

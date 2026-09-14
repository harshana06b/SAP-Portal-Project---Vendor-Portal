import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly storageKey = 'vendor-portal-theme';
  private readonly isDarkTheme = new BehaviorSubject<boolean>(false);
  readonly isDarkTheme$ = this.isDarkTheme.asObservable();

  constructor() {
    const storedTheme = localStorage.getItem(this.storageKey);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = storedTheme ? storedTheme === 'dark' : prefersDark;

    this.setTheme(isDark);
  }

  toggleTheme() {
    this.setTheme(!this.isDarkTheme.value);
  }

  setTheme(isDark: boolean) {
    this.isDarkTheme.next(isDark);
    localStorage.setItem(this.storageKey, isDark ? 'dark' : 'light');

    document.documentElement.classList.toggle('dark-theme', isDark);
    document.documentElement.classList.toggle('light-theme', !isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.body.classList.toggle('dark-theme', isDark);
    document.body.classList.toggle('light-theme', !isDark);
  }
}

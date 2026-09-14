import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, tap } from 'rxjs';

interface LoginResponse {
  status: string;
  token: string;
  vendorId: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = 'http://localhost:3000/api';
  private readonly authenticatedSubject = new BehaviorSubject<boolean>(this.hasStoredSession());
  readonly isAuthenticated$ = this.authenticatedSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  private hasStoredSession(): boolean {
    return Boolean(localStorage.getItem('token'));
  }

  private condense(value: string): string {
    return value?.replace(/\s+/g, ' ').trim() ?? '';
  }

  isAuthenticated(): boolean {
    return this.authenticatedSubject.value;
  }

  login(vendorId: string, password: string) {
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, {
      vendorId: this.condense(vendorId),
      password
    }).pipe(
      tap((res) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('vendorId', res.vendorId);
        localStorage.removeItem('logoutFlag');
        this.authenticatedSubject.next(true);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('vendorId');
    localStorage.setItem('logoutFlag', 'true');
    this.authenticatedSubject.next(false);

    this.router.navigate(['/login']);
  }
}

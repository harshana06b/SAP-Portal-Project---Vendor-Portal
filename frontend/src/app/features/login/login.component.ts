import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  vendorId = '';
  password = '';
  loading = false;
  error = '';
  showPassword = false;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  @HostListener('window:popstate')
  onPopState(): void {
    if (localStorage.getItem('logoutFlag') === 'true') {
      window.confirm('Session already ended. Please login again.');
      history.pushState(null, '', '/login');
    }
  }

  submit(): void {
    this.loading = true;
    this.error = '';

    this.authService.login(this.vendorId, this.password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message ?? 'Login failed. Please verify credentials.';
      }
    });
  }
}

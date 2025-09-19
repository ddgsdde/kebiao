import { Component, ChangeDetectionStrategy, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './change-password.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangePasswordComponent {
  @Output() close = new EventEmitter<void>();
  
  authService = inject(AuthService);

  newPassword = signal('');
  confirmPassword = signal('');
  status = signal<{ type: 'error' | 'success'; message: string } | null>(null);

  handleChangePassword(): void {
    this.status.set(null);
    const newPass = this.newPassword();
    const confirmPass = this.confirmPassword();
    const currentUser = this.authService.currentUser();

    if (!newPass || !confirmPass) {
      this.status.set({ type: 'error', message: '所有字段均为必填项。' });
      return;
    }
    if (newPass !== confirmPass) {
      this.status.set({ type: 'error', message: '两次输入的密码不匹配。' });
      return;
    }
    if (!currentUser) {
        this.status.set({ type: 'error', message: '无法识别当前用户。' });
        return;
    }

    const result = this.authService.changePassword(currentUser.username, newPass);

    if (result.success) {
        this.status.set({ type: 'success', message: '密码已成功更新！' });
        this.newPassword.set('');
        this.confirmPassword.set('');
        setTimeout(() => this.close.emit(), 2000);
    } else {
        this.status.set({ type: 'error', message: result.message });
    }
  }
}

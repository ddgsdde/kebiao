import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-user-manager',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-manager.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserManagerComponent implements OnInit {
  authService = inject(AuthService);

  users = signal<Omit<User, 'password'>[]>([]);
  bulkRegisterContent = signal('');
  statusMessage = signal<{ type: 'success' | 'error', text: string } | null>(null);

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.users.set(this.authService.getAllUsers());
  }

  handleBulkRegister(): void {
    const content = this.bulkRegisterContent().trim();
    if (!content) return;

    const usersToRegister = content.split('\n')
      .map(line => line.trim().split(','))
      .filter(parts => parts.length === 2 && parts[0].trim() && parts[1].trim())
      .map(parts => ({ username: parts[0].trim(), password: parts[1].trim() }));
    
    if(usersToRegister.length === 0) {
      this.setStatus('error', '未找到有效的"用户名,密码"格式。');
      return;
    }

    const result = this.authService.registerUsers(usersToRegister);
    this.setStatus(result.success ? 'success' : 'error', result.message);

    if (result.success) {
      this.bulkRegisterContent.set('');
      this.loadUsers();
    }
  }

  resetPassword(username: string): void {
    const newPassword = prompt(`为用户 "${username}" 输入新密码:`);
    if (newPassword && newPassword.trim()) {
      const result = this.authService.changePassword(username, newPassword.trim());
      this.setStatus(result.success ? 'success' : 'error', result.message);
    }
  }

  deleteUser(username: string): void {
    if (confirm(`您确定要删除用户 "${username}" 吗？此操作不可撤销。`)) {
      const result = this.authService.deleteUser(username);
      this.setStatus(result.success ? 'success' : 'error', result.message);
      if (result.success) {
        this.loadUsers();
      }
    }
  }

  private setStatus(type: 'success' | 'error', text: string): void {
    this.statusMessage.set({ type, text });
    setTimeout(() => this.statusMessage.set(null), 5000);
  }
}

import { Injectable, signal, computed } from '@angular/core';

export interface User {
  username: string;
  // NOTE: In a real-world application, passwords should be hashed and salted, never stored in plain text.
  // This is simplified for demonstration purposes.
  password?: string;
  role: 'admin' | 'user';
}

const USERS_KEY = 'allUsers';
const SESSION_KEY = 'currentUser';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  currentUser = signal<User | null>(this.getUserFromSession());
  private allUsers = signal<User[]>(this.getUsersFromStorage());

  constructor() {
    // On initial load, if there are no users, create a default admin
    if (this.allUsers().length === 0) {
      const adminUser: User = { username: 'admin', password: 'admin', role: 'admin' };
      this.allUsers.set([adminUser]);
      this.saveUsersToStorage([adminUser]);
      console.log('Default admin user created. Username: admin, Password: admin');
    }
  }

  login(username: string, password: string): { success: boolean; message: string } {
    const user = this.allUsers().find(u => u.username === username);

    if (!user || user.password !== password) {
      return { success: false, message: '用户名或密码错误。' };
    }

    const sessionUser: User = { username: user.username, role: user.role };
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
      this.currentUser.set(sessionUser);
      return { success: true, message: '登录成功！' };
    } catch (e) {
      console.error("Failed to save user to sessionStorage", e);
      return { success: false, message: '登录时发生内部错误。' };
    }
  }

  logout(): void {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      this.currentUser.set(null);
    } catch (e) {
      console.error("Failed to remove user from sessionStorage", e);
    }
  }

  registerUsers(usersData: { username: string; password: string }[]): { success: boolean; message: string } {
    if (this.currentUser()?.role !== 'admin') {
      return { success: false, message: '只有管理员才能注册用户。' };
    }

    const currentUsers = this.allUsers();
    const existingUsernames = new Set(currentUsers.map(u => u.username));
    let addedCount = 0;
    let skippedCount = 0;

    const newUsers: User[] = [];
    for (const userData of usersData) {
      if (existingUsernames.has(userData.username)) {
        skippedCount++;
      } else {
        newUsers.push({ ...userData, role: 'user' });
        existingUsernames.add(userData.username);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      const updatedUsers = [...currentUsers, ...newUsers];
      this.allUsers.set(updatedUsers);
      this.saveUsersToStorage(updatedUsers);
    }
    
    let message = `成功添加 ${addedCount} 个用户。`;
    if (skippedCount > 0) {
      message += ` 跳过 ${skippedCount} 个已存在的用户。`;
    }
    return { success: true, message };
  }
  
  changePassword(username: string, newPassword: string): { success: boolean, message: string } {
      const loggedInUser = this.currentUser();
      if (!loggedInUser) {
          return { success: false, message: '请先登录。'};
      }

      if (loggedInUser.role !== 'admin' && loggedInUser.username !== username) {
          return { success: false, message: '权限不足。'};
      }

      const users = this.allUsers();
      const userIndex = users.findIndex(u => u.username === username);

      if (userIndex === -1) {
          return { success: false, message: '用户不存在。'};
      }
      
      users[userIndex].password = newPassword;
      this.allUsers.set([...users]);
      this.saveUsersToStorage(users);
      
      return { success: true, message: `用户 ${username} 的密码已成功更新。`};
  }

  deleteUser(username: string): { success: boolean; message: string } {
      if (this.currentUser()?.role !== 'admin') {
        return { success: false, message: '只有管理员才能删除用户。' };
      }
      if (username === 'admin') {
        return { success: false, message: '不能删除主管理员账户。' };
      }

      const updatedUsers = this.allUsers().filter(u => u.username !== username);
      this.allUsers.set(updatedUsers);
      this.saveUsersToStorage(updatedUsers);
      return { success: true, message: `用户 ${username} 已被删除。` };
  }
  
  getAllUsers(): Omit<User, 'password'>[] {
    if (this.currentUser()?.role !== 'admin') {
      return [];
    }
    return this.allUsers().map(({ password, ...user }) => user);
  }

  private getUsersFromStorage(): User[] {
    try {
      const usersJson = localStorage.getItem(USERS_KEY);
      return usersJson ? JSON.parse(usersJson) : [];
    } catch (e) {
      console.error("Failed to load users from localStorage", e);
      return [];
    }
  }

  private saveUsersToStorage(users: User[]): void {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch (e) {
      console.error("Failed to save users to localStorage", e);
    }
  }

  private getUserFromSession(): User | null {
    try {
      const userJson = sessionStorage.getItem(SESSION_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch (e) {
      console.error("Failed to load user from sessionStorage", e);
      return null;
    }
  }
}

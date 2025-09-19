import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { Schedule, FlattenedClass, ClassInfo, Day, Week } from '../models/schedule.model';
import { AuthService } from './auth.service';

const STORAGE_KEY = 'universitySchedules';

interface Conflict {
  date: string;
  period: string;
  course1: string;
  course2: string;
}

@Injectable({
  providedIn: 'root',
})
export class ScheduleService {
  private authService = inject(AuthService);
  schedules = signal<Schedule[]>(this.loadFromLocalStorage());

  allClasses = computed<FlattenedClass[]>(() => {
    const allSchedules = this.schedules();
    const flattened: FlattenedClass[] = [];

    for (const schedule of allSchedules) {
      if (!schedule.academic_year || !schedule.schedule) continue;
      
      const yearStr = schedule.academic_year.split('-')[0];
      if (!yearStr) continue;

      const year = parseInt(yearStr, 10);
      if (isNaN(year)) continue;

      for (const week of schedule.schedule) {
        for (const day of week.days) {
          if (!day.date) continue;
          const [month, dayOfMonth] = day.date.split('-').map(Number);
          // Note: month is 0-indexed in JS Date
          const classDate = new Date(year, month - 1, dayOfMonth);

          for (const classInfo of day.classes) {
            flattened.push({
              studentName: schedule.student_name,
              date: classDate,
              dayOfWeek: day.day_of_week,
              period: classInfo.period,
              courseName: classInfo.course_name,
              type: classInfo.type,
              teacher: classInfo.teacher,
              location: classInfo.location,
            });
          }
        }
      }
    }
    return flattened;
  });

  conflictingSlots = computed<Set<string>>(() => {
    const slots = new Map<string, FlattenedClass[]>(); // Key: 'studentName-YYYY-MM-DD-period'
    const conflictingKeys = new Set<string>();

    for (const cls of this.allClasses()) {
      const dateStr = cls.date.toISOString().slice(0, 10);
      const slotKey = `${cls.studentName}-${dateStr}-${cls.period}`;
      
      const slotClasses = slots.get(slotKey) || [];
      slotClasses.push(cls);
      slots.set(slotKey, slotClasses);
    }
    
    for (const [key, classesInSlot] of slots.entries()) {
        if (classesInSlot.length > 1) {
            conflictingKeys.add(key);
        }
    }
    
    return conflictingKeys;
  });

  constructor() {
    // Effect to save to localStorage whenever schedules change
    effect(() => {
      this.saveToLocalStorage(this.schedules());
    });
  }

  private loadFromLocalStorage(): Schedule[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to load schedules from localStorage", e);
      return [];
    }
  }

  private saveToLocalStorage(schedules: Schedule[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(schedules));
    } catch (e) {
      console.error("Failed to save schedules to localStorage", e);
    }
  }

  private findConflictsWithinSchedule(schedule: Schedule): Conflict[] {
    const occupiedSlots = new Map<string, string>(); // Key: 'YYYY-MM-DD-period', Value: 'course_name'
    const conflicts: Conflict[] = [];
    if (!schedule.academic_year || !schedule.schedule) return [];

    const yearStr = schedule.academic_year.split('-')[0];
    const year = parseInt(yearStr, 10);

    if (isNaN(year)) return []; // Cannot determine dates without a year

    for (const week of schedule.schedule) {
        for (const day of week.days) {
            if (!day.date) continue;
            const [month, dayOfMonth] = day.date.split('-').map(Number);
            if (isNaN(month) || isNaN(dayOfMonth)) continue;
            
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;
            
            for (const classInfo of day.classes) {
                const key = `${dateStr}-${classInfo.period}`;
                if (occupiedSlots.has(key)) {
                    conflicts.push({
                        date: day.date,
                        period: classInfo.period,
                        course1: occupiedSlots.get(key)!,
                        course2: classInfo.course_name
                    });
                } else {
                    occupiedSlots.set(key, classInfo.course_name);
                }
            }
        }
    }
    return conflicts;
  }

  addSchedule(jsonContent: string, studentNameOverride: string): { success: boolean, message: string, studentName?: string } {
    try {
      const user = this.authService.currentUser();
      if (!user) {
        return { success: false, message: '请先登录再添加课表。' };
      }
      
      const newSchedule: Partial<Schedule> = JSON.parse(jsonContent);
      
      if (!newSchedule.schedule || !Array.isArray(newSchedule.schedule)) {
        throw new Error('无效的JSON格式：缺少或无效的 "schedule" 数组。');
      }
      
      const finalStudentName = (studentNameOverride.trim() || newSchedule.student_name || '').trim();

      if (!finalStudentName) {
        throw new Error('缺少学生姓名。请在输入字段或JSON文件中提供。');
      }
      newSchedule.student_name = finalStudentName;
      newSchedule.uploadedBy = user.username;

      const fullSchedule = newSchedule as Schedule;

      // Check for conflicts within the new schedule
      const conflicts = this.findConflictsWithinSchedule(fullSchedule);
      if (conflicts.length > 0) {
          const conflictMessage = conflicts
              .map(c => ` - ${c.date} ${c.period}: "${c.course1}" 与 "${c.course2}"`)
              .join('\n');
          const proceed = confirm(`警告：检测到课表内存在时间冲突！\n\n${conflictMessage}\n\n您确定要继续添加此课表吗？`);
          if (!proceed) {
              return { success: false, message: '用户因课表冲突取消了操作。' };
          }
      }

      this.schedules.update(schedules => {
        const filteredSchedules = schedules.filter(s => s.student_name !== fullSchedule.student_name);
        return [...filteredSchedules, fullSchedule];
      });
      
      return { success: true, message: `成功为 ${fullSchedule.student_name} 添加了课表。`, studentName: fullSchedule.student_name };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '发生未知解析错误。';
      console.error('Error adding schedule:', error);
      return { success: false, message: `解析JSON失败: ${errorMessage}` };
    }
  }
  
  removeSchedule(studentName: string): void {
    const user = this.authService.currentUser();
    if (!user) {
      alert('请先登录。');
      return;
    }

    const scheduleToRemove = this.schedules().find(s => s.student_name === studentName);
    if (!scheduleToRemove) return;

    const canRemove = user.role === 'admin' || scheduleToRemove.uploadedBy === user.username;

    if (canRemove) {
        this.schedules.update(schedules => schedules.filter(s => s.student_name !== studentName));
    } else {
        alert('权限不足。您只能删除自己上传的课表。');
    }
  }
}
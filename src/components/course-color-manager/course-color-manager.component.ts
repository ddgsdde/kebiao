import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CourseColorService, ColorPair } from '../../services/course-color.service';

@Component({
  selector: 'app-course-color-manager',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './course-color-manager.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseColorManagerComponent {
  courseColorService = inject(CourseColorService);
  
  uniqueCourses = this.courseColorService.uniqueCourses;
  colorPalette = this.courseColorService.getColorPalette();

  isColorSelected(courseName: string, color: ColorPair): boolean {
    const currentColor = this.courseColorService.getColorForCourse(courseName);
    return currentColor.bg === color.bg && currentColor.text === color.text;
  }

  selectColor(courseName: string, color: ColorPair): void {
    this.courseColorService.setColorForCourse(courseName, color);
  }
}
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { GroupBarComponent } from './group-bar/group-bar';
import { GroupFormComponent } from './group-form/group-form';
import { TaskBarComponent } from './task-bar/task-bar';
import { TaskFormComponent } from './task-form/task-form';
import { GanttRow } from './task.model';
import { TaskService } from './task.service';
import { TimelineHeaderComponent } from './timeline-header/timeline-header';

const DAY_WIDTH_PX = 40;
const ROW_HEIGHT_PX = 44;

@Component({
  selector: 'app-gantt',
  imports: [
    TaskFormComponent,
    GroupFormComponent,
    TimelineHeaderComponent,
    TaskBarComponent,
    GroupBarComponent,
  ],
  templateUrl: './gantt.html',
  styleUrl: './gantt.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GanttComponent {
  private readonly taskService = inject(TaskService);

  protected readonly dayWidth = DAY_WIDTH_PX;
  protected readonly rowHeight = ROW_HEIGHT_PX;
  protected readonly rows = this.taskService.rows;
  protected readonly totalDays = this.taskService.totalDays;
  protected readonly chartWidth = computed(() => this.totalDays() * this.dayWidth);

  protected onTaskMove(id: string, startDay: number): void {
    this.taskService.updateStartDay(id, startDay);
  }

  protected onTaskResize(id: string, duration: number): void {
    this.taskService.updateDuration(id, duration);
  }

  protected onTaskRemove(id: string): void {
    this.taskService.removeTask(id);
  }

  protected onGroupMove(id: string, startDay: number): void {
    this.taskService.moveGroup(id, startDay);
  }

  protected onGroupRemove(id: string): void {
    this.taskService.removeGroup(id);
  }

  protected onGroupToggle(id: string): void {
    this.taskService.toggleGroup(id);
  }

  protected trackRow(_index: number, row: GanttRow): string {
    return row.kind === 'group' ? `g:${row.group.id}` : `t:${row.task.id}`;
  }
}

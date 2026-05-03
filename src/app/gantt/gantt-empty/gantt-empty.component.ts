import { ChangeDetectionStrategy, Component } from '@angular/core';
import { GroupFormComponent } from '../group-form/group-form.component';

@Component({
  selector: 'app-gantt-empty',
  imports: [GroupFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gantt-empty.component.html',
  styleUrl: './gantt-empty.component.scss',
})
export class GanttEmptyComponent {}

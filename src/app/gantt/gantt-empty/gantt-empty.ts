import { ChangeDetectionStrategy, Component } from '@angular/core';
import { GroupFormComponent } from '../group-form/group-form';

@Component({
  selector: 'app-gantt-empty',
  imports: [GroupFormComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="empty">
      <div class="empty__card">
        <h1 class="empty__title">Welcome to your Gantt chart</h1>
        <p class="empty__subtitle">
          You don't have any groups yet. Create your first group to start
          planning.
        </p>
        <app-group-form />
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .empty {
      min-height: 60vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
    }
    .empty__card {
      max-width: 520px;
      width: 100%;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 28px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .empty__title {
      margin: 0;
      font-size: 22px;
      color: #111827;
    }
    .empty__subtitle {
      margin: 0;
      font-size: 14px;
      color: #4b5563;
      line-height: 1.5;
    }
  `,
})
export class GanttEmptyComponent {}

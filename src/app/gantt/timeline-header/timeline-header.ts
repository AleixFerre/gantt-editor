import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-timeline-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="timeline-header" [style.width.px]="totalWidth()" role="row">
      @for (day of days(); track day) {
        <div
          class="timeline-header__day"
          [class.timeline-header__day--week]="day % 7 === 0"
          [style.width.px]="dayWidth()"
          role="columnheader"
        >
          {{ day + 1 }}
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .timeline-header {
      display: flex;
      height: 32px;
      background: #f3f4f6;
      border-bottom: 1px solid #d1d5db;
    }
    .timeline-header__day {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      color: #4b5563;
      border-right: 1px solid #e5e7eb;
    }
    .timeline-header__day--week {
      background: #e5e7eb;
      color: #111827;
      font-weight: 600;
    }
  `,
})
export class TimelineHeaderComponent {
  readonly totalDays = input.required<number>();
  readonly dayWidth = input.required<number>();

  protected readonly days = computed(() =>
    Array.from({ length: this.totalDays() }, (_, index) => index),
  );

  protected readonly totalWidth = computed(() => this.totalDays() * this.dayWidth());
}

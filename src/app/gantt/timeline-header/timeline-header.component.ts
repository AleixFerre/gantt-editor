import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-timeline-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './timeline-header.component.html',
  styleUrl: './timeline-header.component.scss',
})
export class TimelineHeaderComponent {
  readonly totalDays = input.required<number>();
  readonly dayWidth = input.required<number>();

  protected readonly days = computed(() =>
    Array.from({ length: this.totalDays() }, (_, index) => index),
  );

  protected readonly totalWidth = computed(() => this.totalDays() * this.dayWidth());
}

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-group-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'button',
    tabindex: '0',
    '[style.transform]': '"translateX(" + leftPx() + "px)"',
    '[style.width.px]': 'widthPx()',
    '[style.--group-color]': 'color()',
    '[class.group-bar--dragging]': 'dragging()',
    '[attr.aria-label]': 'ariaLabel()',
    '(pointerdown)': 'onPointerDown($event)',
    '(keydown)': 'onKeyDown($event)',
  },
  templateUrl: './group-bar.component.html',
  styleUrl: './group-bar.component.scss',
})
export class GroupBarComponent {
  readonly name = input.required<string>();
  readonly color = input.required<string>();
  readonly startDay = input.required<number>();
  readonly duration = input.required<number>();
  readonly dayWidth = input.required<number>();
  readonly maxDays = input.required<number>();

  readonly moved = output<number>();
  readonly committed = output<void>();

  protected readonly dragging = signal(false);
  protected readonly leftPx = computed(() => this.startDay() * this.dayWidth());
  protected readonly widthPx = computed(() => this.duration() * this.dayWidth());
  protected readonly ariaLabel = computed(
    () =>
      `Group ${this.name()}, spans day ${this.startDay() + 1} for ${this.duration()} day${this.duration() === 1 ? '' : 's'}. Use arrow keys to move the whole group.`,
  );

  private startClientX = 0;
  private startValue = 0;

  private readonly moveListener = (event: PointerEvent) => this.onPointerMove(event);
  private readonly endListener = () => this.endDrag();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.detachWindow());
  }

  protected onPointerDown(event: PointerEvent): void {
    event.preventDefault();
    this.dragging.set(true);
    this.startClientX = event.clientX;
    this.startValue = this.startDay();
    window.addEventListener('pointermove', this.moveListener);
    window.addEventListener('pointerup', this.endListener);
    window.addEventListener('pointercancel', this.endListener);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.moved.emit(Math.max(0, this.startDay() - 1));
      this.committed.emit();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      const cap = Math.max(0, this.maxDays() - this.duration());
      this.moved.emit(Math.min(cap, this.startDay() + 1));
      this.committed.emit();
    }
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.dragging()) return;
    const deltaDays = Math.round((event.clientX - this.startClientX) / this.dayWidth());
    const cap = Math.max(0, this.maxDays() - this.duration());
    const next = Math.max(0, Math.min(cap, this.startValue + deltaDays));
    if (next !== this.startDay()) {
      this.moved.emit(next);
    }
  }

  private endDrag(): void {
    this.detachWindow();
    const wasDragging = this.dragging();
    this.dragging.set(false);
    if (wasDragging) this.committed.emit();
  }

  private detachWindow(): void {
    window.removeEventListener('pointermove', this.moveListener);
    window.removeEventListener('pointerup', this.endListener);
    window.removeEventListener('pointercancel', this.endListener);
  }
}

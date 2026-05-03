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
import { Task } from '../task.model';

type DragMode = 'move' | 'resize';

@Component({
  selector: 'app-task-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'button',
    tabindex: '0',
    '[style.transform]': '"translateX(" + leftPx() + "px)"',
    '[style.width.px]': 'widthPx()',
    '[style.background-color]': 'task().color',
    '[class.task-bar--dragging]': 'mode() !== null',
    '[attr.aria-label]': 'ariaLabel()',
    '(pointerdown)': 'onMoveStart($event)',
    '(keydown)': 'onKeyDown($event)',
  },
  templateUrl: './task-bar.component.html',
  styleUrl: './task-bar.component.scss',
})
export class TaskBarComponent {
  readonly task = input.required<Task>();
  readonly dayWidth = input.required<number>();
  readonly maxDays = input.required<number>();

  readonly moved = output<number>();
  readonly resized = output<number>();
  readonly committed = output<void>();

  protected readonly mode = signal<DragMode | null>(null);
  protected readonly leftPx = computed(() => this.task().startDay * this.dayWidth());
  protected readonly widthPx = computed(() => this.task().duration * this.dayWidth());
  protected readonly ariaLabel = computed(() => {
    const t = this.task();
    return `${t.name}, starts day ${t.startDay + 1}, duration ${t.duration} day${t.duration === 1 ? '' : 's'}. Use arrow keys to move.`;
  });

  private startClientX = 0;
  private startValue = 0;

  private readonly moveListener = (event: PointerEvent) => this.onPointerMove(event);
  private readonly endListener = () => this.endDrag();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.detachWindow());
  }

  protected onMoveStart(event: PointerEvent): void {
    if ((event.target as HTMLElement).classList.contains('task-bar__resize')) {
      return;
    }
    event.preventDefault();
    this.beginDrag('move', event.clientX, this.task().startDay);
  }

  protected onResizeStart(event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.beginDrag('resize', event.clientX, this.task().duration);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.moved.emit(Math.max(0, this.task().startDay - 1));
      this.committed.emit();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      const cap = Math.max(0, this.maxDays() - this.task().duration);
      this.moved.emit(Math.min(cap, this.task().startDay + 1));
      this.committed.emit();
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      this.resized.emit(this.task().duration + 1);
      this.committed.emit();
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      this.resized.emit(Math.max(1, this.task().duration - 1));
      this.committed.emit();
    }
  }

  private beginDrag(mode: DragMode, clientX: number, startValue: number): void {
    this.mode.set(mode);
    this.startClientX = clientX;
    this.startValue = startValue;
    window.addEventListener('pointermove', this.moveListener);
    window.addEventListener('pointerup', this.endListener);
    window.addEventListener('pointercancel', this.endListener);
  }

  private onPointerMove(event: PointerEvent): void {
    const mode = this.mode();
    if (!mode) return;
    const deltaDays = Math.round((event.clientX - this.startClientX) / this.dayWidth());
    if (mode === 'move') {
      const cap = Math.max(0, this.maxDays() - this.task().duration);
      const next = Math.max(0, Math.min(cap, this.startValue + deltaDays));
      if (next !== this.task().startDay) {
        this.moved.emit(next);
      }
    } else {
      const next = Math.max(1, this.startValue + deltaDays);
      if (next !== this.task().duration) {
        this.resized.emit(next);
      }
    }
  }

  private endDrag(): void {
    this.detachWindow();
    const wasDragging = this.mode() !== null;
    this.mode.set(null);
    if (wasDragging) this.committed.emit();
  }

  private detachWindow(): void {
    window.removeEventListener('pointermove', this.moveListener);
    window.removeEventListener('pointerup', this.endListener);
    window.removeEventListener('pointercancel', this.endListener);
  }
}

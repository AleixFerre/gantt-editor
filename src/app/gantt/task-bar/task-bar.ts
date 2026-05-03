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
  template: `
    <span class="task-bar__name">{{ task().name }}</span>
    <span
      class="task-bar__resize"
      role="separator"
      aria-label="Resize task duration"
      (pointerdown)="onResizeStart($event)"
    ></span>
  `,
  styles: `
    :host {
      position: absolute;
      top: 6px;
      bottom: 6px;
      left: 0;
      border-radius: 6px;
      display: flex;
      align-items: stretch;
      padding-left: 10px;
      color: #fff;
      font-size: 13px;
      font-weight: 500;
      user-select: none;
      touch-action: none;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
      overflow: hidden;
      cursor: grab;
      will-change: transform;
    }
    :host(.task-bar--dragging) {
      cursor: grabbing;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
    }
    :host(:focus-visible) {
      outline: 2px solid #fbbf24;
      outline-offset: 2px;
    }
    .task-bar__name {
      flex: 1;
      align-self: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      pointer-events: none;
    }
    .task-bar__resize {
      width: 10px;
      cursor: ew-resize;
      background: rgba(0, 0, 0, 0.18);
      flex-shrink: 0;
    }
    .task-bar__resize:hover {
      background: rgba(0, 0, 0, 0.32);
    }
  `,
})
export class TaskBarComponent {
  readonly task = input.required<Task>();
  readonly dayWidth = input.required<number>();
  readonly maxDays = input.required<number>();

  readonly moved = output<number>();
  readonly resized = output<number>();

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
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      const cap = Math.max(0, this.maxDays() - this.task().duration);
      this.moved.emit(Math.min(cap, this.task().startDay + 1));
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      this.resized.emit(this.task().duration + 1);
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      this.resized.emit(Math.max(1, this.task().duration - 1));
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
    this.mode.set(null);
  }

  private detachWindow(): void {
    window.removeEventListener('pointermove', this.moveListener);
    window.removeEventListener('pointerup', this.endListener);
    window.removeEventListener('pointercancel', this.endListener);
  }
}

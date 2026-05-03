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
  template: `
    <span class="group-bar__cap group-bar__cap--start"></span>
    <span class="group-bar__name">{{ name() }}</span>
    <span class="group-bar__cap group-bar__cap--end"></span>
  `,
  styles: `
    :host {
      position: absolute;
      top: 10px;
      height: 14px;
      left: 0;
      display: flex;
      align-items: center;
      padding: 0 8px;
      gap: 6px;
      background: color-mix(in srgb, var(--group-color) 30%, white);
      border: 1px solid var(--group-color);
      border-radius: 3px;
      color: #111827;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.02em;
      user-select: none;
      touch-action: none;
      cursor: grab;
      will-change: transform;
    }
    :host(.group-bar--dragging) {
      cursor: grabbing;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
    }
    :host(:focus-visible) {
      outline: 2px solid #fbbf24;
      outline-offset: 2px;
    }
    .group-bar__name {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      pointer-events: none;
      text-transform: uppercase;
    }
    .group-bar__cap {
      width: 6px;
      height: 12px;
      background: var(--group-color);
      flex-shrink: 0;
      pointer-events: none;
    }
    .group-bar__cap--start {
      clip-path: polygon(0 0, 100% 0, 100% 50%, 0 100%);
    }
    .group-bar__cap--end {
      clip-path: polygon(0 0, 100% 0, 100% 100%, 0 50%);
    }
  `,
})
export class GroupBarComponent {
  readonly name = input.required<string>();
  readonly color = input.required<string>();
  readonly startDay = input.required<number>();
  readonly duration = input.required<number>();
  readonly dayWidth = input.required<number>();
  readonly maxDays = input.required<number>();

  readonly moved = output<number>();

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
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      const cap = Math.max(0, this.maxDays() - this.duration());
      this.moved.emit(Math.min(cap, this.startDay() + 1));
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
    this.dragging.set(false);
  }

  private detachWindow(): void {
    window.removeEventListener('pointermove', this.moveListener);
    window.removeEventListener('pointerup', this.endListener);
    window.removeEventListener('pointercancel', this.endListener);
  }
}

import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-producto-card-skeleton',
  imports: [],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="animate-pulse">
      <div class="aspect-[4/5] w-full rounded-xl bg-brand-muted/10"></div>
      <div class="mt-4 h-3.5 w-3/4 rounded-sm bg-brand-muted/10"></div>
      <div class="mt-2 h-3.5 w-1/3 rounded-sm bg-brand-muted/10"></div>
      <div class="mt-3 h-10 w-full rounded-sm bg-brand-muted/10"></div>
    </div>
  `
})
export class ProductoCardSkeletonComponent {}

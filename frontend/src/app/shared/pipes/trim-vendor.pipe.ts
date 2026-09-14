import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'trimVendor'
})
export class TrimVendorPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }

    return value.replace(/^0+/, '') || '0';
  }
}

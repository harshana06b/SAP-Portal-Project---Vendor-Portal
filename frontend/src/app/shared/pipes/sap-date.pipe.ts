import { Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';

@Pipe({
  name: 'sapDate',
  standalone: true
})
export class SapDatePipe implements PipeTransform {
  private readonly datePipe = new DatePipe('en-US');

  transform(value: string | null | undefined, format = 'dd-MMM-yyyy'): string {
    if (!value) {
      return '-';
    }

    const maybeSapDate = value.match(/^\/Date\((\d+)\)\/$/);
    const parsedDate = maybeSapDate ? new Date(Number(maybeSapDate[1])) : new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return value;
    }

    return this.datePipe.transform(parsedDate, format) ?? value;
  }
}

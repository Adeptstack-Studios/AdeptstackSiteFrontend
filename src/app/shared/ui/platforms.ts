import {Pipe, PipeTransform} from '@angular/core';

/** "Android;Windows" -> "Android · Windows". The website splits at commas and semicolons too. */
@Pipe({name: 'platforms'})
export class PlatformsPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return (value ?? '').split(/[,;]/).map(platform => platform.trim()).filter(Boolean).join(' · ');
  }
}

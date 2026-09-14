import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { VendorProfile } from '../../shared/models/sap-entities.model';

@Injectable({ providedIn: 'root' })
export class VendorStateService {
  private readonly vendorProfileSubject = new BehaviorSubject<VendorProfile | null>(null);
  readonly vendorProfile$ = this.vendorProfileSubject.asObservable();

  setVendorProfile(profile: VendorProfile | null): void {
    this.vendorProfileSubject.next(profile);
  }
}

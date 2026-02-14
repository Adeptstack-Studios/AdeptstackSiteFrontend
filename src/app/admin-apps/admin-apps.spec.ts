import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminApps } from './admin-apps';

describe('AdminApps', () => {
  let component: AdminApps;
  let fixture: ComponentFixture<AdminApps>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminApps]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminApps);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

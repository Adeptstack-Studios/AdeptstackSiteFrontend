import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangelogCard } from './changelog-card';

describe('ChangelogCard', () => {
  let component: ChangelogCard;
  let fixture: ComponentFixture<ChangelogCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangelogCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChangelogCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

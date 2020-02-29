import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PictureGetterComponent } from './picture-getter.component';

describe('PictureGetterTwoComponent', () => {
  let component: PictureGetterComponent;
  let fixture: ComponentFixture<PictureGetterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PictureGetterComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PictureGetterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

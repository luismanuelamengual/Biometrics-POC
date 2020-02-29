import { Component, ViewChild, ElementRef, Output, EventEmitter, Input } from '@angular/core';
import ImageUtils from 'src/app/utils/image-utils';

@Component({
  selector: 'app-picture-getter',
  templateUrl: './picture-getter.component.html',
  styleUrls: ['./picture-getter.component.scss']
})
export class PictureGetterComponent {

  @ViewChild ('video', {static: false})
  public video: ElementRef;

  @ViewChild ('canvas', {static: false})
  public canvas: ElementRef;

  @Output()
  pictureCaptured = new EventEmitter();

  pictureCaptureSupported: boolean;
  pictureUrl = null;

  @Input()
  maxPictureWidth = 1280;

  @Input()
  maxPictureHeight = 720;

  constructor() {
    const el: any = document.createElement('input');
    this.pictureCaptureSupported = el.capture != undefined;
  }

  public ngAfterViewInit() {
    this.reset();
  }

  public capture() {
    if (!this.pictureCaptureSupported) {
      this.canvas.nativeElement.width = this.video.nativeElement.videoWidth;
      this.canvas.nativeElement.height = this.video.nativeElement.videoHeight;
      const context = this.canvas.nativeElement.getContext('2d');
      if (this.video.nativeElement.videoWidth < this.maxPictureWidth) {
        context.drawImage(this.video.nativeElement, 0, 0, this.video.nativeElement.videoWidth, this.video.nativeElement.videoHeight);
      } else {
        context.drawImage(this.video.nativeElement, 0, 0, this.maxPictureWidth, this.maxPictureHeight, 0, 0, this.maxPictureWidth, this.maxPictureHeight);
      }
      this.setPicture(this.canvas.nativeElement.toDataURL('image/jpeg'));
    }
  }

  public onPictureCaptured(picture) {
    const img = new Image();
    img.onload = () => {
        const imageWidth = img.width;
        const imageHeight = img.height;
        const scale = Math.min((this.maxPictureWidth / imageWidth), (this.maxPictureHeight / imageHeight));
        const iwScaled = imageWidth * scale;
        const ihScaled = imageHeight * scale;
        this.canvas.nativeElement.width = iwScaled;
        this.canvas.nativeElement.height = ihScaled;
        const context = this.canvas.nativeElement.getContext('2d');
        context.drawImage(img, 0, 0, iwScaled, ihScaled);
        this.setPicture(this.canvas.nativeElement.toDataURL('image/jpeg'));
    };
    img.src = URL.createObjectURL(picture);
  }

  public rotateImage(degrees= 90) {
    if (this.pictureUrl) {
      ImageUtils.rotateImage(this.pictureUrl, degrees).then((newPictureUrl) => this.setPicture(newPictureUrl));
    }
  }

  public setPicture(pictureUrl) {
    this.pictureUrl = pictureUrl;
    this.pictureCaptured.emit(this.pictureUrl);
  }

  public reset() {
    this.pictureUrl = null;
    if (!this.pictureCaptureSupported) {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({video: { width: this.maxPictureWidth, height: this.maxPictureHeight } }).then(stream => {
            this.video.nativeElement.srcObject = stream;
            this.video.nativeElement.play();
        });
      }
    }
  }
}

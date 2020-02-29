import {Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild} from '@angular/core';
import {Router} from '@angular/router';
import 'webrtc-adapter';

@Component({
    selector: 'app-camera',
    templateUrl: './camera.component.html',
    styleUrls: ['./camera.component.scss']
})
export class CameraComponent implements OnDestroy {

    pictureUrl = null;

    @Input()
    mode: 'native' | 'canvas' = 'native';

    @Input()
    maxPictureWidth = 1280;

    @Input()
    maxPictureHeight = 720;

    @Input()
    opened = false;

    @Output()
    pictureCaptured = new EventEmitter();

    @ViewChild('video', {static: false})
    video: ElementRef;

    @ViewChild('canvas', {static: false})
    canvas: ElementRef;

    @ViewChild('nativeInput', {static: false})
    nativeInput: any;

    constructor(
        private host: ElementRef,
        private router: Router) {
        if (this.mode === 'native') {
            const nativeInput: any = document.createElement('input');
            if (nativeInput.capture === undefined) {
                this.mode = 'canvas';
            }
        }
    }

    ngOnDestroy(): void {
        this.close();
    }

    open() {
        if (this.mode === 'canvas') {
            this.initializeVideo();
        } else if (this.mode === 'native') {
            this.nativeInput.nativeElement.click();
        }
        this.opened = true;
    }

    close() {
        if (this.mode === 'canvas') {
            this.finalizeVideo();
        }
        this.opened = false;
    }

    initializeVideo() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({audio: false, video: {facingMode: 'environment'}})
                .then(stream => {
                    this.video.nativeElement.srcObject = stream;
                    this.video.nativeElement.play();
                })
                .catch(error => this.router.navigate([`error/onboarding/camera_permission_denied`]));
        }
    }

    finalizeVideo() {
        if (this.video && this.video.nativeElement) {
            const stream = this.video.nativeElement.srcObject;
            if (stream) {
                stream.getTracks().forEach((track: { stop: () => void; }) => {
                    track.stop();
                });
            }
        }
    }

    onPictureCaptured(picture) {
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
        this.close();
    }

    capture() {
        const video = this.video.nativeElement;
        const canvas = this.canvas.nativeElement;
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        const videoAspectRatio = videoWidth / videoHeight;
        const componentWidth = video.offsetWidth;
        const componentHeight = video.offsetHeight;
        const componentAspectRatio = componentWidth / componentHeight;
        let canvasWidth: number;
        let canvasHeight: number;
        if (videoAspectRatio > componentAspectRatio) {
            canvasHeight = videoHeight;
            canvasWidth = componentAspectRatio * canvasHeight;
        } else {
            canvasWidth = videoWidth;
            canvasHeight = canvasWidth / componentAspectRatio;
        }
        let scaledCanvasWidth: number = canvasWidth;
        let scaledCanvasHeight: number = canvasHeight;
        if (scaledCanvasWidth > this.maxPictureWidth || scaledCanvasHeight > this.maxPictureHeight) {
            const scale = Math.min((this.maxPictureWidth / canvasWidth), (this.maxPictureHeight / canvasHeight));
            scaledCanvasWidth *= scale;
            scaledCanvasHeight *= scale;
        }
        canvas.width = scaledCanvasWidth;
        canvas.height = scaledCanvasHeight;
        const context = canvas.getContext('2d');
        let sx: number;
        let sy: number;
        if (videoAspectRatio > componentAspectRatio) {
            sx = Math.max(0, (videoWidth / 2) - (canvasWidth / 2));
            sy = 0;
        } else {
            sx = 0;
            sy = Math.max(0, (videoHeight / 2) - (canvasHeight / 2));
        }
        context.drawImage(video, sx, sy, canvasWidth, canvasHeight, 0, 0, scaledCanvasWidth, scaledCanvasHeight);
        this.setPicture(canvas.toDataURL('image/jpeg'));
        this.close();
    }

    setPicture(pictureUrl: any) {
        this.pictureUrl = pictureUrl;
        this.pictureCaptured.emit(this.pictureUrl);
    }
}

import {AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, Output, ViewChild} from '@angular/core';
import bodymovin from 'bodymovin';
import {HttpClient} from '@angular/common/http';
// @ts-ignore
import checkAnimationData from './animations/check.animation.json';
// @ts-ignore
import pointAnimationData from './animations/point.animation.json';
// @ts-ignore
import maskAnimationData from './animations/mask.animation.json';
import {environment} from '../../../environments/environment';
import ImageUtils from '../../utils/image-utils';

@Component({
    selector: 'app-liveness',
    templateUrl: './liveness.component.html',
    styleUrls: ['./liveness.component.scss']
})
export class LivenessComponent implements AfterViewInit, OnDestroy {

    readonly FRONTAL_FACE_INSTRUCTION = 'frontal-face';
    readonly LEFT_PROFILE_FACE_INSTRUCTION = 'left-profile-face';
    readonly RIGHT_PROFILE_FACE_INSTRUCTION = 'right-profile-face';

    readonly FACE_FRONTAL_PROFILE = 'front';
    readonly FACE_LEFT_PROFILE = 'left';
    readonly FACE_RIGHT_PROFILE = 'right';
    readonly FACE_ORIENTATION_INSECURE = 'insecure';

    readonly FACE_MATCH_SUCCESS_STATUS_CODE = 200;
    readonly FACE_IN_INCORRECT_ANGLE_STATUS_CODE = 201;
    readonly FACE_NOT_FOUND_STATUS_CODE = 401;
    readonly FACE_INSECURE_STATUS_CODE = 402;
    readonly FACE_NOT_CENTERED_STATUS_CODE = 403;
    readonly FACE_TOO_CLOSE_STATUS_CODE = 404;
    readonly FACE_TOO_FAR_AWAY_STATUS_CODE = 405;
    readonly FACE_RECOGNITION_ERROR_STATUS_CODE = 500;

    readonly MASK_ANIMATION_MAX_FRAMES = 60;

    @ViewChild('livenessVideo', {static: false}) livenessVideoElement;

    @ViewChild('livenessCanvas', {static: false}) livenessCanvasElement;

    @ViewChild('livenessPictureCanvas', {static: false}) livenessPictureCanvasElement;

    @ViewChild('livenessCheckAnimation', {static: false}) livenessCheckAnimationElement;

    @ViewChild('livenessPointAnimation', {static: false}) livenessPointAnimationElement;

    @ViewChild('livenessMaskAnimation', {static: false}) livenessMaskAnimationElement;

    @ViewChild('livenessVideoOverlay', {static: false}) livenessVideoOverlayElement;

    livenessViewportInitialized = false;

    livenessVideoInitialized = false;

    livenessSessionRunning = false;

    livenessStatus: number;

    livenessPictures = [];

    livenessStatusMessage = null;

    livenessInstruction = null;

    @Input()
    livenessMaxInstructions = 5;

    livenessInstructionsRemaining: number;

    pointAnimation = null;

    checkAnimation = null;

    maskAnimation = null;

    private maskAnimationInProgress = false;

    private maskAnimationTargetFrame = 0;

    private maskAnimationRequestedFrame = 0;

    @Input()
    livenessPictureMaxWidth = 720;

    @Input()
    livenessPictureMaxHeight = 600;

    @Output()
    livenessCompleted = new EventEmitter();

    @Output()
    livenessSessionStarted = new EventEmitter();

    @Input()
    livenessSessionTimeout = 10;

    livenessDebugMode = false;

    livenessInstructionTimeoutTask: any;

    @Input()
    livenessAutoStart = true;

    @Input()
    livenessMode: 'point' | 'mask' = 'mask';

    constructor(
        private host: ElementRef,
        private http: HttpClient) {
    }

    ngAfterViewInit(): void {
        this.initAnimations();
        this.initVideo();
    }

    ngOnDestroy(): void {
        this.finalizeVideo();
    }

    @HostListener('window:resize', ['$event'])
    onResize(event) {
        this.adjustVideoOverlay();
    }

    initAnimations() {
        this.pointAnimation = bodymovin.loadAnimation({
            renderer: 'svg',
            autoplay: true,
            loop: true,
            animationData: pointAnimationData,
            container: this.livenessPointAnimationElement.nativeElement
        });
        this.checkAnimation = bodymovin.loadAnimation({
            renderer: 'svg',
            autoplay: false,
            loop: false,
            animationData: checkAnimationData,
            container: this.livenessCheckAnimationElement.nativeElement
        });
        this.checkAnimation.addEventListener('complete', () => {
            this.onLivenessSessionCompleted();
        });
        this.maskAnimation = bodymovin.loadAnimation({
            renderer: 'svg',
            autoplay: false,
            loop: false,
            animationData: maskAnimationData,
            container: this.livenessMaskAnimationElement.nativeElement
        });
        this.maskAnimation.addEventListener('complete', () => {
            if (this.maskAnimationTargetFrame != null && this.maskAnimationTargetFrame !== this.maskAnimationRequestedFrame) {
                this.animateMask(this.maskAnimationRequestedFrame, this.maskAnimationTargetFrame);
                this.maskAnimationRequestedFrame = this.maskAnimationTargetFrame;
            } else {
                this.maskAnimationInProgress = false;
            }
        });
        this.maskAnimation.setSpeed(2);
    }

    async initVideo() {
        this.livenessVideoElement.nativeElement.addEventListener('loadeddata', () => {
            this.livenessViewportInitialized = true;
            this.checkInitialization();
            this.adjustVideoOverlay();
        }, false);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({video: true});
            this.livenessVideoElement.nativeElement.srcObject = stream;
            this.livenessVideoInitialized = true;
            this.checkInitialization();
            this.adjustVideoOverlay();
        } catch (e) {}
    }

    finalizeVideo() {
        const stream = this.livenessVideoElement.nativeElement.srcObject;
        if (stream) {
            stream.getTracks().forEach((track) => {
                track.stop();
            });
        }
    }

    requestMaskAnimation(frame) {
        if (frame !== this.maskAnimationRequestedFrame) {
            if (!this.maskAnimationInProgress) {
                this.maskAnimationTargetFrame = null;
                this.maskAnimationInProgress = true;
                this.animateMask(this.maskAnimationRequestedFrame, frame);
                this.maskAnimationRequestedFrame = frame;
            } else {
                this.maskAnimationTargetFrame = frame;
            }
        }
    }

    animateMask(fromFrame, toFrame) {
        if (fromFrame !== toFrame) {
            this.maskAnimation.setDirection(toFrame >= fromFrame ? 1 : -1);
            this.maskAnimation.playSegments([fromFrame, toFrame], true);
        }
    }

    checkInitialization() {
        if (this.isLivenessInitialized()) {
            if (this.livenessAutoStart) {
                this.startLivenessSession();
            }
        }
    }

    isLivenessInitialized() {
        return this.livenessViewportInitialized && this.livenessVideoInitialized;
    }

    startLivenessSession() {
        this.checkAnimation.goToAndStop(0);
        this.livenessSessionRunning = true;
        this.livenessStatusMessage = null;
        this.livenessStatus = 0;
        this.livenessPictures = [];
        this.livenessInstructionsRemaining = this.livenessMaxInstructions;
        this.startLivenessInstruction(this.FRONTAL_FACE_INSTRUCTION);
        this.livenessSessionStarted.emit();
    }

    stopLivenessSession() {
        this.livenessSessionRunning = false;
    }

    startLivenessInstruction(instruction) {
        if (!this.livenessDebugMode) {
            if (this.livenessInstructionTimeoutTask) {
                clearTimeout(this.livenessInstructionTimeoutTask);
                this.livenessInstructionTimeoutTask = null;
            }
            this.livenessInstructionTimeoutTask = setTimeout(() => {
                if (this.livenessSessionRunning) {
                    this.livenessStatusMessage = 'Se ha expirado el tiempo de sesión. Por favor intente nuevamente';
                    this.stopLivenessSession();
                }
            }, this.livenessSessionTimeout * 1000);
        }
        this.setLivenessInstruction(instruction);
        this.checkDiferredImage();
    }

    setLivenessInstruction(livenessInstruction) {
        this.livenessInstruction = livenessInstruction;
        if (this.livenessMode === 'mask') {
            switch (livenessInstruction) {
                case this.FRONTAL_FACE_INSTRUCTION:
                    this.requestMaskAnimation(this.MASK_ANIMATION_MAX_FRAMES / 2);
                    break;
                case this.RIGHT_PROFILE_FACE_INSTRUCTION:
                    this.requestMaskAnimation(this.MASK_ANIMATION_MAX_FRAMES);
                    break;
                case this.LEFT_PROFILE_FACE_INSTRUCTION:
                    this.requestMaskAnimation(0);
                    break;
            }
        }
    }

    checkDiferredImage() {
        if (this.livenessSessionRunning) {
            setTimeout(() => { if (this.livenessSessionRunning) { this.checkImage(); } }, 50);
        }
    }

    checkImage() {
        try {
            if (this.livenessSessionRunning) {
                const video = this.livenessVideoElement.nativeElement;
                const videoWidth = video.videoWidth;
                const videoHeight = video.videoHeight;
                const videoAspectRatio = videoHeight / videoWidth;
                const canvas = this.livenessCanvasElement.nativeElement;
                const context = canvas.getContext('2d');
                if (videoWidth >= 320) {
                    canvas.width = 320;
                    canvas.height = 320 * videoAspectRatio;
                    context.drawImage(video, 0, 0, 320, 320 * videoAspectRatio);
                } else {
                    canvas.width = videoWidth;
                    canvas.height = videoHeight;
                    context.drawImage(video, 0, 0, videoWidth, videoHeight);
                }
                const imageUrl = canvas.toDataURL('image/jpeg', 0.7);
                const formData = new FormData();
                formData.append('image', ImageUtils.convertImageToBlob(imageUrl));
                this.http.post('/biometrics/v1/detect_face', formData, {headers: {Authorization: 'Bearer ' + environment.biometricsApiKey }}).toPromise().then((response: any) => {
                    if (this.livenessSessionRunning) {
                        this.livenessStatus = this.getStatus(response);
                        this.livenessStatusMessage = this.getStatusMessage(this.livenessStatus);
                        if (!this.livenessDebugMode && this.livenessStatus !== this.FACE_MATCH_SUCCESS_STATUS_CODE && this.livenessStatus !== this.FACE_IN_INCORRECT_ANGLE_STATUS_CODE) {
                            this.livenessInstructionsRemaining = this.livenessMaxInstructions;
                            this.livenessPictures = [];
                            if (this.livenessInstruction !== this.FRONTAL_FACE_INSTRUCTION) {
                                this.startLivenessInstruction(this.FRONTAL_FACE_INSTRUCTION);
                            } else {
                                this.checkDiferredImage();
                            }
                        } else if (this.livenessStatus === this.FACE_MATCH_SUCCESS_STATUS_CODE) {
                            if (!this.livenessDebugMode) {
                                this.livenessPictures.push(this.getPicture(this.livenessPictureMaxWidth, this.livenessPictureMaxHeight));
                                this.livenessInstructionsRemaining--;
                                if (!this.livenessInstructionsRemaining) {
                                    this.completeLivenessSession();
                                } else {
                                    this.startLivenessInstruction(this.getNextInstruction(this.livenessInstruction));
                                }
                            } else {
                                this.startLivenessInstruction(this.getNextInstruction(this.livenessInstruction));
                            }
                        } else {
                            this.checkDiferredImage();
                        }
                    }
                }).catch(e => {
                    if (this.livenessSessionRunning) {
                        this.checkDiferredImage();
                    }
                });
            }
        } catch (e) {
            this.livenessStatusMessage = e.message;
            this.checkDiferredImage();
        }
    }

    getStatus(faceDetectionResults: any) {
        try {
            if (faceDetectionResults.face) {
                const canvas = this.livenessCanvasElement.nativeElement;
                const faceBoundingBox = faceDetectionResults.face.boundingBox;
                const faceProfile = faceDetectionResults.face.profile;
                const imageWidth = canvas.width;
                const imageHeight = canvas.height;
                const imageMiddleX = imageWidth / 2;
                const imageMiddleY = imageHeight / 2;
                let faceMiddleX = faceBoundingBox.left + (faceBoundingBox.width / 2);
                const faceMiddleY = faceBoundingBox.top + (faceBoundingBox.height / 2);
                if (faceProfile === this.FACE_LEFT_PROFILE) {
                    faceMiddleX -= (faceBoundingBox.width * 10.0) / 100.0;
                } else if (faceProfile === this.FACE_RIGHT_PROFILE) {
                    faceMiddleX += (faceBoundingBox.width * 10.0) / 100.0;
                }
                const xDifferential = Math.abs(imageMiddleX - faceMiddleX);
                const yDifferential = Math.abs(imageMiddleY - faceMiddleY);
                const faceAspectRatio = 0.5;
                const imageAspectRatio = imageWidth / imageHeight;
                let xDifferentialLimit = 0.0;
                let yDifferentialLimit = 0.0;
                if (imageAspectRatio > faceAspectRatio) {
                    xDifferentialLimit = imageHeight / 4;
                    yDifferentialLimit = imageHeight / 4;
                } else {
                    xDifferentialLimit = imageWidth / 4;
                    yDifferentialLimit = imageWidth / 4;
                }

                if (xDifferential > xDifferentialLimit) {
                    return this.FACE_NOT_CENTERED_STATUS_CODE;
                }
                if (yDifferential > yDifferentialLimit) {
                    return this.FACE_NOT_CENTERED_STATUS_CODE;
                }

                switch (this.livenessInstruction) {
                    case this.FRONTAL_FACE_INSTRUCTION:
                        if (faceProfile !== this.FACE_FRONTAL_PROFILE) {
                            return this.FACE_IN_INCORRECT_ANGLE_STATUS_CODE;
                        }
                        break;
                    case this.LEFT_PROFILE_FACE_INSTRUCTION:
                        if (faceProfile !== this.FACE_LEFT_PROFILE) {
                            return this.FACE_IN_INCORRECT_ANGLE_STATUS_CODE;
                        }
                        break;
                    case this.RIGHT_PROFILE_FACE_INSTRUCTION:
                        if (faceProfile !== this.FACE_RIGHT_PROFILE) {
                            return this.FACE_IN_INCORRECT_ANGLE_STATUS_CODE;
                        }
                        break;
                }
                return this.FACE_MATCH_SUCCESS_STATUS_CODE;
            } else {
                return this.FACE_NOT_FOUND_STATUS_CODE;
            }
        } catch (e) {
            return this.FACE_RECOGNITION_ERROR_STATUS_CODE;
        }
    }

    getPicture(maxWidth: number, maxHeight: number) {
        const livenessPictureCanvas = this.livenessPictureCanvasElement.nativeElement;
        const video = this.livenessVideoElement.nativeElement;
        const scale = Math.min((maxWidth / video.videoWidth), (maxHeight / video.videoHeight));
        const canvasWidth = video.videoWidth * scale;
        const canvasHeight = video.videoHeight * scale;
        livenessPictureCanvas.width = canvasWidth;
        livenessPictureCanvas.height = canvasHeight;
        const context = livenessPictureCanvas.getContext('2d');
        context.drawImage(video, 0, 0, canvasWidth, canvasHeight);
        return livenessPictureCanvas.toDataURL('image/jpeg');
    }

    getStatusMessage(statusCode) {
        let message = null;
        switch (statusCode) {
            case this.FACE_MATCH_SUCCESS_STATUS_CODE:
                break;
            case this.FACE_NOT_FOUND_STATUS_CODE:
                message = 'Rostro no encontrado';
                break;
            case this.FACE_INSECURE_STATUS_CODE:
                message = 'Rostro no confiable. Posicionece en un lugar con fondo liso';
                break;
            case this.FACE_NOT_CENTERED_STATUS_CODE:
                message = 'Rostro no centrado';
                break;
            case this.FACE_TOO_CLOSE_STATUS_CODE:
                message = 'Rostro demasiado cerca';
                break;
            case this.FACE_TOO_FAR_AWAY_STATUS_CODE:
                message = 'Rostro demasiado lejos. Acerque su rostro';
                break;
            case this.FACE_IN_INCORRECT_ANGLE_STATUS_CODE:
                message = 'Posiciones su nariz para que coincida con el punto rojo';
                break;
            case this.FACE_RECOGNITION_ERROR_STATUS_CODE:
                message = 'Error en la detección del rostro';
                break;
        }
        return message;
    }

    convertImageToBlob(dataURI): Blob {
        let byteString;
        const dataURITokens = dataURI.split(',');
        if (dataURITokens[0].indexOf('base64') >= 0) {
            byteString = atob(dataURITokens[1]);
        } else {
            byteString = this.convertImageToBlob(dataURITokens[1]);
        }
        const ia = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ia], {type: 'image/jpeg'});
    }

    adjustVideoOverlay() {
        const el = this.host.nativeElement;
        const video = this.livenessVideoElement.nativeElement;
        const videoAspectRatio = video.videoWidth / video.videoHeight;
        const videoOverlay = this.livenessVideoOverlayElement.nativeElement;
        const widthDifferential = el.offsetWidth - video.videoWidth;
        const heightDifferential = Math.floor(el.offsetHeight - video.videoHeight) * videoAspectRatio;
        let left = 0;
        let right = 0;
        let top = 0;
        let bottom = 0;
        if (widthDifferential < heightDifferential) {
            const differential = Math.floor((heightDifferential - widthDifferential) / videoAspectRatio / 2);
            left = 0;
            right = 0;
            top = differential;
            bottom = differential;
        } else {
            const differential = Math.floor((widthDifferential - heightDifferential) / 2);
            left = differential;
            right = differential;
            top = 0;
            bottom = 0;
        }
        const overlayWidth = el.offsetWidth - left - right;
        const overlayHeight = el.offsetHeight - top - bottom;
        if (overlayWidth > overlayHeight) {
            const differential = Math.floor((overlayWidth - overlayHeight) / 2);
            left += differential;
            right += differential;
        } else {
            const differential = Math.floor((overlayHeight - overlayWidth) / 2);
            top += differential;
            bottom += differential;
        }
        videoOverlay.style.left = left + 'px';
        videoOverlay.style.right = right + 'px';
        videoOverlay.style.top = top + 'px';
        videoOverlay.style.bottom = bottom + 'px';
    }

    completeLivenessSession() {
        this.checkAnimation.goToAndPlay(0, true);
    }

    onLivenessSessionCompleted() {
        this.stopLivenessSession();
        this.livenessCompleted.emit({pictures: this.livenessPictures});
    }

    getNextInstruction(instruction) {
        const instructions = [
            this.FRONTAL_FACE_INSTRUCTION,
            this.LEFT_PROFILE_FACE_INSTRUCTION,
            this.RIGHT_PROFILE_FACE_INSTRUCTION
        ];
        const possibleInstructions = instructions.filter(item => item !== instruction);
        const minInstructionIndex = 0;
        const maxInstructionIndex = possibleInstructions.length - 1;
        const nextInstructionIndex = Math.floor(Math.random() * (maxInstructionIndex - minInstructionIndex + 1)) + minInstructionIndex;
        return possibleInstructions[nextInstructionIndex];
    }
}

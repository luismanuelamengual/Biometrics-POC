import {Component, ViewChild} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import ImageUtils from 'src/app/utils/image-utils';
import {LivenessComponent} from '../../components/liveness/liveness.component';
import {environment} from '../../../environments/environment';

@Component({
    selector: 'app-identification',
    templateUrl: './identification.component.html',
    styleUrls: ['./identification.component.scss']
})
export class IdentificationComponent {

    @ViewChild(LivenessComponent, {static: false})
    livenessComponent: LivenessComponent;

    documentFrontPicture = null;
    documentBackPicture = null;
    livenessPictures = [];
    livenessSessionRunning = false;
    verificationResults = null;
    verificationError = null;
    verifying = false;

    constructor(private http: HttpClient) {
    }

    public startLivenessSession() {
        this.livenessSessionRunning = true;
    }

    public onDocumentFrontCaptured(picture) {
        this.documentFrontPicture = picture;
    }

    public onDocumentBackCaptured(picture) {
        this.documentBackPicture = picture;
    }

    public onLivenessSessionStarted() {
    }

    public onLivenessCompleted(livenessData) {
        this.livenessPictures = livenessData.pictures;
        this.livenessSessionRunning = false;
    }

    public async verify() {
        if (!this.verifying) {
            this.verifying = true;
            this.verificationResults = null;
            this.verificationError = null;
            const selfieBytes = ImageUtils.convertImageToBlob(this.livenessPictures[0]);
            const documentFrontBytes = ImageUtils.convertImageToBlob(this.documentFrontPicture);
            const documentBackBytes = ImageUtils.convertImageToBlob(this.documentBackPicture);
            const formData = new FormData();
            formData.append('selfie', selfieBytes);
            formData.append('documentFront', documentFrontBytes);
            formData.append('documentBack', documentBackBytes);
            try {
                const verificationResults: any = await this.http.post('/biometrics_local/v1/verify_identity', formData, {headers: {Authorization: 'Bearer ' + environment.biometricsApiKey }}).toPromise();
                if (verificationResults.success && verificationResults.data.match) {
                    this.verificationResults = { match: verificationResults.data.match };
                    try {
                        const formDataDocument = new FormData();
                        formDataDocument.append('documentFront', documentFrontBytes);
                        formDataDocument.append('documentBack', documentBackBytes);
                        const documentResults: any = await this.http.post('/biometrics_local/v1/scan_document_data', formDataDocument, {headers: {Authorization: 'Bearer ' + environment.biometricsApiKey}}).toPromise();
                        if (documentResults.success && documentResults.data.documentData) {
                            this.verificationResults.documentData = documentResults.data.documentData;
                        }
                    } catch (e) {}
                } else {
                    this.verificationResults = { match: false };
                }
            } catch (e) {
                this.verificationResults = { match: false };
            }
            this.verifying = false;
        }
    }
}

import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {LivenessComponent} from './components/liveness/liveness.component';
import {HttpClientModule} from '@angular/common/http';
import {LivenessMarqueeComponent} from './components/liveness/liveness-marquee.component';
import {CameraComponent} from './components/camera/camera.component';
import {AngularMaterialModule} from './app-material.module';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {PictureGetterComponent} from './components/picture-getter/picture-getter.component';
import {IdentificationComponent} from './pages/identification/identification.component';

@NgModule({
    declarations: [
        AppComponent,
        IdentificationComponent,
        CameraComponent,
        PictureGetterComponent,
        LivenessComponent,
        LivenessMarqueeComponent
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        AngularMaterialModule,
        HttpClientModule
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule {
}

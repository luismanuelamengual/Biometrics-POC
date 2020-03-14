import {Injectable} from '@angular/core';
import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Observable} from 'rxjs';
import {environment} from '../../environments/environment';

@Injectable()
export class BiometricsInterceptor implements HttpInterceptor {

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        if (request.url.startsWith('/biometrics/')) {
            request = request.clone({
                url: request.url.replace('/biometrics/', environment.biometricsUrl + '/'),
                headers: request.headers.set('Authorization', 'Bearer ' + environment.biometricsApiKey)
            });
        }
        return next.handle(request);
    }
}

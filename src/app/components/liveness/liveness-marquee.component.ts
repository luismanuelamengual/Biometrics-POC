import {Component, Input} from '@angular/core';

@Component({
    selector: 'app-liveness-marquee',
    templateUrl: './liveness-marquee.component.html',
    styleUrls: ['./liveness-marquee.component.scss']
})
export class LivenessMarqueeComponent {

    @Input()
    active = false;
}

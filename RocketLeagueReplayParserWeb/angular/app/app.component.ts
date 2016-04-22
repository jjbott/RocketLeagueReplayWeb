import {Component} from 'angular2/core';


interface Window {
	players: any;
}


@Component({
    selector: 'my-app',
    template: `<ul>
	<li *ngFor="#a of actors">{{$index}}</li>
	</ul>`
})
export class AppComponent { 
	public actors = [];
	constructor(private window: Window) { window.players = this.actors; }

}
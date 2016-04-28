/// <reference path="./RenderService.ts"/>

import {Component, Input, Pipe, PipeTransform} from 'angular2/core';
import {Http, HTTP_PROVIDERS} from 'angular2/http';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/toPromise';

@Pipe({
    name: 'playerFilter',
    pure: false
})
export class PlayerFilter implements PipeTransform {
    transform(items: any[], args: any[]): any {
        return items.filter(item => item.currentState.TypeName == "TAGame.Default__PRI_TA");
    }
}

@Component({
    selector: '[player]',
    template: `<td class="{{player.currentState.Team.currentState.TypeName == 'Archetypes.Teams.Team0' ? 'team0' : 'team1'}}">{{player.currentState["Engine.PlayerReplicationInfo:PlayerName"]}}</td>
    <td>{{4 * player.currentState["Engine.PlayerReplicationInfo:Ping"] || 0}}</td>
    <td>{{player.currentState["TAGame.PRI_TA:MatchScore"] || 0}}</td>
    <td>{{player.currentState["TAGame.PRI_TA:MatchAssists"] || 0}}</td>
    <td>{{player.currentState["TAGame.PRI_TA:MatchSaves"] || 0}}</td>
    <td>{{player.currentState["TAGame.PRI_TA:MatchShots"] || 0}}</td>
    <td>{{player.currentState["TAGame.PRI_TA:MatchGoals"] || 0}}</td>
    <td>{{player.currentState.Vehicle.currentState["TAGame.Vehicle_TA:ReplicatedSteer"] || 0}}</td>
    <td>{{player.currentState.Vehicle.currentState["TAGame.Vehicle_TA:ReplicatedThrottle"] || 0}}</td>
    <td>{{(player.currentState.Vehicle && player.currentState.Vehicle.currentState.Boost && player.currentState.Vehicle.currentState.Boost.currentState["TAGame.CarComponent_TA:Active"]) ? "ON" : ""}}</td>
    `
})
export class PlayerListRow {
	@Input() player: Actor;

}

@Component({
    selector: 'player-list',
    directives: [PlayerListRow],
	pipes: [PlayerFilter],
	template: `Players
	 <table style="color:#FFFFFF">
	 	<tr>
	 		<th>Name</th>
	 		<th>Ping</th>
	 		<th>Score</th>
	 		<th>Assists</th>
	 		<th>Saves</th>
	 		<th>Shots</th>
	 		<th>Goals</th>
	 		<th>Steer</th>
	 		<th>Throttle</th>
	 		<th>Boost</th>
	 	</tr>
		<tr *ngFor="#a of actors | playerFilter" [player]="a"></tr>
	 </table>`
})
export class PlayerList {
	@Input() actors: Actor[]
}

@Component({
    selector: 'my-app',
    directives: [PlayerList],
    template: `<div class="ui" style="display:none">
	<div style="display: flex; position: fixed; top: 0; left: 0; right: 0; width: 30%; height: 4em; margin: auto;">
		<div class="center" style="order:1;width:30%;height:100%;"><div id="team0Score" style="background-color: #0000FF;color:#FFFFFF;font-size:2em;">0</div></div>
		<div class="center" style="order:3;width:30%;height:100%;"><div id="team1Score" style="background-color: #FF7700;color:#FFFFFF;font-size:2em;">0</div></div>
		<div class="center" style="order:2;width:40%;height:100%;"><div id="clockDisplay" style="background-color: #FFFFFF;color:#000000;font-size:2em;"></div></div>
	</div>
	
	<div id="players" style="position: fixed; top: 5%; left: 1%; margin: auto;color:#FFFFFF;background-color:rgba(0, 0, 0, 0.5);"><player-list [actors]="actors"></player-list></div>

	<div id="controls" style="display: flex; position: fixed; bottom: 0; left: 0; right: 0; width: 80%; height: 6em; margin: auto;padding:1em;">
		<div class="center2" id="pausePlay" style="order:1;width:10%;height:100%;margin:.5em;background-color: #FFFFFF;font-size:2em;border-radius:.5em;cursor:pointer;">
			play
			<span class="play"></span>
		</div>
		<div class="center2" style="order:2;width:90%;height:100%;margin:.5em;background-color: #FFFFFF;font-size:2em;border-radius:.5em;height:100%;">
			
				<div id="timeline" style="margin:1em;">
				</div>
				
		</div>
	</div>
	
	<div id="countdown"></div>
	
</div>
<div id="container"></div>
<ul>
	<li *ngFor="#a of actors">{{a.currentState["Engine.PlayerReplicationInfo:PlayerName"]}}</li>
	</ul>`,
	providers: [RenderService]
})
export class AppComponent { 
	public actors = [];
	constructor(private http: Http, private renderService: RenderService) {

		var stadium = http.get('/Content/Stadiums/default.json').map((x) => { return x.json() }).toPromise(); // old sketchy stadium
		var car = http.get('/Content/car6.json').map((x) => { return x.json() }).toPromise();
		var replay = http.get('/data/replays/817A479A475AF16E2D1E8E8138452FBA.replay.json').map((x) => { return x.json() }).toPromise();
		Promise.all([stadium, car, replay]).then((a) => {	
			var rs = renderService.init(document.getElementById('container'), this.actors, a[0], a[1], a[2]);
		});
	}
}




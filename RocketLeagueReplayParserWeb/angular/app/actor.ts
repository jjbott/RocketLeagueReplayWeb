//import Scene = THREE.Scene;
//import Mesh = THREE.Mesh;

class Actor { 
	private currentFrameIndex: number = -1;
	private frames: any = []; // todo: make Frame class
	public currentState: any = {}; // class needed?
	private unrenderedStateChanges: any = {};
	private nextRbStateFrameIndex: number = null;
	private mesh: Mesh = null;
	private colors: any;
	constructor(private actors:any, private carMesh: Mesh) {
		this.colors = (<any>window).colors; // Todo: make less bad. use less 'any'
	}

	addUpdate(time, state) {
		// Assuming these will all be added sequentially
		this.frames.push({time: time, state: state});
	}

	addDelete(time) {
		this.frames.push({time: time, state: null});
	}

	render(time, scene) {
		
		if ( this.currentFrameIndex >= 0 && time < this.frames[this.currentFrameIndex].time ) {
			// Time went backwards (or current time is less than the 1st frame's time)! Reset currentFrameIndex so we start over
			// We cant just traverse the states backwards, because they're built up from previous states
			if ( this.currentState.TypeName == "TAGame.Default__PRI_TA" ) {
				$('#player' + this.currentState.Id).remove();
////generatePlayerUi(); 
			}
			
			if ( this.mesh ) { 
				scene.remove(this.mesh);
				this.mesh = null;
			}
			
			this.currentFrameIndex = -1;
			this.currentState = {};
			
		}
		
		// Advance to the correct frame, updating the current state along the way. 
		while((this.currentFrameIndex+1) < this.frames.length && this.frames[this.currentFrameIndex+1].time <= time) {
			this.currentFrameIndex++;
			var frame = this.frames[this.currentFrameIndex];
			if ( !frame.state ) {
				if ( this.currentState.TypeName == "TAGame.Default__PRI_TA" ) {
					$('#player' + this.currentState.Id).remove();
//////generatePlayerUi();
				}
				
				this.currentState = {};
				// If we've blown through multiple frames in this render, we may have unrendered changes
				// Oh well. This might become a problem though. Keep an eye on it.
				this.unrenderedStateChanges = {};
				if ( this.mesh ) { 
					scene.remove(this.mesh);
					this.mesh = null;
				}
			}
			else {
				for(var prop in frame.state) {
					if ( frame.state.hasOwnProperty(prop) ) {
						this.unrenderedStateChanges[prop] = this.currentState[prop] = frame.state[prop];
					}
				}
			}
			
			this.nextRbStateFrameIndex = null;
			if ( this.currentState["TAGame.RBActor_TA:ReplicatedRBState"] ) {
				// Find the name rbState for interpolation purposes
				for(var i = this.currentFrameIndex+1; i < this.frames.length; ++i) {
					if ( !this.frames[i].state ) {
						// We found a delete before an rb state, so there is no next rb state
						break;
					}
					else if ( this.frames[i].state["TAGame.RBActor_TA:ReplicatedRBState"] ) {
						this.nextRbStateFrameIndex = i;
						break;
					}
				}
			}
		}
		
		if ( this.unrenderedStateChanges.TypeName ) {
			if (this.currentState.TypeName == "TAGame.Default__PRI_TA") {
				// Add a ref to the team actor, to make the UI a bit easier.
				var teamId = this.currentState["Engine.PlayerReplicationInfo:Team"].ActorId;
				this.currentState.Team = this.actors[teamId];
			}
			//console.log(time + ": New actor created: " + this.unrenderedStateChanges.TypeName);
		}

		if ( this.unrenderedStateChanges.ClassName ) {
			if (this.currentState.ClassName == "TAGame.Car_TA") {
				// Add refs between the car and player to make the UI easier
				// So far only used for showing replicated steering and similar in the player list, so may not be necessary once that's removed.
				var playerActorId = this.currentState["Engine.Pawn:PlayerReplicationInfo"].ActorId;
				this.currentState.Player = this.actors[playerActorId];
				this.actors[playerActorId].currentState.Vehicle = this;
			}
		}

		if (this.unrenderedStateChanges["TAGame.CarComponent_TA:Vehicle"]) {
			var vehicleActorId = this.currentState["TAGame.CarComponent_TA:Vehicle"][1]; // TODO: Fix when JSON is fixed to name this "ActorId"
			this.actors[vehicleActorId].currentState.Boost = this;
		}
		
		if ( this.unrenderedStateChanges["TAGame.GameEvent_TA:ReplicatedGameStateTimeRemaining"] ) {
			// Storing the time to be used later when rendering the countdown
			this.currentState["TAGame.GameEvent_TA:ReplicatedGameStateTimestamp"] = this.frames[this.currentFrameIndex].time;
		}
		
		if ( this.unrenderedStateChanges["TAGame.GameEvent_TA:ReplicatedGameStateTimeRemaining"] === 0 ) {
			var countdownStart = this.currentState["TAGame.GameEvent_TA:ReplicatedGameStateTimestamp"];
			if ( $("#countdown").text() != "GO" && (time - countdownStart) < 5 ) { // make sure we dont display "GO" after the user drags the slider around (make check if this change is in the current frame instead?)
				$("#countdown").text("GO").stop().fadeTo(0,1).fadeOut(1000); // Possibly tie fade out to clock time instead of relying on jquery?
			}
		}
		else if ( parseInt(this.currentState["TAGame.GameEvent_TA:ReplicatedGameStateTimeRemaining"]) > 0 ) {
			var countdownStart = this.currentState["TAGame.GameEvent_TA:ReplicatedGameStateTimestamp"];
			var countdownValue = Math.ceil(parseInt(this.currentState["TAGame.GameEvent_TA:ReplicatedGameStateTimeRemaining"]) - (time - countdownStart));
			
			if ( countdownValue > 0 ) { // Wait for start event before we display 0 (or 'GO'), lag might delay it
				var currentCountdownValue = parseInt($("#countdown").text());
				if ( currentCountdownValue != countdownValue ) {
					$("#countdown").text(countdownValue).stop().fadeTo(0,1).fadeOut(1000);
				}
			}
		}
		
		if ( this.unrenderedStateChanges["TAGame.GameEvent_TA:ReplicatedStateIndex"] ) {
			console.log(time + ": Changed Game State: " + this.unrenderedStateChanges["TAGame.GameEvent_TA:ReplicatedStateIndex"]);
		}
		
		if ( this.unrenderedStateChanges["Engine.PlayerReplicationInfo:PlayerName"] ) {
			console.log(time + ": New player added: " + this.unrenderedStateChanges["Engine.PlayerReplicationInfo:PlayerName"]);
		}
		
		if ( this.unrenderedStateChanges["TAGame.GameEvent_Soccar_TA:SecondsRemaining"] ) {
			var s = parseInt(this.unrenderedStateChanges["TAGame.GameEvent_Soccar_TA:SecondsRemaining"]);
			var m = Math.floor(s / 60);
			s %= 60;
			var secs = ('00'+s).substring((''+s).length);
			document.getElementById('clockDisplay').innerText = m + ":" + secs;
			//console.log(time + ": Time remaining: " + this.unrenderedStateChanges["TAGame.GameEvent_Soccar_TA:SecondsRemaining"]);
		}
		
		if ( this.unrenderedStateChanges["TAGame.GameEvent_Soccar_TA:bOverTime"] ) {
			document.getElementById('clockDisplay').innerText = "OVERTIME";
		}
		
		 if ( this.unrenderedStateChanges["Engine.TeamInfo:Score"] ) {
			var id = 'team0Score';
			if ( this.currentState.TypeName == "Archetypes.Teams.Team1" ) id = "team1Score";
			
			document.getElementById(id).innerText = this.unrenderedStateChanges["Engine.TeamInfo:Score"];
		}
		
		if ( this.unrenderedStateChanges["TAGame.Vehicle_TA:ReplicatedSteer"] ) {
			// This doesnt work
			/*
			if ( this.mesh ) {
				var steer = this.unrenderedStateChanges["TAGame.Vehicle_TA:ReplicatedSteer"];
				var angle = (steer - 128) / 255; 
				
				this.mesh.children[2].rotateX(angle);
				this.mesh.children[3].rotateX(angle);
				this.mesh.children[4].rotateX(angle);
				this.mesh.children[5].rotateX(angle);
			}
			*/
		}
		
		var rbState = this.currentState["TAGame.RBActor_TA:ReplicatedRBState"];
		
		if ( this.currentState.ClassName == "TAGame.Car_TA" && rbState) {
			if ( !this.mesh ) {
				// TODO: This mesh generation should live somewhere else
				this.mesh = this.carMesh.clone();
				var paintSettings = this.currentState["TAGame.Car_TA:TeamPaint"];
				
				var accentMaterial = new THREE.MeshPhongMaterial({
					color : this.colors.accent[paintSettings.CustomColorId],
					shading : THREE.FlatShading
				});
				
				(<Mesh>this.mesh.children[1]).material = accentMaterial;
				
				var teamMaterial = new THREE.MeshPhongMaterial({
					color : paintSettings.TeamNumber == 0 ? this.colors.blueTeam[paintSettings.TeamColorId] : this.colors.orangeTeam[paintSettings.TeamColorId],
					shading : THREE.FlatShading
				});
				
				(<Mesh>this.mesh.children[0]).material = teamMaterial;
				
				/*
				var playerId = this.currentState["Engine.Pawn:PlayerReplicationInfo"].ActorId;
				var teamId = actors[playerId].currentState["Engine.PlayerReplicationInfo:Team"].ActorId;
				var team = actors[teamId];
				var material;
				var geometry = new THREE.BoxGeometry(150, 75, 75);
				if (team.currentState.TypeName == "Archetypes.Teams.Team0") {
					material = new THREE.MeshPhongMaterial({
							color : 0x0000ff,
							shading : THREE.FlatShading
						});
				} else {
					material = new THREE.MeshPhongMaterial({
							color : 0xff7777,
							shading : THREE.FlatShading
						});
				}
				this.mesh = new THREE.Mesh(geometry, material);
				this.mesh.matrixAutoUpdate = true;
				this.mesh.castShadow = true;
				this.mesh.receiveShadow = true;*/
				this.mesh.receiveShadow = false;
				scene.add(this.mesh);
			}
		}
		
		if ( this.currentState.ClassName == "TAGame.Ball_TA" && rbState ) {
			if ( !this.mesh ) {
				var geometry = new THREE.IcosahedronGeometry(125, 1);
				var material1 = new THREE.MeshPhongMaterial({
						color : 0x777777,
						shading : THREE.FlatShading
					});
				var material2 = new THREE.MeshPhongMaterial({
						color : 0xFFFFFF,
						shading : THREE.FlatShading
					});

				var materials = [material1, material2]

				for (var k = 0; k < geometry.faces.length; ++k) {
					geometry.faces[k].materialIndex = k % 2;
				}
				this.mesh = new THREE.Mesh(geometry, new THREE.MeshFaceMaterial(materials));
				this.mesh.matrixAutoUpdate = true;
				this.mesh.castShadow = true;
				this.mesh.receiveShadow = true;
				scene.add(this.mesh);
			}
		}
			
		if ( this.mesh && rbState ) {
			// iterpolation based on the velocities is hard to nail down. 
			// If it's used in real life, there is some scaling factor? 
			// The Z velocities dont make a lot of sense though.
			/*
			this.mesh.position.set((rbState.Position.X + rbState.LinearVelocity.X * d * 0.111399) * -1, 
				(rbState.Position.Y + rbState.LinearVelocity.Y * d * 0.111399), 
				(rbState.Position.Z + rbState.LinearVelocity.Z * d * 0.111399));
				*/
			if (this.nextRbStateFrameIndex && !rbState.Sleeping) {
				var thisFrame = this.frames[this.currentFrameIndex];
				var nextFrame = this.frames[this.nextRbStateFrameIndex];
				var rbDelta = nextFrame.time - thisFrame.time;
				var tDelta = time - thisFrame.time;
				var percent = tDelta / rbDelta;
				var nextRbState = nextFrame.state["TAGame.RBActor_TA:ReplicatedRBState"];
				var x = rbState.Position.X + (nextRbState.Position.X - rbState.Position.X) * percent;
				var y = rbState.Position.Y + (nextRbState.Position.Y - rbState.Position.Y) * percent;
				var z = rbState.Position.Z + (nextRbState.Position.Z - rbState.Position.Z) * percent;
				this.mesh.position.set(x, y, z);

				// Linear rotation interpolation for now. Maybe slerp someday.

				x = interpolateAngle(rbState.Rotation.X, nextRbState.Rotation.X, percent);
				y = interpolateAngle(rbState.Rotation.Y, nextRbState.Rotation.Y, percent);
				z = interpolateAngle(rbState.Rotation.Z, nextRbState.Rotation.Z, percent);

				// Not sure why this is slightly different than the old version
				this.mesh.rotation.set(z * Math.PI * -1, x * Math.PI /** -1*/, y * Math.PI /** -1*/, 'ZYX');

			}
			else {
				this.mesh.position.set(rbState.Position.X, rbState.Position.Y, rbState.Position.Z);
				this.mesh.rotation.set(rbState.Rotation.Z * Math.PI * -1, rbState.Rotation.X * Math.PI /** -1*/, rbState.Rotation.Y * Math.PI /** -1*/, 'ZYX');
			}			
		}
		
		this.unrenderedStateChanges = {};
	}
};

function interpolateAngle(currentAngle, nextAngle, percent) {
	var diff = nextAngle - currentAngle;
	
	if ( Math.abs(diff + 2) < Math.abs(diff) ) diff += 2;
	if ( Math.abs(diff - 2) < Math.abs(diff) ) diff -= 2;
	
	var interpAngle = currentAngle + diff * percent;
	if (interpAngle < -1 ) interpAngle += 2;
	if (interpAngle > 1 ) interpAngle -= 2;
	return interpAngle;
}
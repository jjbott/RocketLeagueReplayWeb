var camera,
controls,
scene,
renderer;

var actors = {};

var clock = new THREE.Clock();
clock.autoStart = false;
	
var calc2DPoint = function(worldVector, renderer, camera)
{
	var vector = worldVector.project(camera)
	var halfWidth = renderer.domElement.width / 2;
	var halfHeight = renderer.domElement.height / 2;
	return {
		x: Math.round(vector.x * halfWidth + halfWidth),
		y: Math.round(-vector.y * halfHeight + halfHeight)
	};
}

document.addEventListener("DOMContentLoaded", function (event) {

	if (!Detector.webgl) {
		Detector.addGetWebGLMessage();
		return;
	}

	
	$('#pausePlay').click(function(){
		if ( clock.running ) {
			$('#pausePlay').text("play");
			clock.stop();
		}
		else { 
			$('#pausePlay').text("pause");
			clock.start();
		}
	});
	
	var carmesh;

	var animData;
	var startTime = 0;
	//var mesh;
	init();

	function init() {

		scene = new THREE.Scene();

		renderer = new THREE.WebGLRenderer();
		renderer.setClearColor(0xcccccc);
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.shadowMap.enabled = true;

		var container = document.getElementById('container');
		container.appendChild(renderer.domElement);

		camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 30000);

		camera.position.set(0, -6000, 1000);

		camera.up = new THREE.Vector3(0, 0, 1);

		controls = new THREE.OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = 0.25;
		// world
		
		// old sketchy stadium
		var loader = new THREE.JSONLoader();
		loader.load('/Content/Stadiums/default.json', function (geometry) {
		
			var material = new THREE.MeshPhongMaterial({
				color: 0xaaffaa,
				shading: THREE.FlatShading
			});
	  
			
			var mesh = new THREE.Mesh(
				geometry,
				material
			);
			
			mesh.castShadow = false;
			mesh.receiveShadow = true;
		  
			scene.add(mesh);
			
			// lights to fake team coloring
			
			light = new THREE.DirectionalLight(0x002288);
			light.position.set(1, 1, -1);
			scene.add(light);
			
			light = new THREE.DirectionalLight(0x882222);
			light.position.set(-1, -1, -1);
			scene.add(light);
		});
		
		var objLoader = new THREE.ObjectLoader();
		objLoader.load('/Content/car6.json', function (obj) {
		
			carmesh = obj.children[0];
			carmesh.castShadow = true;
			carmesh.receiveShadow = true;
		});
		
		// lights

		light = new THREE.DirectionalLight(0xffffff);
		light.position.set(0, 0, 5000);
		light.castShadow = true;
		light.shadow.camera.left = -5000;
		light.shadow.camera.right = 5000;
		light.shadow.camera.top = 5000;
		light.shadow.camera.bottom = -5000;
		light.shadow.camera.near = 2000;
		light.shadow.camera.far = 6000;

		
		
		scene.add(light);

		light = new THREE.AmbientLight(0x222222);
		scene.add(light);

		// TODO: all json loaders need to be promisized. No guarantee this will finish last!
		$.getJSON("/data/replays/817A479A475AF16E2D1E8E8138452FBA.replay.json", function(data) {
			initializeAnimation(data);
			$('.ui').show();
			animate2();
		});

		window.addEventListener('resize', onWindowResize, false);

	}
	
	function initializeAnimation(replay) {
		var id = replay.Properties.Id;
		var minTime = replay.Frames[0].Time;
		var maxTime = replay.Frames[replay.Frames.length-1].Time;
		for(var i = 0; i < replay.Frames.length; ++i) {
			if ( replay.Frames[i] ) { // TODO: get rid of null frames!
				processFrame(replay.Frames[i]);
			}
		}
		startTime = minTime;
	
		
		$( "#timeline" ).slider({
			min: minTime,
			max: maxTime,
			orientation: "horizontal",
			start: function( event, ui ) {
				this.resumeOnStop = clock.running;
				clock.stop();
			},
			stop: function( event, ui ) {
				clock.elapsedTime = ui.value - startTime;
				if ( this.resumeOnStop ) {
					clock.start();
				}
			}
		});
		
		for(var i = 0; i < replay.TickMarks.length; ++i) {
			var div = document.createElement("div");
			div.className = "tick";
			div.innerText = "G";
			div.style = 'left:' + 100 * (replay.TickMarks[i].Time-minTime)/(maxTime-minTime) + '%';
			if ( replay.TickMarks[i].Type == 'Team0Goal' ) {
				div.style.color = '#8888FF';
			}
			else {
				div.style.color = '#FF8844';
			}
			$('#timeline').prepend(div);
		}
	}

	//var replay;
	//var nextFrameIndex = 0;

	function animate2() {
		var time = clock.getElapsedTime();
		if ( clock.running ) {
			$( "#timeline" ).slider( "option", "value", time  + startTime );
		}
		for(var a in actors) {
			if ( actors.hasOwnProperty(a) ) {
				actors[a].render(time + startTime, scene);
			}
		}
		
		requestAnimationFrame(animate2);
		controls.update(); // required if controls.enableDamping = true, or if controls.autoRotate = true
		render();
	}
	
	function processFrame(f) {
		if ( f.DeletedActorIds ) {
			for(var i = 0; i < f.DeletedActorIds.length; ++i) {
				actors[f.DeletedActorIds[i]].addDelete(f.Time);
			}
		}
		
		if ( f.ActorUpdates ) {
			for(var i = 0; i < f.ActorUpdates.length; ++i) {
				var a = f.ActorUpdates[i];
				if (!actors.hasOwnProperty(a.Id)) {
					actors[a.Id] = new Actor();
				}
				
				actors[a.Id].addUpdate(f.Time, a);
			}
		}
	}
	
	function Actor() {
		this.currentFrameIndex = -1;
		this.frames = [];
		this.currentState = {};
		this.unrenderedStateChanges = {};
		this.nextRbStateFrameIndex = null;
		this.mesh = null;
		this.addUpdate = function(time, state) {
			// Assuming these will all be added sequentially
			this.frames.push({time: time, state: state});
		}
		this.addDelete = function(time) {
			this.frames.push({time: time, state: null});
		}
		this.render = function(time, scene) {
			
			if ( this.currentFrameIndex >= 0 && time < this.frames[this.currentFrameIndex].time ) {
				// Time went backwards (or current time is less than the 1st frame's time)! Reset currentFrameIndex so we start over
				// We cant just traverse the states backwards, because they're built up from previous states
				if ( this.currentState.TypeName == "TAGame.Default__PRI_TA" ) {
					$('#player' + this.currentState.Id).remove();
					generatePlayerUi();
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
						generatePlayerUi();
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
			
			if ( this.currentState.TypeName ) {
				if ( this.currentState.TypeName == "some kinda car, dude" ) {
					// add car mesh to scene if we have a position.
				}
			}
			
			if ( this.unrenderedStateChanges.TypeName ) {
				//console.log(time + ": New actor created: " + this.unrenderedStateChanges.TypeName);
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
					var currentCountdownValue = $("#countdown").text();
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
				generatePlayerUi();
				
				var div = document.createElement("div");
				div.id = 'player' + this.currentState.Id;
				div.innerText = this.unrenderedStateChanges["Engine.PlayerReplicationInfo:PlayerName"];
				div.style = 'top:-10000px;left:-10000px;';
				div.className = 'nameTag';
				
				var teamId = this.currentState["Engine.PlayerReplicationInfo:Team"].ActorId
				var team = actors[teamId];
				if (team.currentState.TypeName == "Archetypes.Teams.Team0") {
					div.style.color = '#8888FF';
				}
				else {
					div.style.color = '#FF8844';
				}
				document.body.appendChild(div);
			}
			
			if ( this.unrenderedStateChanges["TAGame.GameEvent_Soccar_TA:SecondsRemaining"] ) {
				var s = parseInt(this.unrenderedStateChanges["TAGame.GameEvent_Soccar_TA:SecondsRemaining"]);
				var m = Math.floor(s / 60);
				s %= 60;
				s = ('00'+s).substring((''+s).length);
				document.getElementById('clockDisplay').innerText = m + ":" + s;
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
			
			var rbState = this.currentState["TAGame.RBActor_TA:ReplicatedRBState"];
			
			if ( this.currentState.ClassName == "TAGame.Car_TA" && rbState) {
				if ( !this.mesh ) {
					this.mesh = carmesh.clone();
					var paintSettings = this.currentState["TAGame.Car_TA:TeamPaint"];
					
					var accentMaterial = new THREE.MeshPhongMaterial({
						color : colors.accent[paintSettings.CustomColorId],
						shading : THREE.FlatShading
					});
					
					this.mesh.children[1].material = accentMaterial;
					
					var teamMaterial = new THREE.MeshPhongMaterial({
						color : paintSettings.TeamNumber == 0 ? colors.blueTeam[paintSettings.TeamColorId] : colors.orangeTeam[paintSettings.TeamColorId],
						shading : THREE.FlatShading
					});
					
					this.mesh.children[0].material = teamMaterial;
					
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

					materials = [material1, material2]

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
				if ( this.nextRbStateFrameIndex && !rbState.Sleeping ) {
					var thisFrame = this.frames[this.currentFrameIndex];
					var nextFrame = this.frames[this.nextRbStateFrameIndex];
					var rbDelta = nextFrame.time - thisFrame.time;
					var tDelta = time - thisFrame.time;
					var percent = tDelta/rbDelta;
					var nextRbState = nextFrame.state["TAGame.RBActor_TA:ReplicatedRBState"];
					var x = rbState.Position.X + (nextRbState.Position.X - rbState.Position.X) * percent;
					var y = rbState.Position.Y + (nextRbState.Position.Y - rbState.Position.Y) * percent;
					var z = rbState.Position.Z + (nextRbState.Position.Z - rbState.Position.Z) * percent;
					this.mesh.position.set(x,y,z);
					
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
				
				if ( this.currentState["Engine.Pawn:PlayerReplicationInfo"] ) {
					var actorId = this.currentState["Engine.Pawn:PlayerReplicationInfo"].ActorId;
					var div = document.getElementById("player" + actorId);
					if ( div ) {
						var pos = this.mesh.position.clone();
						pos.z += 200;
						var pos = calc2DPoint(pos, renderer, camera);
						div.style.top = pos.y-20;
						div.style.left = pos.x;
					}
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
	
	function generatePlayerUi() {
		// Man I should be using Angular or something instead of this nonsense.
		var html = "Players";
		for(var a in actors) {
			if ( actors.hasOwnProperty(a) && actors[a].currentState.TypeName == "TAGame.Default__PRI_TA" ) {
				var teamId = actors[a].currentState["Engine.PlayerReplicationInfo:Team"].ActorId;
				var color = 'FF7700';
				if (actors[teamId] && actors[teamId].currentState && actors[teamId].currentState.TypeName == "Archetypes.Teams.Team1") {
					color = '8888FF';
				}
				html += "<div style=\"color:#" + color + ";\">" + actors[a].currentState["Engine.PlayerReplicationInfo:PlayerName"] + "</div>";
			}
		}
		document.getElementById("players").innerHTML = html;
		
	}
		
	function onWindowResize() {

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		renderer.setSize(window.innerWidth, window.innerHeight);

	}

	var objects = {};
	var lastAnimIndex = -1;
	var ballPosition = [0, 0, 0];
	var carPosition = [0, 0, 0];

	function animate() {
		var time = clock.getElapsedTime();

		for (i = lastAnimIndex + 1; i < animData.length; ++i) {
			if (animData[i].time <= time) {
				lastAnimIndex = i;

				for (var j = 0; j < animData[i].actors.length; ++j) {
					var actor = animData[i].actors[j];
					if (!objects[actor.id]) {
						var mesh;
						if (actor.type == 'ball') {
							//geometry = new THREE.SphereGeometry(125, 32, 32);

							var geometry = new THREE.IcosahedronGeometry(125, 1);
							var material1 = new THREE.MeshPhongMaterial({
									color : 0x777777,
									shading : THREE.FlatShading
								});
							var material2 = new THREE.MeshPhongMaterial({
									color : 0xFFFFFF,
									shading : THREE.FlatShading
								});

							materials = [material1, material2]

							for (var k = 0; k < geometry.faces.length; ++k) {
								geometry.faces[k].materialIndex = k % 2;
							}
							mesh = new THREE.Mesh(geometry, new THREE.MeshFaceMaterial(materials));

						} else {
							var material;
							var geometry = new THREE.BoxGeometry(150, 75, 75);
							if (actor.y < 0) {
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
							mesh = new THREE.Mesh(geometry, material);
						}

						//var mesh = new THREE.Mesh(geometry, new THREE.MeshFaceMaterial(materials));
						mesh.matrixAutoUpdate = true;
						mesh.castShadow = true;
						mesh.receiveShadow = true;
						scene.add(mesh);
						objects[actor.id] = mesh;
					}

					if (actor.type == 'ball') {
						ballPosition = [actor.x * -1, actor.y, actor.z];
					} else {
						carPosition = [actor.x * -1, actor.y, actor.z];
					}

					objects[actor.id].position.set(actor.x * -1, actor.y, actor.z);

					objects[actor.id].rotation.set(actor.yaw * Math.PI * -1, actor.pitch * Math.PI * -1, actor.roll * Math.PI * -1, 'ZYX');

				}
			} else {
				break;
			}
		}

		requestAnimationFrame(animate);

		controls.update(); // required if controls.enableDamping = true, or if controls.autoRotate = true

		render();

	}

	function render() {

		renderer.render(scene, camera);
	}
});

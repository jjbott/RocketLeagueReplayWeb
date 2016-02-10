document.addEventListener("DOMContentLoaded", function(event) { 

	if (!Detector.webgl) Detector.addGetWebGLMessage();

	var clock = new THREE.Clock();

	var camera, controls, scene, renderer;

	var animData;
	var mesh;
	init();

	function init() {

		scene = new THREE.Scene();

		renderer = new THREE.WebGLRenderer();
		renderer.setClearColor(0xcccccc);
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.shadowMapEnabled = true;

		var container = document.getElementById('container');
		container.appendChild(renderer.domElement);

		camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 30000);

		camera.position.set(0, -6000, 1000);

		camera.up = new THREE.Vector3(0, 0, 1);

		controls = new THREE.OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = 0.25;
		// world
		
		
		var loader = new THREE.JSONLoader(); // init the loader util

	// init loading
	loader.load('/Content/Stadiums/default.json', function (geometry) {
	  // create a new material
	  var material = new THREE.MeshPhongMaterial({
						color: 0xaaffaa,
						shading: THREE.FlatShading
					});
	  
	  // create a mesh with models geometry and material
	  var mesh = new THREE.Mesh(
		geometry,
		material
	  );
		
		mesh.castShadow = false;
		mesh.receiveShadow = true;
	  
	  scene.add(mesh);
	});

		[-4077, 4077].forEach(function(x) {
			[-5976, 5977].forEach(function(y) {
				[14, 2027].forEach(function(z) {

					var geometry = new THREE.SphereGeometry(100, 32, 32);
					var material = new THREE.MeshPhongMaterial({
						color: 0xff0000,
						shading: THREE.FlatShading
					});

					mesh = new THREE.Mesh(geometry, material);
					mesh.matrixAutoUpdate = true;
					mesh.position.set(x, y, z);

					scene.add(mesh);
				});
			});
		});


		// lights

		light = new THREE.DirectionalLight(0xffffff);
		light.castShadow = true;
		light.shadowCameraLeft = -5000;
	light.shadowCameraRight = 5000;
	light.shadowCameraTop = 5000;
	light.shadowCameraBottom = -5000;
		light.position.set(0, 0, 5000);
		scene.add(light);

		light = new THREE.DirectionalLight(0x002288);
		light.position.set(1, 1, -1);
		scene.add(light);
		
		light = new THREE.DirectionalLight(0x882222);
		light.position.set(-1, -1, -1);
		scene.add(light);

		light = new THREE.AmbientLight(0x222222);
		scene.add(light);

		//
		$.getJSON("/data/replays/2BA326B94CED68147B73E28BF4A41C56.json", function(data) {
			animData = data;
			animate();
		});

		window.addEventListener('resize', onWindowResize, false);

	}

	function onWindowResize() {

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		renderer.setSize(window.innerWidth, window.innerHeight);

	}

	var objects = {};
	var lastAnimIndex = -1;
	var ballPosition = [0,0,0];
	var carPosition = [0,0,0];

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
							
							var geometry = new THREE.IcosahedronGeometry( 125, 1);
							var material1 = new THREE.MeshPhongMaterial({color: 0x777777, shading: THREE.FlatShading });
							var material2 = new THREE.MeshPhongMaterial({color: 0xFFFFFF, shading: THREE.FlatShading });

							materials = [material1, material2]

							for(var k=0; k < geometry.faces.length; ++k)
							{
								geometry.faces[ k ].materialIndex = k%2;
							}                      
							mesh = new THREE.Mesh(geometry, new THREE.MeshFaceMaterial(materials));
							
						} else {
							var material;
							var geometry = new THREE.BoxGeometry(150, 75, 75);
							if ( actor.y < 0 )
							{
								material = new THREE.MeshPhongMaterial({
								color: 0x0000ff,
								shading: THREE.FlatShading
							});
							}
							else
							   {
								material = new THREE.MeshPhongMaterial({
									color: 0xff7777,
									shading: THREE.FlatShading
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
					}
					else
					{
						carPosition = [actor.x * -1, actor.y, actor.z];
					}

					objects[actor.id].position.set(actor.x * -1, actor.y, actor.z);
					
					objects[actor.id].rotation.set(actor.yaw * Math.PI * -1, actor.pitch * Math.PI * -1, actor.roll * Math.PI *-1, 'ZYX');


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

		document.getElementById('ballX').innerHTML = ballPosition[0].toString();
		document.getElementById('ballY').innerHTML = ballPosition[1].toString();
		document.getElementById('ballZ').innerHTML = ballPosition[2].toString();
		
		document.getElementById('carX').innerHTML = carPosition[0].toString();
		document.getElementById('carY').innerHTML = carPosition[1].toString();
		document.getElementById('carZ').innerHTML = carPosition[2].toString();
	}
});
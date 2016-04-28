/// <reference path="./Actor.ts"/>

import WebGLRenderer = THREE.WebGLRenderer;
import Scene = THREE.Scene;
import TrackballControls = THREE.OrbitControls;
import PerspectiveCamera = THREE.PerspectiveCamera;
import Mesh = THREE.Mesh;
import Clock = THREE.Clock;

class RenderService {
    private scene: Scene;
    private camera: PerspectiveCamera;
    private renderer: WebGLRenderer;
    private controls: TrackballControls;
    private clock: Clock;
    private startTime: number;

    private actors: Actor[];
    private carMesh: Mesh;

    public init(container: HTMLElement, actors : Actor[], stadium : any, car : any, replay : any) {
        //this.addStats();

        this.actors = actors;

        this.clock = new THREE.Clock();
        this.clock.autoStart = false;

        this.scene = new THREE.Scene();

        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setClearColor(0xcccccc);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;

        container.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 30000);

        this.camera.position.set(0, -6000, 1000);

        this.camera.up = new THREE.Vector3(0, 0, 1);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.25;

        this.initStadium(stadium);
        this.initCarMesh(car);

        // new sketchy stadium
        /*
                
                objLoader.load('/Content/stadiums/stadium.json', function (obj) {
        
                    obj.children[0].castShadow = false;
                    
                    obj.children[0].children[1].castShadow = false;
                    obj.children[0].children[0].castShadow = false;
                    obj.children[0].children[1].material.shading = THREE.FlatShading;
                    obj.children[0].children[0].material.shading = THREE.FlatShading;
                    
                    // Todo: get a less crappy material into the obj, or remove them completely if I'll be replacing them anyways
                    obj.children[0].material = new THREE.MeshPhongMaterial({
                        color : 0xaaffaa,
                        shading : THREE.FlatShading
                    });
                    obj.children[0].children[0].material = new THREE.MeshPhongMaterial({
                        color : 0x4444ff,
                        shading : THREE.FlatShading
                    });
                    obj.children[0].children[1].material = new THREE.MeshPhongMaterial({
                        color : 0xffaa44,
                        shading : THREE.FlatShading
                    });
                    scene.add(obj);
                });
        */
        

        // lights

        var light : any = new THREE.DirectionalLight(0xffffff);
        light.position.set(0, 0, 5000);
        light.castShadow = true;
        var shadowCamera: any = light.shadow.camera; // typings dont allow setting frustrum?
        shadowCamera.left = -5000;
        shadowCamera.right = 5000;
        shadowCamera.top = 5000;
        shadowCamera.bottom = -5000;
        shadowCamera.near = 2000;
        shadowCamera.far = 6000;


        this.scene.add(light);

        light = new THREE.AmbientLight(0x222222);
        this.scene.add(light);


        this.initAnimation(replay);


        // TODO: This is not very angulary
        var jqueryClock = this.clock;
        $('#pausePlay').click(function() {
            debugger;
            if (jqueryClock.running) {
                $('#pausePlay').text("play");
                jqueryClock.stop();
            }
            else {
                $('#pausePlay').text("pause");
                jqueryClock.start();
            }
        });
        $('.ui').show();

        this.animate();

        window.addEventListener('resize', _ => this.onResize());
    }

    initStadium(stadiumJson) {

        var loader = new THREE.JSONLoader();
        var stadiumMesh = loader.parse(stadiumJson);

        var material = new THREE.MeshPhongMaterial({
            color: 0xaaffaa,
            shading: THREE.FlatShading
        });

        var mesh = new THREE.Mesh(
            stadiumMesh.geometry,
            material
        );

        mesh.castShadow = false;
        mesh.receiveShadow = true;

        this.scene.add(mesh);

        // lights to fake team coloring

        var light: any = new THREE.DirectionalLight(0x002288);
        light.position.set(1, 1, -1);
        this.scene.add(light);

        light = new THREE.DirectionalLight(0x882222);
        light.position.set(-1, -1, -1);
        this.scene.add(light);
    }

    initCarMesh(carJson) {
        var loader = new THREE.ObjectLoader();
        var carMesh = loader.parse(carJson);
        this.carMesh = <Mesh>carMesh.children[0];
        this.carMesh.castShadow = true;
        this.carMesh.receiveShadow = true;
    }

    initAnimation(replay) {
        var id = replay.Properties.Id;
        var minTime = replay.Frames[0].Time;
        var maxTime = replay.Frames[replay.Frames.length - 1].Time;
        for (var i = 0; i < replay.Frames.length; ++i) {
            if (replay.Frames[i]) { // TODO: get rid of null frames!
                this.processFrame(replay.Frames[i]);
            }
        }
        this.startTime = minTime;

        // TODO: This is not very angulary
        var scope = this;
        (<any>$("#timeline")).slider({
            min: minTime,
            max: maxTime,
            orientation: "horizontal",
            start: function(event, ui) {
                this.resumeOnStop = scope.clock.running;
                scope.clock.stop();
            },
            stop: function(event, ui) {
                scope.clock.elapsedTime = ui.value - scope.startTime;
                if (this.resumeOnStop) {
                    scope.clock.start();
                }
            }
        });

        for (var i = 0; i < replay.TickMarks.length; ++i) {
            var div = document.createElement("div");
            div.className = "tick";
            div.innerText = "G";
            div.style.left = 100 * (replay.TickMarks[i].Time - minTime) / (maxTime - minTime) + '%';
            if (replay.TickMarks[i].Type == 'Team0Goal') {
                div.style.color = '#8888FF';
            }
            else {
                div.style.color = '#FF8844';
            }
            $('#timeline').prepend(div);
        }
    }

    private processFrame(f) {
        if (f.DeletedActorIds) {
            for (var i = 0; i < f.DeletedActorIds.length; ++i) {
                this.actors[f.DeletedActorIds[i]].addDelete(f.Time);
            }
        }

        if (f.ActorUpdates) {
            for (var i = 0; i < f.ActorUpdates.length; ++i) {
                var a = f.ActorUpdates[i];
                if (!this.actors.hasOwnProperty(a.Id)) {
                    this.actors[a.Id] = new Actor(this.actors, this.carMesh);
                }

                this.actors[a.Id].addUpdate(f.Time, a);
            }
        }
    }

/*
    public addStats() {
        this.stats = new Stats();
        document.body.appendChild(this.stats.domElement);
    }
*/

    public animate() {
        window.requestAnimationFrame(_ => this.animate());

        var time = this.clock.getElapsedTime();
         if (this.clock.running) {
            (<any>$("#timeline")).slider("option", "value", time + this.startTime);
        }
        

        for (var a in this.actors) {
            if (this.actors.hasOwnProperty(a)) {
                this.actors[a].render(time + this.startTime, this.scene);
            }
        }

        this.controls.update(); // required if controls.enableDamping = true, or if controls.autoRotate = true
        this.renderer.render(this.scene, this.camera);
    }

    public onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
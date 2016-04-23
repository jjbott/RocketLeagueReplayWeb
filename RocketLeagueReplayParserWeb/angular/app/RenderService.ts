import WebGLRenderer = THREE.WebGLRenderer;
import Scene = THREE.Scene;
import TrackballControls = THREE.OrbitControls;
import PerspectiveCamera = THREE.PerspectiveCamera;
import Mesh = THREE.Mesh;
import Clock = THREE.Clock;

export class RenderService {
    private scene: Scene;
    private camera: PerspectiveCamera;
    private renderer: WebGLRenderer;
    private controls: TrackballControls;
    private clock: Clock;

    private actors: Actor[];

    public init(container: HTMLElement) {
        //this.addStats();

        this.clock = new THREE.Clock();
        this.clock.autoStart = false;

        this.scene = new THREE.Scene();

        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setClearColor(0xcccccc);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;

        var container = document.getElementById('container');
        container.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 30000);

        this.camera.position.set(0, -6000, 1000);

        this.camera.up = new THREE.Vector3(0, 0, 1);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.25;
        // world

        // old sketchy stadium
        var loader = new THREE.JSONLoader();
        loader.load('/Content/Stadiums/default.json', function(geometry) {

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

            this.scene.add(mesh);

            // lights to fake team coloring

            let light = new THREE.DirectionalLight(0x002288);
            light.position.set(1, 1, -1);
            this.scene.add(light);

            light = new THREE.DirectionalLight(0x882222);
            light.position.set(-1, -1, -1);
            this.scene.add(light);
        });

        var objLoader = new THREE.ObjectLoader();

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
        objLoader.load('/Content/car6.json', function(obj) {

            this.this.this.carmesh = obj.children[0];
            this.this.carmesh.castShadow = true;
            this.carmesh.receiveShadow = true;
        });

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

        // TODO: all json loaders need to be promisized. No guarantee this will finish last!
        $.getJSON("/data/replays/817A479A475AF16E2D1E8E8138452FBA.replay.json", function(data) {
            //initializeAnimation(data);
            $('.ui').show();
            //animate2();
        });

        window.addEventListener('resize', _ => this.onResize());

    
    }
/*
    public addStats() {
        this.stats = new Stats();
        document.body.appendChild(this.stats.domElement);
    }
*/

    public animate() {
        window.requestAnimationFrame(_ => this.animate());

        var startTime = 0; // TODO: Fix this so it's set to the first frame time

        var time = this.clock.getElapsedTime();
         if (this.clock.running) {
            (<any>$("#timeline")).slider("option", "value", time + startTime);
        }
        

        for (var a in this.actors) {
            if (this.actors.hasOwnProperty(a)) {
                this.actors[a].render(time + startTime, this.scene);
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
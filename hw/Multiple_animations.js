var renderer = null, 
scene = null, 
camera = null,
root = null,
robot_idle = null,
robot_attack = null,
flamingo = null,
stork = null,
group = null,
mesh = null,
orbitControls = null,
robotGroup=new THREE.Object3D;
const mouse = new THREE.Vector2();
const windowHalf = new THREE.Vector2( window.innerWidth, window.innerHeight);
const target = new THREE.Vector2();
var array=[];
var deathArray=[];
deathArray[0]=Date.now();
var spawnTime=Date.now();
var robotCount=0;
var raycaster, INTERSECTED, CLICKED;

var animator = null;
var robot_mixer = [];
var deadAnimator;
var morphs = [];

var duration = 20000; // ms
var currentTime = Date.now();

var animation = "idle";

function initAnimations() 
{
    animator = new KF.KeyFrameAnimator;
    animator.init({ 
        interps:
            [
                { 
                    keys:[0, .5, 1], 
                    values:[
                            { y : 0 },
                            { y : Math.PI  },
                            { y : Math.PI * 2 },
                            ],
                },
            ],
        loop: false,
        duration:duration * 1000,
    });
}

function playAnimations()
{
    animator.start();
}

function createDeadAnimation(obj)
{
    var positionKF = new THREE.VectorKeyframeTrack( '.position', [ 0, 1, 2 ], [ 0, 0, 0, 30, 0, 0, 0, 0, 0 ] );

    var scaleKF = new THREE.VectorKeyframeTrack( '.scale', [ 0, 1, 2 ], [ 1, 1, 1, 2, 2, 2, 1, 1, 1 ] );

    var xAxis = new THREE.Vector3( 1, 0, 0 );
    var qInitial = new THREE.Quaternion().setFromAxisAngle( xAxis, 0 );
    var qFinal = new THREE.Quaternion().setFromAxisAngle( xAxis, Math.PI );
    var quaternionKF = new THREE.QuaternionKeyframeTrack( '.quaternion', [ 0, 1 ], [ qInitial.x, qInitial.y, qInitial.z, qInitial.w, qFinal.x, qFinal.y, qFinal.z, qFinal.w] );
    var clip = new THREE.AnimationClip( 'Action', 2, [ scaleKF, positionKF, quaternionKF] );
    var mixer = new THREE.AnimationMixer( obj );
    // create a ClipAction and set it to play
    var clipAction = mixer.clipAction( clip );
    clipAction.play();
}

function loadFBX(array,robotCount)
{
    var loader = new THREE.FBXLoader();
    loader.load( '../models/Robot/robot_walk.fbx', function ( object ) 
    {
        robot_mixer[robotCount] = {};
        robot_mixer[robotCount]["idle"] = new THREE.AnimationMixer( scene );
        robot_mixer["idle"] = new THREE.AnimationMixer( scene );
        object.scale.set(0.02, 0.02, 0.02);
        var cam = new THREE.Vector3(0, 0, 0);
        var angle=Math.random()*90;
        var xa = Math.cos(angle)*200;
        var y = Math.sin(angle)*200;
        object.position.x = xa;
        object.position.y = -6;
        object.position.z = y;
        object.lookAt(cam);

        object.traverse( function ( child ) {
            if ( child.isMesh ) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        } );
        robot_idle = object;
        robotGroup.add(robot_idle)
        scene.add( object );
        array[robotCount]=object;
        //array[robotCount]=count;
        deathArray[robotCount]=Date.now();
        

        robot_mixer[robotCount]["idle"].clipAction( object.animations[ 0 ], array[robotCount] ).play();
/*
        loader.load( '../models/Robot/robot_atk.fbx', function ( object ) 
        {
            robot_mixer[robotCount]["attack"] = new THREE.AnimationMixer( scene );
            robot_mixer[robotCount]["attack"].clipAction( object.animations[ 0 ], robot_idle ).play();
        } );

        loader.load( '../models/Robot/robot_walk.fbx', function ( object ) 
        {
            robot_mixer[robotCount]["walk"] = new THREE.AnimationMixer( scene );
            robot_mixer[robotCount]["walk"].clipAction( object.animations[ 0 ], robot_idle ).play();
        } );*/
    } );
}

function animate() {

    var now = Date.now();
    var deltat = now - currentTime;
    currentTime = now;
    //console.log(currentTime);
    if(robot_idle)
    {
        //robot_mixer[animation].update(deltat * 0.001);
        robot_mixer.forEach(function(element)
        {
            element["idle"].update(deltat * 0.001);
        }
        );
        array.forEach(function(element,index)
        {
            element.translateOnAxis(element.worldToLocal(new THREE.Vector3(0,-4,0)),.0001);
            //console.log("x"+element.position.x+" z"+element.position.z);
            if(deathArray[index]+11000<Date.now())
            {
                scene.remove(element);
                //console.log("ded");
            }
        }
        );
    }
    if(spawnTime+3000<Date.now())
    {
        spawnTime=Date.now();
        robotCount++;
        console.log("one more");
        loadFBX(array,robotCount);
    }
}

function run() {
    requestAnimationFrame(function() { run(); });
    
        // Render the scene
        renderer.render( scene, camera );

        raycaster = new THREE.Raycaster();
        document.addEventListener( 'mousemove', onDocumentMouseMove );
        document.addEventListener('mousedown', onDocumentMouseDown);

        // Spin the cube for next frame
        initAnimations()
        animate();

        // Update the camera controller
        orbitControls.update();
        target.x = ( 1 - mouse.xx ) * 0.002;
        target.y = ( 1 - mouse.yy ) * 0.002;
    
        camera.rotation.y += 2 * ( target.x - camera.rotation.y );
}

function setLightColor(light, r, g, b)
{
    r /= 255;
    g /= 255;
    b /= 255;
    
    light.color.setRGB(r, g, b);
}

var directionalLight = null;
var spotLight = null;
var ambientLight = null;
var mapUrl = "../images/checker_large.gif";

var SHADOW_MAP_WIDTH = 2048, SHADOW_MAP_HEIGHT = 2048;

function createScene(canvas) {
    
    const { width, height } = getWidthAndHeight();
    // Create the Three.js renderer and attach it to our canvas
    renderer = new THREE.WebGLRenderer( { canvas: canvas, antialias: true } );

    // Set the viewport size
    //canvas.height=height;
    renderer.setSize(width, height);

    // Turn on shadows
    renderer.shadowMap.enabled = true;
    // Options are THREE.BasicShadowMap, THREE.PCFShadowMap, PCFSoftShadowMap
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Create a new Three.js scene
    scene = new THREE.Scene();

    // Add  a camera so we can view the scene
    camera = new THREE.PerspectiveCamera( 45, canvas.width / canvas.height, 1, 4000 );
    camera.position.set(0, 0, 0);
    scene.add(camera);

    orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
        
    // Create a group to hold all the objects
    root = new THREE.Object3D;
    
    spotLight = new THREE.SpotLight (0xffffff);
    spotLight.position.set(-30, 8, -10);
    spotLight.target.position.set(-2, 0, -2);
    root.add(spotLight);

    spotLight.castShadow = true;

    spotLight.shadow.camera.near = 1;
    spotLight.shadow.camera.far = 200;
    spotLight.shadow.camera.fov = 45;
    
    spotLight.shadow.mapSize.width = SHADOW_MAP_WIDTH;
    spotLight.shadow.mapSize.height = SHADOW_MAP_HEIGHT;

    ambientLight = new THREE.AmbientLight ( 0x888888 );
    root.add(ambientLight);
    
    // Create the objects
    robotCount++;
    loadFBX(array,robotCount);
    robotCount++;
    loadFBX(array,robotCount);
    
    

    // Create a group to hold the objects
    group = new THREE.Object3D;
    root.add(group);

    // Create a texture map
    var map = new THREE.TextureLoader().load(mapUrl);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(8, 8);

    var color = 0xffffff;

    // Put in a ground plane to show off the lighting
    geometry = new THREE.PlaneGeometry(200, 200, 50, 50);
    mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({color:color, map:map, side:THREE.DoubleSide}));

    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -4;
    
    // Add the mesh to our group
    group.add( mesh );
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    
    // Now add the group to our scene
    scene.add( root );
    console.log(robot_mixer);
    console.log(scene.children);

    initAnimations();
}

function getWidthAndHeight() {
    const width = $(window).width();
    const height = $(window).height();
    console.log("hiegth"+height);
    return { width, height };
  }
  
  function onDocumentMouseMove( event ) 
{
    event.preventDefault();

	mouse.xx = ( event.clientX - windowHalf.x );
	mouse.yy = ( event.clientY - windowHalf.x );
    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    // find intersections
    raycaster.setFromCamera( mouse, camera );

    var intersects = raycaster.intersectObjects( scene.children, true );
    
    if ( intersects.length > 0 && intersects[0].object.name ) 
    {
        //console.log(intersects[0].object.name);
        if ( INTERSECTED != intersects[ 0 ].object ) 
        {
            if ( INTERSECTED )
                INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );

            INTERSECTED = intersects[ 0 ].object;
            INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
            INTERSECTED.material.emissive.setHex( 0xff0000 );
        }
    } 
    else 
    {
        if ( INTERSECTED ) 
            INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );

        INTERSECTED = null;
    }
}

function onDocumentMouseDown(event)
{
    event.preventDefault();
    event.preventDefault();
    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    // find intersections
    raycaster.setFromCamera( mouse, camera );

    var intersects = raycaster.intersectObjects(scene.children,true);

    //console.log("click");
    if ( intersects.length > 0 && intersects[0].object.name) 
    {
        CLICKED = intersects[ 0 ].object;
        //console.log(CLICKED);
        for(ii=1;ii<robotCount;ii++)
        {
            if(array[ii].children[2]==CLICKED)
            {
                if(!animator.running)
                {
                    /*for(var i = 0; i<= animator.interps.length -1; i++)
                    {
                        animator.interps[i].target = array[ii].rotation.y;
                        console.log(animator.interps[i]);
                    }*/
                    
                    //createDeadAnimation(array[ii]);
                    //console.log(array[ii]);
                    //playAnimations();
                }
                scene.remove(array[ii]);
            }
        }
        //console.log("toqye");
        CLICKED.material.emissive.setHex( 0x00ff00 );
        
    } 
    else 
    {
        if ( CLICKED ) 
            CLICKED.material.emissive.setHex( CLICKED.currentHex );

        CLICKED = null;
    }
}
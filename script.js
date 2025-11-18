// 1. Importar módulos
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- VARIABLES GLOBALES ---
let camera, scene, renderer;
let model;
let controls;
let vrGroup; 

// --- INICIALIZACIÓN ---
init();

function init() {
  	// Escena
  	scene = new THREE.Scene();
  	scene.background = new THREE.Color(0x222222);

  	// Cámara
  	camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);

  	camera.position.set(0, 1.6, 0.1); // 0.1 para no chocar con el punto exacto cero

  	// Luces
  	const ambientLight = new THREE.AmbientLight(0xffffff, 2.0); 
  	scene.add(ambientLight);
    
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x888888, 1.5);
    hemisphereLight.position.set(0, 3, 0);
    scene.add(hemisphereLight);

  	// Ayudantes
  	const gridHelper = new THREE.GridHelper(20, 20); 
  	scene.add(gridHelper);

  	// Renderizador
  	renderer = new THREE.WebGLRenderer({ antias: true });
  	renderer.setSize(window.innerWidth, window.innerHeight);
  	renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    
  	// VR
  	renderer.xr.enabled = true;
  	document.body.appendChild(renderer.domElement);
  	document.body.appendChild(VRButton.createButton(renderer));
  	 
  	// Controles
  	controls = new OrbitControls(camera, renderer.domElement);
  	controls.enableDamping = true;
  	controls.target.set(0, 1.6, -1); // Mirar hacia el frente
  	controls.update();

  	// Cargar Modelo
  	const loader = new FBXLoader();
    loader.setResourcePath('Sala/'); 

  	loader.load(
    	'Sala/Sala_v2.fbx', 
    	 
    	(fbx) => {
      	 	model = fbx;

        	
        	const bbox = new THREE.Box3().setFromObject(model);
        	const center = bbox.getCenter(new THREE.Vector3());
        	model.position.x -= center.x;
        	model.position.z -= center.z;
        	model.position.y -= bbox.min.y; 

        	// 2. Materiales
        	model.traverse((child) => {
            	if (child.isMesh) {
                	child.castShadow = true;
                	child.receiveShadow = true;
                	const materials = Array.isArray(child.material) ? child.material : [child.material];
                	
                	materials.forEach(mat => {
                        mat.side = THREE.DoubleSide; 
                        if (mat && mat.map) {
                        	mat.map.encoding = THREE.sRGBEncoding;
                            // Arreglo PNG
                            if (mat.map.image && mat.map.image.src.toLowerCase().endsWith('.png')) {
                            	mat.transparent = true;
                            	mat.alphaTest = 0.5; 
                        	} else {
                                mat.transparent = false; 
                            }
                    	}
                    	if (mat && (mat.name.toLowerCase().includes('glass') || mat.name.toLowerCase().includes('vidrio'))) {
                        	mat.transparent = true;
                        	mat.opacity = 0.2; 
                            mat.depthWrite = false;
                    	}
                	});
            	}
        	});
        	
        	// --- 3. POSICIÓN VR: CERO ABSOLUTO ---
        	vrGroup = new THREE.Group();
        	vrGroup.add(model); 

        	vrGroup.position.set(0, 0, 0); 
        	
    	 	scene.add(vrGroup);
    	 	console.log("Modelo cargado exitosamente.");
    	},
    	(xhr) => { console.log((xhr.loaded / xhr.total * 100) + '% cargado'); },
    	(error) => { console.error('Error al cargar el modelo FBX:', error); }
  	);
  	 
  	renderer.setAnimationLoop(animate);
  	window.addEventListener('resize', onWindowResize);
}

function animate() {
    if (renderer.xr.isPresenting === false) {
  	    controls.update();
    }
  	renderer.render(scene, camera);
}

function onWindowResize() {
  	camera.aspect = window.innerWidth / window.innerHeight;
  	camera.updateProjectionMatrix();
  	renderer.setSize(window.innerWidth, window.innerHeight);
}

// 1. Importar módulos de Three.js
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- VARIABLES GLOBALES ---
let camera, scene, renderer;
let model;
let controls;
let vrGroup; // Grupo para posicionar el modelo en VR

// --- INICIALIZACIÓN ---
init();

function init() {
  	// --- ESCENA ---
  	scene = new THREE.Scene();
  	scene.background = new THREE.Color(0x222222);

  	// --- CÁMARA ---
  	camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Posición inicial de la cámara en modo escritorio (dentro del salón)
  	camera.position.set(1.5, 1.6, 2.2);

  	// --- LUCES ---
  	const ambientLight = new THREE.AmbientLight(0xffffff, 2.0); // Luz ambiental alta
  	scene.add(ambientLight);
    
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x888888, 1.5); // Luz de cielo/suelo
    hemisphereLight.position.set(0, 3, 0);
    scene.add(hemisphereLight);

  	// --- AYUDANTES ---
  	const gridHelper = new THREE.GridHelper(20, 20); // Una cuadrícula en el piso
  	scene.add(gridHelper);

  	// --- RENDERIZADOR (RENDERER) ---
  	renderer = new THREE.WebGLRenderer({ antias: true });
  	renderer.setSize(window.innerWidth, window.innerHeight);
  	renderer.setPixelRatio(window.devicePixelRatio);
  	 
    // Corrección de color (sRGB) para texturas
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    
  	// Habilitar VR (WebXR)
  	renderer.xr.enabled = true;
  	document.body.appendChild(renderer.domElement);
  	 
  	// Añadir el botón de "Enter VR"
  	document.body.appendChild(VRButton.createButton(renderer));
  	 
  	// --- CONTROLES (Modo Escritorio) ---
  	controls = new OrbitControls(camera, renderer.domElement);
  	controls.enableDamping = true;
    // Hacia dónde mira la cámara al inicio
  	controls.target.set(1.5, 1.6, 0); 
  	controls.update();

  	// --- CARGADOR DE MODELO FBX ---
  	const loader = new FBXLoader();
    // Define dónde buscará las texturas (imágenes JPG/PNG)
    loader.setResourcePath('Sala/'); 

  	loader.load(
        // Carga el modelo (usamos 'v2' para evitar caché)
    	'Sala/Sala_v2.fbx',
    	 
    	// (onLoad) Se ejecuta cuando el modelo carga
    	(fbx) => {
    	 	model = fbx;

        	// Centra el modelo en el origen (0,0,0)
        	const bbox = new THREE.Box3().setFromObject(model);
        	const center = bbox.getCenter(new THREE.Vector3());
        	model.position.x -= center.x;
        	model.position.z -= center.z;
        	model.position.y -= bbox.min.y; // Pone el piso en Y=0

        	// Recorre el modelo para ajustar materiales
        	model.traverse((child) => {
            	if (child.isMesh) {
                	child.castShadow = true;
                	child.receiveShadow = true;
                	
                	const materials = Array.isArray(child.material) ? child.material : [child.material];
                	
                	materials.forEach(mat => {
                        // Hace que las caras se vean por ambos lados
                        mat.side = THREE.DoubleSide; 
                        
                        // Arregla el color de las texturas
                        if (mat && mat.map) {
                        	mat.map.encoding = THREE.sRGBEncoding;
                            
                            // Arregla la transparencia de archivos PNG (cuadros, venado)
                            if (mat.map.image && mat.map.image.src.toLowerCase().endsWith('.png')) {
                            	mat.transparent = true;
                            	mat.alphaTest = 0.5; // "Recorta" el fondo negro/transparente
                        	}
                    	}
                        // Arregla la transparencia de ventanas
                    	if (mat && (mat.name.toLowerCase().includes('glass') || mat.name.toLowerCase().includes('vidrio'))) {
                        	mat.transparent = true;
                        	mat.opacity = 0.2;
                    	}
                	});
            	}
        	});
        	
        	// --- POSICIÓN VR ---
            // En VR, el usuario está en (0,0,0), así que movemos el salón
        	vrGroup = new THREE.Group();
        	vrGroup.add(model); 

        	// Mueve el salón para que (0,0,0) sea el centro (1.5, 0, 2.2)
        	vrGroup.position.set(-1.5, 0, -2.2); 
        	
    	 	scene.add(vrGroup);
    	 	console.log("Modelo cargado exitosamente.");
    	},
    	 
    	// (onProgress) Muestra el progreso de carga
    	(xhr) => {
    	 	console.log((xhr.loaded / xhr.total * 100) + '% cargado');
    	},
  	 
    	// (onError) Muestra si hay un error
  	 	(error) => {
    	 	console.error('Error al cargar el modelo FBX:', error);
    	}
  	);
  	 
  	// Inicia el loop de animación
  	renderer.setAnimationLoop(animate);

  	// Ajusta la ventana si cambia de tamaño
  	window.addEventListener('resize', onWindowResize);
}

// --- FUNCIONES AUXILIARES ---

// Loop de animación (se ejecuta 60 veces por segundo)
function animate() {
    // Solo actualiza los controles del mouse si NO estamos en modo VR
    if (renderer.xr.isPresenting === false) {
  	    controls.update();
    }
    // Dibuja la escena
  	renderer.render(scene, camera);
}

// Función para manejar el re-escalado de la ventana
function onWindowResize() {
  	camera.aspect = window.innerWidth / window.innerHeight;
  	camera.updateProjectionMatrix();
  	renderer.setSize(window.innerWidth, window.innerHeight);
}

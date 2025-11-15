// Importamos los módulos necesarios
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- VARIABLES GLOBALES ---
let camera, scene, renderer;
let model; // Variable para guardar tu modelo
let controls; // Variable para los controles de la cámara
let vrGroup; // Grupo para posicionar el modelo en VR

// --- INICIALIZACIÓN ---
init();

function init() {
  	// 1. Escena
  	scene = new THREE.Scene();
  	scene.background = new THREE.Color(0x222222);

  	// 2. Cámara
  	camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // --- ¡POSICIÓN CORREGIDA! ---
    // Te pone en el centro del salón (1.5m en X, 2.0m en Z)
  	camera.position.set(1.5, 1.6, 2.0); // (X=1.5, Y=1.6, Z=2.0)

  	// 3. LUCES (Con intensidad alta para evitar VR oscura)
  	const ambientLight = new THREE.AmbientLight(0xffffff, 2.0); // Alta intensidad
  	scene.add(ambientLight);
    
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x888888, 1.5); // Alta intensidad
    hemisphereLight.position.set(0, 3, 0);
    scene.add(hemisphereLight);

  	// Añadimos una cuadrícula (GridHelper) como referencia
  	const gridHelper = new THREE.GridHelper(20, 20);
  	scene.add(gridHelper);

  	// 4. Renderizador (Renderer)
  	renderer = new THREE.WebGLRenderer({ antias: true });
  	renderer.setSize(window.innerWidth, window.innerHeight);
  	renderer.setPixelRatio(window.devicePixelRatio);
  	 
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    
  	// Habilitación de VR
  	renderer.xr.enabled = true;
  	document.body.appendChild(renderer.domElement);
  	 
  	// 5. Botón de VR
  	document.body.appendChild(VRButton.createButton(renderer));
  	 
  	// Inicializamos los OrbitControls (para modo escritorio)
  	controls = new OrbitControls(camera, renderer.domElement);
  	controls.enableDamping = true;
    // Apuntamos hacia la pared del fondo (hacia Z=0)
  	controls.target.set(1.5, 1.6, 0); 
  	controls.update();

  	// 6. Cargar el modelo FBX
  	const loader = new FBXLoader();
    
    // La ruta de las texturas sigue siendo "Sala/"
    loader.setResourcePath('Sala/'); 

  	loader.load(
        // --- ¡CARGA EL NUEVO MODELO PARA EVITAR CACHÉ! ---
    	'Sala/Sala_v2.fbx',
    	 
    	// -- onLoad (Cuando se carga bien) --
    	(fbx) => {
    	 	model = fbx;

        	// --- LÓGICA DE CENTRADO (Esto centra el salón en la esquina 0,0,0) ---
        	const bbox = new THREE.Box3().setFromObject(model);
        	const center = bbox.getCenter(new THREE.Vector3());
        	model.position.x -= center.x;
        	model.position.z -= center.z;
        	model.position.y -= bbox.min.y; // Pone el piso en Y=0

        	// --- LÓGICA DE TEXTURAS (Piso, Cuadros, Ventanas) ---
        	model.traverse((child) => {
            	if (child.isMesh) {
                	child.castShadow = true;
                	child.receiveShadow = true;
                	
                	const materials = Array.isArray(child.material) ? child.material : [child.material];
                	
                	materials.forEach(mat => {
                        // Hace que el piso y paredes se vean por ambos lados
                        mat.side = THREE.DoubleSide; 

                    	// 1. Arregla el color de TODAS las texturas
                        if (mat && mat.map) {
                        	mat.map.encoding = THREE.sRGBEncoding;
                        	// 2. Arregla PNGs transparentes (como cuadros o personas)
                            if (mat.map.image && mat.map.image.src.toLowerCase().endsWith('.png')) {
                            	mat.transparent = true;
                            	mat.alphaTest = 0.1;
                        	}
                    	}
                        // 3. Arregla las ventanas (VIDRIO)
                    	if (mat && (mat.name.toLowerCase().includes('glass') || mat.name.toLowerCase().includes('vidrio'))) {
                        	mat.transparent = true;
                        	mat.opacity = 0.2;
                    	}
                	});
            	}
        	});
        	
        	// --- ¡POSICIÓN VR CORREGIDA! ---
        	vrGroup = new THREE.Group();
        	vrGroup.add(model); // Añadimos el modelo ya centrado

        	// (1.5, 0, 2.0) te pone en el centro del salón de 3x4m
        	vrGroup.position.set(1.5, 0, 2.0); 
        	
    	 	scene.add(vrGroup);
    	 	console.log("Modelo cargado exitosamente.");
    	},
    	 
    	// -- onProgress (Mientras carga) --
    	(xhr) => {
    	 	console.log((xhr.loaded / xhr.total * 100) + '% cargado');
    	},
  	 
    	// -- onError (Si falla) --
  	 	(error) => {
    	 	console.error('Error al cargar el modelo FBX:', error);
    	}
  	);
  	 
  	// 7. Loop de Animación
  	renderer.setAnimationLoop(animate);

  	// 8. Manejar redimensionamiento de ventana
  	window.addEventListener('resize', onWindowResize);
}

// --- FUNCIONES AUXILIARES ---

function animate() {
    // No muevas la cámara con el mouse si estás en VR
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

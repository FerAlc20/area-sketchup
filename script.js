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
    camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    // Posición inicial de la cámara en modo escritorio.
    // VR ignora esta posición, pero sirve para vista previa.
    camera.position.set(0, 1.6, 3);

    // --- LUCES ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x888888, 1.5);
    hemisphereLight.position.set(0, 3, 0);
    scene.add(hemisphereLight);

    // --- AYUDANTES (opcional) ---
    const gridHelper = new THREE.GridHelper(20, 20);
    scene.add(gridHelper);

    // --- RENDERIZADOR ---
    // CORREGIDO: antialias en lugar de "antias"
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;

    // Habilitar VR (WebXR)
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Botón de "Enter VR"
    document.body.appendChild(VRButton.createButton(renderer));

    // --- CONTROLES (Modo Escritorio) ---
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 1.6, 0);
    controls.update();

    // --- CARGADOR DE MODELO FBX ---
    const loader = new FBXLoader();
    loader.setResourcePath('Sala/');

    loader.load(
        'Sala/Sala_v2.fbx',

        // onLoad
        (fbx) => {
            model = fbx;

            // Centrar el modelo en el origen (0,0,0) y poner el piso en Y=0
            const bbox = new THREE.Box3().setFromObject(model);
            const center = bbox.getCenter(new THREE.Vector3());

            model.position.x -= center.x;
            model.position.z -= center.z;
            model.position.y -= bbox.min.y; // piso en Y=0

            // Ajustar materiales
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;

                    const materials = Array.isArray(child.material)
                        ? child.material
                        : [child.material];

                    materials.forEach((mat) => {
                        if (!mat) return;

                        // Si quieres ver ambos lados de las caras:
                        mat.side = THREE.DoubleSide;

                        if (mat.map) {
                            // Corregir color
                            mat.map.encoding = THREE.sRGBEncoding;

                            // --- TRANSPARENCIA PNGs (venado, reloj, etc.) ---
                            // En vez de revisar el .src (que a veces viene como blob:...),
                            // usamos el formato de la textura: RGBA => tiene canal alpha.
                            if (mat.map.format === THREE.RGBAFormat) {
                                mat.transparent = true;
                                mat.alphaTest = 0.5; // recorta el PNG
                            } else {
                                mat.transparent = false;
                                mat.alphaTest = 0.0;
                            }
                        }

                        // --- Vidrios/Ventanas por nombre de material ---
                        if (
                            mat.name &&
                            (mat.name.toLowerCase().includes('glass') ||
                                mat.name.toLowerCase().includes('vidrio'))
                        ) {
                            mat.transparent = true;
                            mat.opacity = 0.2;
                            mat.depthWrite = false;
                            mat.alphaTest = 0.0;
                        }
                    });
                }
            });

            // --- POSICIÓN VR (DENTRO DEL SALÓN) ---
            // En VR el usuario aparece en el origen (0,0,0) del mundo.
            // Como ya centramos el cuarto alrededor del origen y el piso está en Y=0,
            // el jugador queda DENTRO del cuarto.
            vrGroup = new THREE.Group();
            vrGroup.add(model);

            // IMPORTANTE: NO DESPLAZAR el grupo lejos del origen.
            // Antes: vrGroup.position.set(-1.5, 0, -2.5);
            vrGroup.position.set(0, 0, 0);

            scene.add(vrGroup);

            console.log('Modelo cargado exitosamente.');
        },

        // onProgress
        (xhr) => {
            console.log((xhr.loaded / xhr.total) * 100 + '% cargado');
        },

        // onError
        (error) => {
            console.error('Error al cargar el modelo FBX:', error);
        }
    );

    // Loop de animación
    renderer.setAnimationLoop(animate);

    // Resize
    window.addEventListener('resize', onWindowResize);
}

// --- FUNCIONES AUXILIARES ---

function animate() {
    // Solo actualizar controles cuando NO estamos en VR
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

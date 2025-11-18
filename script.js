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

// Punto donde queremos que aparezca la cabeza del usuario (XZ = centro del cuarto)
const VR_SPAWN = new THREE.Vector3(0, 0, 0);
let hasTeleportedToCenter = false;

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
    // Vista inicial en modo escritorio
    camera.position.set(0, 1.6, 3);

    // --- LUCES ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x888888, 1.5);
    hemisphereLight.position.set(0, 3, 0);
    scene.add(hemisphereLight);

    // --- AYUDANTE (opcional) ---
    const gridHelper = new THREE.GridHelper(20, 20);
    scene.add(gridHelper);

    // --- RENDERIZADOR ---
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;

    // Habilitar VR
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    // --- CONTROLES (modo escritorio) ---
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 1.6, 0);
    controls.update();

    // Cuando se inicia o termina una sesión VR, reseteamos el flag
    renderer.xr.addEventListener('sessionstart', () => {
        hasTeleportedToCenter = false;
    });
    renderer.xr.addEventListener('sessionend', () => {
        hasTeleportedToCenter = false;
    });

    // --- CARGAR MODELO FBX ---
    const loader = new FBXLoader();
    loader.setResourcePath('Sala/');

    loader.load(
        'Sala/Sala_v2.fbx',
        (fbx) => {
            model = fbx;

            // Centrar el modelo en el origen y piso en Y=0
            const bbox = new THREE.Box3().setFromObject(model);
            const center = bbox.getCenter(new THREE.Vector3());

            model.position.y -= bbox.min.y;   // piso en Y = 0
            model.position.x -= center.x;
            model.position.z -= center.z;

            // Ajustar materiales
            model.traverse((child) => {
                if (!child.isMesh) return;

                child.castShadow = true;
                child.receiveShadow = true;
                child.frustumCulled = false; // que no desaparezcan cosas en VR

                const materials = Array.isArray(child.material)
                    ? child.material
                    : [child.material];

                materials.forEach((mat) => {
                    if (!mat) return;

                    mat.side = THREE.DoubleSide;

                    if (mat.map) {
                        mat.map.encoding = THREE.sRGBEncoding;

                        if (mat.map.format === THREE.RGBAFormat) {
                            // PNG con alpha (venado, reloj, etc.)
                            mat.transparent = true;
                            mat.alphaTest = 0.5;
                        } else {
                            mat.transparent = false;
                            mat.alphaTest = 0.0;
                        }
                    }

                    // Vidrios por nombre del material
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
            });

            // Grupo VR
            vrGroup = new THREE.Group();
            vrGroup.add(model);
            vrGroup.position.set(0, 0, 0);

            scene.add(vrGroup);

            console.log('Modelo cargado exitosamente');
        },
        (xhr) => {
            console.log((xhr.loaded / xhr.total) * 100 + '% cargado');
        },
        (error) => {
            console.error('Error al cargar el modelo FBX:', error);
        }
    );

    // Loop de animación
    renderer.setAnimationLoop(animate);

    // Resize
    window.addEventListener('resize', onWindowResize);
}

// --- LOOP ---
function animate() {
    if (renderer.xr.isPresenting) {
        // En el primer frame de VR, centramos al usuario en el cuarto
        if (!hasTeleportedToCenter && vrGroup) {
            const xrCamera = renderer.xr.getCamera(camera);
            const currentPos = new THREE.Vector3();
            xrCamera.getWorldPosition(currentPos);

            const desiredPos = new THREE.Vector3(
                VR_SPAWN.x,
                currentPos.y,
                VR_SPAWN.z
            );

            const offset = new THREE.Vector3().subVectors(desiredPos, currentPos);
            vrG

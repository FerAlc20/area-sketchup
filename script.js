// Importamos los módulos necesarios
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';

// --- VARIABLES GLOBALES ---
let camera, scene, renderer;
let model; // Variable para guardar tu modelo

// --- INICIALIZACIÓN ---
init();

function init() {
    // 1. Escena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222); // Fondo gris oscuro

    // 2. Cámara
    // La cámara se moverá automáticamente por la VR, pero la definimos
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 0); // Posición inicial (altura de ojos aprox)
    scene.add(camera);

    // 3. Luces
    // Luz ambiental (para que no esté todo negro)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Luz direccional (simula el sol)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 2, 3);
    scene.add(directionalLight);

    // 4. Renderizador (Renderer)
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // --- HABILITACIÓN DE VR ---
    renderer.xr.enabled = true; // ¡El paso más importante para VR!
    document.body.appendChild(renderer.domElement);
    
    // 5. Botón de VR
    // Añade el botón "ENTER VR" al cuerpo del HTML
    document.body.appendChild(VRButton.createButton(renderer));

    // 6. Cargar el modelo FBX
    const loader = new FBXLoader();
    loader.load(
        'Sala/Sala.fbx', // La ruta a tu modelo
        
        // onLoad (cuando se carga correctamente)
        (fbx) => {
            model = fbx;

            // --- AJUSTES DEL MODELO ---
            // Los modelos FBX a veces son muy grandes o muy pequeños.
            // Ajusta la escala si es necesario.
            // model.scale.set(0.01, 0.01, 0.01); 

            // Posiciona el modelo frente a la cámara
            model.position.set(0, 1, -2); // 1m arriba, 2m adelante
            
            scene.add(model);
            console.log("Modelo cargado exitosamente.");
        },
        
        // onProgress (mientras se carga)
        (xhr) => {
            console.log((xhr.loaded / xhr.total * 100) + '% cargado');
        },
        
        // onError (si hay un error)
        (error) => {
            console.error('Error al cargar el modelo FBX:', error);
        }
    );
    
    // 7. Loop de Animación
    // Usamos setAnimationLoop para VR en lugar de requestAnimationFrame
    renderer.setAnimationLoop(animate);

    // 8. Manejar redimensionamiento de ventana
    window.addEventListener('resize', onWindowResize);
}

// --- FUNCIONES AUXILIARES ---

function animate() {
    // Aquí puedes agregar animaciones (ej. si el modelo se mueve)
    // if (model) {
    //     model.rotation.y += 0.01;
    // }

    // Renderizar la escena
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
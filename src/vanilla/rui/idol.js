import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(10, 5, 10);

// 바닥 생성
const floorGeometry = new THREE.PlaneGeometry(20, 20);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xbbbbbb });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.name = "floor";
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
floor.receiveShadow = true;
floor.castShadow = true;
scene.add(floor);

// 댄서 로드
const gltfLoader = new GLTFLoader();
const gltf = await gltfLoader.loadAsync("/dancer.glb");
const character = gltf.scene;
const animaintionClip = gltf.animations;
character.position.y = 0.9;
character.scale.set(0.01, 0.01, 0.01);
character.traverse((mesh) => {
  if (mesh.isMesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }
});
scene.add(character);

// 애니메이션 설정
const mixer = new THREE.AnimationMixer(character);
const action = mixer.clipAction(animaintionClip[0]);
action.setLoop(THREE.LoopPingPong);
action.play();

// 직사광선 생성
// const directionalLight = new THREE.DirectionalLight(0xffffff, 5);
// directionalLight.castShadow = true;
// directionalLight.position.set(3, 4, 5);
// directionalLight.lookAt(0, 0, 0);
// scene.add(directionalLight);

// 그림자 설정
// directionalLight.shadow.mapSize.width = 4096;
// directionalLight.shadow.mapSize.height = 4096;
// directionalLight.shadow.camera.near = 0.1;
// directionalLight.shadow.camera.far = 500;
// scene.add(directionalLight);

// 마우스로 카메라 시점 조작
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.dampingFactor = 0.03;

const newPosition = new THREE.Vector3(1, 1, 0); // 클릭된 3D 상의 좌표를 저장할 벡터
const rayCaster = new THREE.Raycaster();

// 스포트라이트 생성
const spotLight = new THREE.SpotLight(0xffffff, 10, 10, Math.PI / 2, 1, 1);
spotLight.castShadow = true;
spotLight.position.set(0, 3, 0);
spotLight.target = character;
scene.add(spotLight);

renderer.domElement.addEventListener("pointerdown", (e) => {
  // client좌표를 threejs 평면상의 좌표로 환산
  const x = (e.clientX / window.innerWidth) * 2 - 1; // 화면 상 가장 왼쪽이 -1, 중심이 0, 오른쪽이 1이 되도록 환산
  const y = -((e.clientY / window.innerHeight) * 2 - 1); // 화면 상 가장 위쪽이 1, 중심이 0, 아래쪽이 -1이 되도록 환산

  rayCaster.setFromCamera(new THREE.Vector2(x, y), camera); // rayCaster에 환산된 좌표와 카메라를 넘겨줌
  const intersects = rayCaster.intersectObjects(scene.children); // scene의 children 오브젝트들 중 현재 rayCaster가 관통한 오브젝트들을 받음
  console.log(intersects);
  const intersectFloor = intersects.find((i) => i.object.name === "floor"); // 관통한 오브젝트들 중 이름이 'floor'인 객체를 찾음
  newPosition.copy(intersectFloor.point); // 캐릭터가 이동할 위치벡터인 newPosition에 현재 클릭된 위치 좌표로 설정함
  newPosition.y = 1;
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.render(scene, camera);
});

const clock = new THREE.Clock();
const targetVector = new THREE.Vector3();

const render = () => {
  orbitControls.update();

  character.lookAt(newPosition); // 우선 캐릭터가 클릭된 위치를 바라보도록 설정
  targetVector
    .subVectors(newPosition, character.position)
    .normalize()
    .multiplyScalar(0.01); // 캐릭터가 목적지로 이동하기 위한 가이드 벡터( 목적지 - 캐릭터의 현재 위치 로 구한 벡터를 정규화(크기를 1로 만들기) 한 후, 0.01배의 크기로 줄임)

  // 캐릭터가 목표한 위치로 도달하도록 계속해서 위치를 업데이트함
  if (
    Math.abs(character.position.x - newPosition.x) >= 1 ||
    Math.abs(character.position.z - newPosition.z) >= 1
  ) {
    character.position.x += targetVector.x;
    character.position.z += targetVector.z;
    action.stop();
  }
  action.play();

  if (mixer) {
    mixer.update(clock.getDelta());
  }

  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
render();
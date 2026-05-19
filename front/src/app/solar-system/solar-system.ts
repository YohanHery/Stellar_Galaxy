import { Component, ElementRef, OnInit, ViewChild, AfterViewInit, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
@Component({
  selector: 'app-solar-system',
  standalone: true,
  template: `
    <div class="relative w-full h-screen">
      <canvas #canvasElement class="absolute inset-0 w-full h-full outline-none"></canvas>

      @if (selectedProject) {
        <div class="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md text-white p-6 rounded-2xl border border-white/20 shadow-2xl max-w-md w-full text-center z-10">
          <h2 class="text-2xl font-bold mb-2 text-yellow-400">{{ selectedProject.title }}</h2>
          <p class="text-gray-200">{{ selectedProject.description }}</p>
          <button (click)="closeProject()" class="mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors cursor-pointer">
            Fermer
          </button>
        </div>
      }
    </div>
  `,
  styles: []
})
export class SolarSystemComponent implements OnInit, AfterViewInit {
  @ViewChild('canvasElement') canvasRef!: ElementRef<HTMLCanvasElement>;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private sun!: THREE.Mesh;
  private planets: { mesh: THREE.Mesh, distance: number, speed: number, angle: number }[] = [];
  private controls!: OrbitControls;
  // Variables pour l'interactivité (le laser et la souris)
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  // Le projet actuellement sélectionné pour l'affichage HTML
  public selectedProject: any = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initThreeJs();
      this.createUniverse();
      this.createSun();
      this.createPlanets();
      this.animate();
    }
  }

  private initThreeJs() {
    const canvas = this.canvasRef.nativeElement;
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 30, 100); // position un peu plus haute et reculée

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Initialisation forcée des contrôles
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
  }

  private createUniverse() {
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 });

    const starVertices = [];
    for(let i = 0; i < 1000; i++) {
      const x = (Math.random() - 0.5) * 200;
      const y = (Math.random() - 0.5) * 200;
      const z = (Math.random() - 0.5) * 200;
      starVertices.push(x, y, z);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(stars);

    const ambientLight = new THREE.AmbientLight(0x333333);
    this.scene.add(ambientLight);
  }

  private createSun() {
    const geometry = new THREE.SphereGeometry(10, 64, 64);
    const material = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
    this.sun = new THREE.Mesh(geometry, material);
    this.scene.add(this.sun);

    const pointLight = new THREE.PointLight(0xffffff, 2, 300);
    this.scene.add(pointLight);
  }

  private async createPlanets() {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/projects', {
        headers: { 'Accept': 'application/ld+json' }
      });

      const data = await response.json();
      const projects = data['hydra:member'] || data['member'] || (Array.isArray(data) ? data : []);

      if (projects.length === 0) return;

      const colors = [0xff4422, 0x44ff22, 0x2244ff, 0xff00ff, 0x00ffff];
      let distanceBase = 20;

      projects.forEach((project: any, index: number) => {
        const geometry = new THREE.SphereGeometry(3, 32, 32);
        const material = new THREE.MeshBasicMaterial({
          color: colors[index % colors.length]
        });
        const planet = new THREE.Mesh(geometry, material);

        // On stocke les infos du projet dans la planète !
        planet.userData = { title: project.title, description: project.description };

        this.scene.add(planet);

        this.planets.push({
          mesh: planet,
          distance: distanceBase,
          speed: 0.01 - (index * 0.001),
          angle: Math.random() * Math.PI * 2
        });

        distanceBase += 15;
      });
    } catch (error) {
      console.error("Erreur critique :", error);
    }
  }

  private animate = () => {
    requestAnimationFrame(this.animate);
    this.controls.update();
    if (this.sun) {
      this.sun.rotation.y += 0.005;
    }

    this.planets.forEach(p => {
      p.angle += p.speed;
      p.mesh.position.x = Math.cos(p.angle) * p.distance;
      p.mesh.position.z = Math.sin(p.angle) * p.distance;
      p.mesh.rotation.y += 0.01;
    });

    this.renderer.render(this.scene, this.camera);
  };

  // --- LE RAYCASTER (CLIC SUR LES PLANÈTES) ---
  @HostListener('window:click', ['$event'])
  onClick(event: MouseEvent) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.planets.map(p => p.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      this.selectedProject = intersects[0].object.userData;
    }
  }

  // Fermer la carte HTML
  closeProject() {
    this.selectedProject = null;
  }

  @HostListener('window:resize')
  onWindowResize() {
    if (isPlatformBrowser(this.platformId)) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }
}

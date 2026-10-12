import { Component, ElementRef, OnInit, AfterViewInit, HostListener, Inject, PLATFORM_ID, OnDestroy, ViewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as THREE from 'three';
import gsap from 'gsap';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface PlanetData {
  mesh: THREE.Group;
  distance: number;
  speed: number;
  angle: number;
  data: any;
}

@Component({
  selector: 'app-solar-system',
  standalone: true,
  template: `
    <div class="relative w-full h-screen overflow-hidden">
      <canvas #canvasElement class="block w-full h-full outline-none"></canvas>
      <div id="blackout-overlay" class="fixed inset-0 bg-black opacity-0 pointer-events-none transition-opacity duration-1000 z-50"></div>
      @if (selectedProject) {
        <div class="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md text-white p-6 rounded-2xl border border-white/20 shadow-2xl max-w-md w-full text-center z-40">
          <h2 class="text-2xl font-bold mb-2 text-yellow-400">{{ selectedProject.title }}</h2>
          <p class="text-gray-200">{{ selectedProject.description }}</p>
          <button (click)="closeProject()" class="mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors cursor-pointer">Fermer</button>
        </div>
      }
    </div>
  `,
  styles: [` :host { display: block; width: 100vw; height: 100vh; background-color: #000; } `]
})
export class SolarSystemComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvasElement') canvasRef!: ElementRef<HTMLCanvasElement>;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private sun!: THREE.Mesh;
  private planets: PlanetData[] = [];
  private controls!: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private animationId: number = 0;
  private isTransitioning = false;
  private targetedPlanet: PlanetData | null = null;
  public selectedProject: any = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initThreeJs();
      this.createStarfield();
      this.createSun();
      this.createPlanets();
      this.animate();
    }
  }

  initThreeJs() {
    const canvas = this.canvasRef.nativeElement;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.camera.position.set(0, 40, 120);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
  }

  createStarfield() {
    const geometry = new THREE.BufferGeometry();
    const pos = new Float32Array(5000 * 3);
    for (let i = 0; i < 5000 * 3; i++) pos[i] = (Math.random() - 0.5) * 1000;
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.scene.add(new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.7 })));
    this.scene.add(new THREE.AmbientLight(0x404040, 1));
  }

  createSun() {
    this.sun = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffcc00 }));
    this.scene.add(this.sun);
    const light = new THREE.PointLight(0xffffff, 2000, 500);
    this.sun.add(light);
  }

  createBumpyGeometry(radius: number) {
    const geo = new THREE.SphereGeometry(radius, 32, 32);
    const pos = geo.attributes['position'] as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i);
      v.add(v.clone().normalize().multiplyScalar(Math.random() * 0.4));
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
  }

  createTextRing(text: string, radius: number): THREE.Group {
    const ringGroup = new THREE.Group();
    const chars = text.split('');
    const totalAngle = Math.PI;
    const startAngle = -totalAngle / 2;

    chars.forEach((char, i) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 128; canvas.height = 128;
      ctx.font = 'Bold 80px Arial';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(char, 64, 64);

      const texture = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));

      const angle = chars.length > 1 ? startAngle + (i / (chars.length - 1)) * totalAngle : 0;
      sprite.position.set(Math.sin(angle) * (radius + 4), Math.cos(angle) * (radius + 4), 0);
      sprite.scale.set(4, 4, 1);

      ringGroup.add(sprite);
    });

    return ringGroup;
  }

  async createPlanets() {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/projects');
      const data = await res.json();
      const projects = data['hydra:member'] || data['member'] || (Array.isArray(data) ? data : []);

      projects.forEach((proj: any, index: number) => {
        const size = Math.random() * 2 + 1.5;
        const group = new THREE.Group();
        const planet = new THREE.Mesh(
          this.createBumpyGeometry(size),
          new THREE.MeshStandardMaterial({ color: new THREE.Color(Math.random(), Math.random(), Math.random()), roughness: 0.8 })
        );

        const ring = this.createTextRing(proj.title.toUpperCase(), size);
        group.add(planet);
        group.add(ring);
        this.scene.add(group);

        // Rayons échelonnés pour éviter que deux planètes se chevauchent
        const distance = 25 + index * 12 + Math.random() * 5;
        this.planets.push({
          mesh: group,
          distance,
          speed: (0.002 + Math.random() * 0.003) * (Math.random() > 0.5 ? 1 : -1),
          angle: Math.random() * Math.PI * 2,
          data: proj
        });
      });
    } catch (e) {
      console.error(e);
    }
  }

  animate = () => {
    this.animationId = requestAnimationFrame(this.animate);
    this.sun.rotation.y += 0.002;

    this.planets.forEach(p => {
      // Pause l'orbite de la planète ciblée pour garder le focus stable
      if (this.targetedPlanet !== p) {
        p.angle += p.speed;
        p.mesh.position.set(Math.cos(p.angle) * p.distance, 0, Math.sin(p.angle) * p.distance);
      }
      p.mesh.rotation.y += 0.005;
    });

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  @HostListener('window:resize')
  onWindowResize() {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  @HostListener('click', ['$event'])
  onClick(e: MouseEvent) {
    if (this.isTransitioning || this.selectedProject) return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.mouse.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(this.planets.map(p => p.mesh), true);
    if (intersects.length > 0) {
      // Remonte les parents pour récupérer le groupe racine enregistré dans planets
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && !this.planets.some(p => p.mesh === obj)) {
        obj = obj.parent;
      }
      if (obj) {
        const target = this.planets.find(p => p.mesh === obj);
        if (target) this.zoomToPlanet(target);
      }
    }
  }

  zoomToPlanet(target: PlanetData) {
    this.isTransitioning = true;
    this.targetedPlanet = target;
    const group = target.mesh;

    gsap.to(this.controls.target, { x: group.position.x, y: group.position.y, z: group.position.z, duration: 1.5 });
    gsap.to(this.camera.position, {
      x: group.position.x,
      y: group.position.y + 4,
      z: group.position.z + 12,
      duration: 1.5,
      onComplete: () => {
        const overlay = document.getElementById('blackout-overlay');
        if (overlay) overlay.style.opacity = '0.7';
        this.selectedProject = target.data;
      }
    });
  }

  closeProject() {
    const overlay = document.getElementById('blackout-overlay');
    if (overlay) overlay.style.opacity = '0';
    this.selectedProject = null;

    gsap.to(this.controls.target, { x: 0, y: 0, z: 0, duration: 1.5 });
    gsap.to(this.camera.position, {
      x: 0,
      y: 40,
      z: 120,
      duration: 1.5,
      onComplete: () => {
        this.targetedPlanet = null;
        this.isTransitioning = false;
      }
    });
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      cancelAnimationFrame(this.animationId);
      this.renderer?.dispose();
      this.scene?.traverse((obj: any) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose());
          else obj.material.dispose();
        }
      });
    }
  }
}
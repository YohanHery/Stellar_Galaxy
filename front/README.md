# Front

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.11.

## Development server

To start a local development server, run:
Lancer dans le front
```bash
ng serve
```

Don't forget to launch 
```bash
docker compose up -d
php -S 127.0.0.1:8000 -t public
```


Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.










# CORRECTION CODE APPORTE: 

Dans le Solar-system.ts:

Nettoyage mémoire et redimensionnement : Aucun écouteur resize n'est configuré (l'affichage se déforme si la fenêtre change de taille). De plus, les géométries, matières et textures ne sont pas nettoyées dans ngOnDestroy(), ce qui sature le GPU.

Problème de suivi caméra (zoom) : Lorsque la caméra zoome sur la planète avec GSAP, la planète continue d'avancer sur son orbite via p.angle += p.speed dans la boucle d'animation. La planète s'échappe donc du cadre pendant que la caméra rejoint les coordonnées initiales du clic. Il faut figer l'orbite de la planète ciblée ou asservir la caméra dynamiquement à la position du groupe.

Calcul des intersections Raycaster : intersects[0].object.parent ne remonte pas toujours au bon groupe si le clic touche un Sprite du sous-groupe d'anneau de texte. Il vaut mieux remonter récursivement jusqu'à trouver le groupe enregistré dans this.planets.

Inutilité de sprite.lookAt : Par définition dans Three.js, un Sprite fait déjà face à la caméra automatiquement. La boucle sprite.lookAt(this.camera.position) est redondante et consomme du CPU à chaque frame.

Réinitialisation des OrbitControls : Dans closeProject(), le controls.target n'est pas remis à (0, 0, 0), ce qui laisse le centre orbital bloqué là où se trouvait la planète.
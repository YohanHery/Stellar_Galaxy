import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SolarSystemComponent } from './solar-system/solar-system';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SolarSystemComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  title = 'front';
}

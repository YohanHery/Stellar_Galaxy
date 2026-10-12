import { Component } from '@angular/core';
import { SolarSystemComponent } from './solar-system/solar-system';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SolarSystemComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent {
}

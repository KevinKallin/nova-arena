import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { planet, play } from 'ionicons/icons';

@Component({
  selector: 'app-home',
  imports: [FormsModule, IonButton, IonContent, IonIcon, IonInput, IonItem],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  name = '';

  constructor(private readonly router: Router) {
    addIcons({ planet, play });
  }

  play(): void {
    const safe = this.name.trim() || 'Player';
    void this.router.navigate(['/game'], { queryParams: { name: safe } });
  }
}
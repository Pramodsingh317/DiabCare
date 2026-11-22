import { Routes } from '@angular/router';
import { PredictionForm } from './prediction-form/prediction-form';
import { Home } from './home/home';

export const routes: Routes = [
    {
        path:'',
        component:Home
    },
    {
        path: 'prediction',
        component:PredictionForm
    }
];

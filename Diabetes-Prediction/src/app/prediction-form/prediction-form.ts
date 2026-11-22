import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PredictionInput, PredictionResult, PredictionService } from './prediction.service';

@Component({
  imports: [DecimalPipe, ReactiveFormsModule, RouterLink],
  selector: 'app-prediction-form',
  styleUrl: './prediction-form.css',
  templateUrl: './prediction-form.html',
})
export class PredictionForm {
  private readonly predictionService = inject(PredictionService);

  readonly form = new FormGroup({
    glucose: new FormControl<number | null>(null, [Validators.required, Validators.min(0), Validators.max(300)]),
    bmi: new FormControl<number | null>(null, [Validators.required, Validators.min(0), Validators.max(100)]),
    cholesterol: new FormControl<number | null>(null, [Validators.required, Validators.min(0), Validators.max(1000)]),
    insulin: new FormControl<number | null>(null, [Validators.required, Validators.min(0), Validators.max(1000)]),
    bloodPressure: new FormControl<number | null>(null, [Validators.required, Validators.min(0), Validators.max(200)]),
    skinThickness: new FormControl<number | null>(null, [Validators.required, Validators.min(0), Validators.max(100)]),
    diabetesPedigreeFunction: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
      Validators.max(10),
    ]),
    age: new FormControl<number | null>(null, [Validators.required, Validators.min(1), Validators.max(120)]),
  });

  readonly result = signal<PredictionResult | null>(null);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly resultPercent = computed(() => {
    const probability = this.result()?.probability;
    return probability === undefined ? null : probability * 100;
  });

  submitPrediction(): void {
    if (this.isSubmitting()) {
      return;
    }

    this.form.markAllAsTouched();
    this.result.set(null);
    this.errorMessage.set(null);

    if (this.form.invalid) {
      return;
    }

    const input = this.getPredictionInput();
    if (!input) {
      this.errorMessage.set('Please complete every field before requesting a prediction.');
      return;
    }

    this.isSubmitting.set(true);
    this.predictionService.predict(input).subscribe({
      next: (result) => {
        this.result.set(result);
        this.isSubmitting.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(this.getErrorMessage(error));
        this.isSubmitting.set(false);
      },
    });
  }

  private getPredictionInput(): PredictionInput | null {
    const values = this.form.getRawValue();
    if (
      values.glucose === null ||
      values.bmi === null ||
      values.cholesterol === null ||
      values.insulin === null ||
      values.bloodPressure === null ||
      values.skinThickness === null ||
      values.diabetesPedigreeFunction === null ||
      values.age === null
    ) {
      return null;
    }

    return {
      glucose: values.glucose,
      bmi: values.bmi,
      cholesterol: values.cholesterol,
      insulin: values.insulin,
      bloodPressure: values.bloodPressure,
      skinThickness: values.skinThickness,
      diabetesPedigreeFunction: values.diabetesPedigreeFunction,
      age: values.age,
    };
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'Could not connect to the prediction service. Make sure your model API is running.';
      }
      if (error.status === 404) {
        return 'The prediction endpoint was not found. Configure your API to handle POST /api/predict.';
      }
      if (error.status === 502 || error.status === 503) {
        return 'The dev proxy cannot reach FastAPI on port 8000. Start the model API and check its terminal for startup errors.';
      }
      return `The prediction service returned an error (HTTP ${error.status}). Please try again.`;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'An unexpected error occurred while requesting a prediction.';
  }
}

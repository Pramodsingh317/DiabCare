import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

export interface PredictionInput {
  glucose: number;
  bmi: number;
  cholesterol: number;
  insulin: number;
  bloodPressure: number;
  skinThickness: number;
  diabetesPedigreeFunction: number;
  age: number;
}

export interface PredictionResult {
  prediction: 0 | 1;
  probability?: number;
}

@Injectable({ providedIn: 'root' })
export class PredictionService {
  private readonly http = inject(HttpClient);

  predict(input: PredictionInput): Observable<PredictionResult> {
    return this.http.post<unknown>('/api/predict', input).pipe(
      map((response) => this.parseResponse(response)),
    );
  }

  private parseResponse(response: unknown): PredictionResult {
    if (typeof response !== 'object' || response === null || !('prediction' in response)) {
      throw new Error('The prediction service returned an unexpected response.');
    }

    if (response.prediction !== 0 && response.prediction !== 1) {
      throw new Error('The prediction service must return prediction as 0 or 1.');
    }

    const probability = 'probability' in response ? response.probability : undefined;
    if (
      probability !== undefined &&
      (typeof probability !== 'number' ||
        !Number.isFinite(probability) ||
        probability < 0 ||
        probability > 1)
    ) {
      throw new Error('The prediction service returned an invalid probability.');
    }

    return {
      prediction: response.prediction,
      ...(probability === undefined ? {} : { probability }),
    };
  }
}

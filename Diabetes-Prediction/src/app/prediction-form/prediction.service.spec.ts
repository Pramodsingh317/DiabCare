import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PredictionInput, PredictionService } from './prediction.service';

describe('PredictionService', () => {
  let service: PredictionService;
  let httpTesting: HttpTestingController;

  const input: PredictionInput = {
    glucose: 120,
    bmi: 28.5,
    cholesterol: 200,
    insulin: 80,
    bloodPressure: 72,
    skinThickness: 22,
    diabetesPedigreeFunction: 0.35,
    age: 35,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PredictionService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('posts the health measurements and returns a valid model result', () => {
    let result: unknown;
    service.predict(input).subscribe((response) => (result = response));

    const request = httpTesting.expectOne('/api/predict');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(input);
    request.flush({ prediction: 1, probability: 0.72 });

    expect(result).toEqual({ prediction: 1, probability: 0.72 });
  });

  it('rejects a response that does not contain a binary prediction', () => {
    let receivedError: unknown;
    service.predict(input).subscribe({ error: (error: unknown) => (receivedError = error) });
    httpTesting.expectOne('/api/predict').flush({ prediction: 'high' });

    expect(receivedError).toBeInstanceOf(Error);
    expect((receivedError as Error).message).toContain('prediction as 0 or 1');
  });
});

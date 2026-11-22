import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { routes } from '../app.routes';
import { PredictionForm } from './prediction-form';

describe('PredictionForm', () => {
  let component: PredictionForm;
  let fixture: ComponentFixture<PredictionForm>;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PredictionForm],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)],
    }).compileComponents();

    fixture = TestBed.createComponent(PredictionForm);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  afterEach(() => httpTesting.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('marks empty fields invalid without calling the prediction API', () => {
    component.submitPrediction();

    expect(component.form.invalid).toBe(true);
    expect(component.form.controls.cholesterol.touched).toBe(true);
    httpTesting.expectNone('/api/predict');
  });

  it('explains how to resolve a proxy connection failure', () => {
    component.form.setValue({
      glucose: 120,
      bmi: 28.5,
      cholesterol: 200,
      insulin: 80,
      bloodPressure: 72,
      skinThickness: 22,
      diabetesPedigreeFunction: 0.35,
      age: 35,
    });

    component.submitPrediction();
    httpTesting.expectOne('/api/predict').flush(null, {
      status: 502,
      statusText: 'Bad Gateway',
    });

    expect(component.errorMessage()).toContain('Start the model API');
  });
});

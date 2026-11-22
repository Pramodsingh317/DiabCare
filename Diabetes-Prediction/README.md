# DiabCare — Diabetes Risk Assessment

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.5.

## Run the application

The API uses the trusted model files in `artifact\` and requires Python 3.12 to match the scikit-learn 1.6.1 version used to create them. Install dependencies and start FastAPI:

```powershell
uv python install 3.12
uv venv --python 3.12 .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r api\requirements.txt
python -m uvicorn api.main:app --reload --host 127.0.0.1 --port 8000
```

In a second terminal, start Angular:

```powershell
npm start
```

The Angular development proxy forwards `/api` requests to FastAPI on port 8000. The API also exposes `GET /api/health`.
If the UI reports HTTP 502, the FastAPI process is unavailable to the proxy; keep it running in its own terminal and check that `http://127.0.0.1:8000/api/health` returns `{"status":"ready"}`.

## Model integration

The included FastAPI endpoint loads `artifact\diabetes_logistic_regression (8).joblib` and `artifact\preprocessor.joblib` at startup. It applies the fitted numerical preprocessing branch, then selects the eight transformed features in the order expected by the LogisticRegression model. Only use joblib artifacts from a trusted source; loading them can execute serialized Python code.

The saved model uses Glucose, BMI, Cholesterol, Insulin, Blood Pressure, Skin Thickness, Diabetes Pedigree Function, and Age. The assessment form matches those features. It submits this JSON to `POST /api/predict`:

```json
{
  "glucose": 120,
  "bmi": 28.5,
  "cholesterol": 200,
  "insulin": 80,
  "bloodPressure": 72,
  "skinThickness": 22,
  "diabetesPedigreeFunction": 0.35,
  "age": 35
}
```

The API returns `prediction` as `0` or `1` and `probability` as the model's class-1 probability, from `0` to `1`:

```json
{ "prediction": 0, "probability": 0.18 }
```

Predictions are informational only and are not a medical diagnosis.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once both servers are running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

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

Run the model API tests with the configured Python environment:

```powershell
python -m unittest api.test_main
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

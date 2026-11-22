from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

import joblib
import pandas as pd
from fastapi import FastAPI, Request
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / "artifact" / "diabetes_logistic_regression (8).joblib"
PREPROCESSOR_PATH = ROOT / "artifact" / "preprocessor.joblib"
NUMERICAL_PREFIX = "numerical__"
REQUEST_FIELDS = {
    "Age": "age",
    "Glucose": "glucose",
    "Blood Pressure": "blood_pressure",
    "Skin Thickness": "skin_thickness",
    "Insulin": "insulin",
    "BMI": "bmi",
    "Cholesterol": "cholesterol",
    "Diabetes Pedigree Function": "diabetes_pedigree_function",
}


class PredictionRequest(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        allow_inf_nan=False,
        extra="forbid",
        populate_by_name=True,
    )

    glucose: Annotated[float, Field(ge=0, le=300)]
    bmi: Annotated[float, Field(ge=0, le=100)]
    cholesterol: Annotated[float, Field(ge=0, le=1000)]
    insulin: Annotated[float, Field(ge=0, le=1000)]
    blood_pressure: Annotated[float, Field(ge=0, le=200)]
    skin_thickness: Annotated[float, Field(ge=0, le=100)]
    diabetes_pedigree_function: Annotated[float, Field(ge=0, le=10)]
    age: Annotated[float, Field(ge=1, le=120)]


def load_artifacts() -> tuple[LogisticRegression, Pipeline, tuple[str, ...], tuple[str, ...]]:
    if not MODEL_PATH.is_file():
        raise FileNotFoundError(f"Model artifact not found: {MODEL_PATH}")
    if not PREPROCESSOR_PATH.is_file():
        raise FileNotFoundError(f"Preprocessor artifact not found: {PREPROCESSOR_PATH}")

    model = joblib.load(MODEL_PATH)
    preprocessor = joblib.load(PREPROCESSOR_PATH)
    if not isinstance(model, LogisticRegression):
        raise TypeError("The model artifact is not a scikit-learn LogisticRegression model.")
    if not isinstance(preprocessor, ColumnTransformer):
        raise TypeError("The preprocessor artifact is not a scikit-learn ColumnTransformer.")

    numerical_transformer = preprocessor.named_transformers_.get("numerical")
    if not isinstance(numerical_transformer, Pipeline):
        raise TypeError("The preprocessor does not contain a fitted 'numerical' pipeline.")

    numerical_columns = next(
        (
            tuple(str(column) for column in columns)
            for name, _, columns in preprocessor.transformers_
            if name == "numerical"
        ),
        (),
    )
    expected_columns = {f"{NUMERICAL_PREFIX}{column}" for column in numerical_columns}
    model_features = tuple(str(feature) for feature in model.feature_names_in_)
    if set(numerical_columns) != set(REQUEST_FIELDS):
        raise ValueError("The model's numerical preprocessor does not match the eight UI fields.")
    if len(model_features) != 8 or set(model_features) != expected_columns:
        raise ValueError("The LogisticRegression artifact does not use all eight preprocessed UI fields.")
    if 1 not in model.classes_:
        raise ValueError("The model does not expose class 1 for probability reporting.")

    return model, numerical_transformer, numerical_columns, model_features


@asynccontextmanager
async def lifespan(app: FastAPI):
    model, numerical_transformer, numerical_columns, model_features = load_artifacts()
    app.state.model = model
    app.state.numerical_transformer = numerical_transformer
    app.state.numerical_columns = numerical_columns
    app.state.model_features = model_features
    yield


app = FastAPI(title="DiabCare prediction API", lifespan=lifespan)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ready"}


@app.post("/api/predict")
def predict(payload: PredictionRequest, request: Request) -> dict[str, int | float]:
    values = payload.model_dump()
    numeric_input = pd.DataFrame(
        [{column: values[REQUEST_FIELDS[column]] for column in request.app.state.numerical_columns}],
        columns=request.app.state.numerical_columns,
    )
    transformed = request.app.state.numerical_transformer.transform(numeric_input)
    transformed_names = [f"{NUMERICAL_PREFIX}{column}" for column in request.app.state.numerical_columns]
    if transformed.shape[1] != len(transformed_names):
        raise RuntimeError("The numerical preprocessor returned an unexpected number of features.")

    model_input = pd.DataFrame(transformed, columns=transformed_names).loc[
        :, list(request.app.state.model_features)
    ]

    model = request.app.state.model
    prediction = int(model.predict(model_input)[0])
    positive_class_index = list(model.classes_).index(1)
    probability = float(model.predict_proba(model_input)[0][positive_class_index])
    return {"prediction": prediction, "probability": probability}

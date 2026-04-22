"""Domain errors mapped to HTTP responses by the API layer."""


class AppError(Exception):
    """Base application error with HTTP status and stable machine code."""

    status_code: int = 400
    code: str = "app_error"

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class ValidationError(AppError):
    status_code = 400
    code = "validation_error"


class NotReadyError(AppError):
    status_code = 400
    code = "not_ready"


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"


class PayloadTooLargeError(AppError):
    status_code = 413
    code = "payload_too_large"


class ModelNotAvailableError(AppError):
    status_code = 503
    code = "model_unavailable"


class InferenceError(AppError):
    status_code = 503
    code = "inference_failed"


class TrainingError(AppError):
    status_code = 500
    code = "training_failed"

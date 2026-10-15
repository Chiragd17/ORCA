class ORCABaseException(Exception):
    """Base exception for all ORCA errors."""
    def __init__(self, message: str, details: dict | None = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class ProviderUnavailableException(ORCABaseException):
    """Raised when an external data or LLM provider cannot be reached."""
    pass


class AgentExecutionException(ORCABaseException):
    """Raised when a specialist agent fails during an investigation task."""
    pass


class VerificationFailedException(ORCABaseException):
    """Raised when scientific verification encounters critical contradictions."""
    pass


class InvalidInvestigationTaskException(ORCABaseException):
    """Raised when an investigation task schema is malformed or invalid."""
    pass

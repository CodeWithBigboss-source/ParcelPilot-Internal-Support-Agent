"""
FastAPI Main Application.

Exposes REST endpoints for the ParcelPilot AI Support & Operations chatbot.
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from app.agent.orchestrator import run_agent
from app.agent.schemas import (
    ActionResult,
    ChatRequest,
    ChatResponse,
    UserContextIn,
)
from app.agent.tools import cancel_action, execute_action
from app.core.access_control import AccessDeniedError, UserContext
from app.core.config import CORS_ORIGINS, SNAPSHOT_TIME_ISO

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure dataset ingestion is completed on startup
    try:
        from app.ingestion.ingest import run_full_ingestion
        run_full_ingestion()
    except Exception as e:
        print(f"Startup ingestion info: {e}")
    yield

app = FastAPI(
    title="ParcelPilot Internal Support Agent API",
    description="Backend AI core engine powering ParcelPilot's internal support and operations chatbot.",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
def health_check():
    """Basic health check endpoint returning snapshot time."""
    return {
        "status": "healthy",
        "service": "ParcelPilot Internal Support Agent",
        "dataset_snapshot_time": SNAPSHOT_TIME_ISO,
    }


@app.post("/chat", response_model=ChatResponse, tags=["Chat"])
def chat_endpoint(request: ChatRequest) -> ChatResponse:
    """
    Main agent endpoint.
    Receives user query, chat history, and user context.
    Executes multi-step agent reasoning with tools and returns structured response.
    """
    try:
        return run_agent(request)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request or user context: {str(e)}",
        )
    except AccessDeniedError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error executing agent query: {str(e)}",
        )


@app.post("/actions/{action_id}/confirm", response_model=ActionResult, tags=["Actions"])
def confirm_action_endpoint(action_id: str, user_context: UserContextIn) -> ActionResult:
    """
    Confirms and executes a previously proposed pending action.
    Requires user confirmation and role permission check.
    """
    user = UserContext(
        role=user_context.role,
        account_scope=user_context.account_scope,
        user_name=user_context.user_name,
    )
    try:
        res = execute_action(user, action_id)
        if not res.get("ok"):
            return ActionResult(
                action_id=action_id,
                status="failed",
                message=res.get("message", "Action execution failed."),
            )
        return ActionResult(
            action_id=action_id,
            status="confirmed",
            result_id=res.get("result_id"),
            message=res.get("message", "Action executed successfully."),
        )
    except AccessDeniedError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Action execution error: {str(e)}",
        )


@app.post("/actions/{action_id}/cancel", response_model=ActionResult, tags=["Actions"])
def cancel_action_endpoint(action_id: str) -> ActionResult:
    """Cancels/discards a previously proposed pending action."""
    res = cancel_action(action_id)
    if not res.get("ok"):
        return ActionResult(
            action_id=action_id,
            status="failed",
            message=res.get("message", "Cancel action failed."),
        )
    return ActionResult(
        action_id=action_id,
        status="cancelled",
        message=res.get("message", "Action cancelled successfully."),
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

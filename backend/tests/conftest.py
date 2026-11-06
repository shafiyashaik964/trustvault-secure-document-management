import os
from pathlib import Path

import pytest
from dotenv import dotenv_values
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

BACKEND_DIR = Path(__file__).resolve().parent.parent

TEST_ENV_FILE = BACKEND_DIR / ".env.test"
MAIN_ENV_FILE = BACKEND_DIR / ".env"

test_config = dotenv_values(TEST_ENV_FILE)
main_config = dotenv_values(MAIN_ENV_FILE)

test_database_url = test_config.get("DATABASE_URL")
main_database_url = main_config.get("DATABASE_URL")

if not test_database_url:
    raise ValueError(
        "DATABASE_URL is missing from backend/.env.test"
    )

if test_database_url == main_database_url:
    raise ValueError(
        "Test database must be different from the main database"
    )

os.environ["DATABASE_URL"] = test_database_url

from app.main import app
from app.database import engine, get_db


@pytest.fixture
def db():

    connection = engine.connect()
    transaction = connection.begin()

    test_db = Session(
        bind=connection,
        autoflush=False,
        autocommit=False,
        join_transaction_mode="create_savepoint"
    )

    try:
        yield test_db

    finally:
        test_db.close()

        if transaction.is_active:
            transaction.rollback()

        connection.close()


@pytest.fixture
def client(db):

    def override_get_db():

        try:
            yield db

        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    try:

        with TestClient(app) as test_client:
            yield test_client

    finally:

        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(
            __import__(
                "app.security.dependencies",
                fromlist=["get_current_user"]
            ).get_current_user,
            None
        )
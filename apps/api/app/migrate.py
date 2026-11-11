"""Explicit local migration/seed entry point; startup performs the same operation."""

from app.repository import Repository


def main() -> None:
    repository = Repository()
    try:
        repository.initialize()
        print(f"Database migrated: {repository.path}")
    finally:
        repository.close()


if __name__ == "__main__":
    main()

FROM python:3.14-slim AS build
COPY --from=ghcr.io/astral-sh/uv:0.9 /uv /bin/uv
# LolliPop is installed from its Git repository.
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY lollipop_service lollipop_service

FROM python:3.14-slim
RUN useradd --system lollipop
COPY --from=build /app /app
WORKDIR /app
ENV PATH=/app/.venv/bin:$PATH
USER lollipop
# See "Sizing" in README.md.
ENV LOLLIPOP_WORKERS_PER_REQUEST=25
EXPOSE 8000
HEALTHCHECK CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"
CMD ["uvicorn", "lollipop_service.app:app", "--host", "0.0.0.0", "--port", "8000"]

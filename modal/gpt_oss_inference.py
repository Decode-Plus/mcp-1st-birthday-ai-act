"""
GPT-OSS Model Deployment on Modal with vLLM

This script deploys OpenAI's GPT-OSS models (20B or 120B) on Modal.com
with vLLM for efficient inference.

Usage:
    # First time setup - pre-download model weights (run once, takes ~5-10 min)
    modal run gpt_oss_inference.py::download_model
    
    # Test the server locally
    modal run gpt_oss_inference.py
    
    # Deploy to production
    modal deploy gpt_oss_inference.py

Performance Tips:
    1. Run download_model first to cache weights in the volume
    2. Reduce MAX_MODEL_LEN for faster startup (8k is sufficient for most use cases)
    3. Keep FAST_BOOT=True for cheaper GPUs (A10G, L4)
    4. Increase SCALEDOWN_WINDOW to reduce cold starts during demos

Based on: https://modal.com/docs/examples/gpt_oss_inference
"""

import json
import time
from datetime import datetime, timezone
from typing import Any

import aiohttp
import modal

# =============================================================================
# Container Image Configuration
# =============================================================================

# Enable HF Transfer for faster model downloads (5-10x faster)
vllm_image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.8.1-devel-ubuntu22.04",
        add_python="3.12",
    )
    .entrypoint([])
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})  # Enable fast downloads
    .uv_pip_install(
        "vllm==0.11.0",
        "huggingface_hub[hf_transfer]==0.35.0",
        "flashinfer-python==0.3.1",
    )
)

# =============================================================================
# Model Configuration
# =============================================================================

# Choose the model size - 20B is faster, 120B has more capabilities
MODEL_NAME = "openai/gpt-oss-20b"  # or "openai/gpt-oss-120b"
MODEL_REVISION = "d666cf3b67006cf8227666739edf25164aaffdeb"

# =============================================================================
# GPU Configuration - CHOOSE YOUR GPU TIER
# =============================================================================
# 
# Modal GPU Pricing (approximate, per hour):
# ┌─────────────┬──────────┬────────────────────────────────────────────┐
# │ GPU         │ Price/hr │ Notes                                      │
# ├─────────────┼──────────┼────────────────────────────────────────────┤
# │ T4 (16GB)   │ ~$0.25   │ ❌ Too small for GPT-OSS                   │
# │ L4 (24GB)   │ ~$0.59   │ ⚠️  Tight fit, may work with 20B           │
# │ A10G (24GB) │ ~$0.76   │ ✅ Good balance for 20B model              │
# │ A100 40GB   │ ~$1.79   │ ✅ Comfortable for 20B                     │
# │ A100 80GB   │ ~$2.78   │ ✅ Works for both 20B and 120B             │
# │ H100 (80GB) │ ~$3.95   │ ✅ Best performance, both models           │
# └─────────────┴──────────┴────────────────────────────────────────────┘
#
# GPT-OSS 20B with MXFP4 quantization needs ~10-15GB VRAM
# GPT-OSS 120B needs ~40-50GB VRAM

# Choose your GPU - uncomment the one you want to use:
GPU_CONFIG = "A10G"  # ~$0.76/hr - RECOMMENDED for budget (works with 20B)
# GPU_CONFIG = "L4"     # ~$0.59/hr - Cheapest option (may be tight)
# GPU_CONFIG = "A100"   # ~$1.79/hr - More headroom (40GB version)
# GPU_CONFIG = "H100"   # ~$3.95/hr - Maximum performance

# =============================================================================
# Volume Configuration for Caching
# =============================================================================

# Cache for HuggingFace model weights
hf_cache_vol = modal.Volume.from_name("huggingface-cache", create_if_missing=True)

# Cache for vLLM compilation artifacts
vllm_cache_vol = modal.Volume.from_name("vllm-cache", create_if_missing=True)

# =============================================================================
# Performance Configuration
# =============================================================================

MINUTES = 60  # Helper constant

# FAST_BOOT = True: Faster startup but slower inference
# FAST_BOOT = False: Slower startup but faster inference (recommended for production)
FAST_BOOT = True  # Use True for cheaper GPUs to reduce startup memory

# CUDA graph capture sizes for optimized inference
CUDA_GRAPH_CAPTURE_SIZES = [1, 2, 4, 8, 16, 24, 32]

# Data type configuration
# NOTE: GPT-OSS uses MXFP4 quantization which REQUIRES bfloat16 - float16 is NOT supported
# The Marlin kernel warning on A10G/L4 is expected and can be ignored
USE_FLOAT16 = False  # Must be False for GPT-OSS (MXFP4 only supports bfloat16)

# Maximum model length (context window) - SIGNIFICANTLY REDUCED for faster startup
# The KV cache allocation is proportional to context length, so smaller = much faster startup
# For EU AI Act assessments, 8k-16k tokens is more than enough
# GPT-OSS 20B supports up to 128k tokens, but we only need ~8k for our use case
MAX_MODEL_LEN = 16384  # 16k tokens - sufficient for compliance assessments, 4x faster startup

# Server configuration
VLLM_PORT = 8000
N_GPU = 1  # Number of GPUs for tensor parallelism
MAX_INPUTS = 50  # Reduced for smaller GPUs

# Keep container warm longer to avoid cold starts (costs more but faster response)
# For hackathon demo: 10 minutes to reduce cold starts during presentation
SCALEDOWN_WINDOW = 10 * MINUTES  # Increased for demo stability

# =============================================================================
# Modal App Definition
# =============================================================================

app = modal.App("gpt-oss-vllm-inference")


# Select GPU based on GPU_CONFIG
_GPU_MAP = {
    "T4": "T4",
    "L4": "L4",
    "A10G": "A10G",
    "A100": "A100:40GB",
    "A100-80GB": "A100:80GB",
    "H100": "H100",
}
SELECTED_GPU = _GPU_MAP.get(GPU_CONFIG, "A10G")


# =============================================================================
# Pre-download Model Weights (reduces warm start time significantly)
# =============================================================================

@app.function(
    image=vllm_image,
    volumes={"/root/.cache/huggingface": hf_cache_vol},
    timeout=30 * MINUTES,
)
def download_model():
    """
    Pre-download the model weights to the volume cache.
    Run this once with: modal run gpt_oss_inference.py::download_model
    This will cache the weights and make subsequent starts much faster.
    """
    from huggingface_hub import snapshot_download
    
    print(f"📥 Downloading model weights for {MODEL_NAME}...")
    print(f"   Revision: {MODEL_REVISION}")
    
    snapshot_download(
        MODEL_NAME,
        revision=MODEL_REVISION,
        local_dir=f"/root/.cache/huggingface/hub/models--{MODEL_NAME.replace('/', '--')}",
    )
    
    print("✅ Model weights downloaded and cached!")
    print("   Future container starts will use the cached weights.")


@app.function(
    image=vllm_image,
    gpu=SELECTED_GPU,
    scaledown_window=SCALEDOWN_WINDOW,
    timeout=30 * MINUTES,
    volumes={
        "/root/.cache/huggingface": hf_cache_vol,
        "/root/.cache/vllm": vllm_cache_vol,
    },
)
@modal.concurrent(max_inputs=MAX_INPUTS)
@modal.web_server(port=VLLM_PORT, startup_timeout=30 * MINUTES)
def serve():
    """Start the vLLM server with GPT-OSS model."""
    import subprocess

    cmd = [
        "vllm",
        "serve",
        "--uvicorn-log-level=info",
        MODEL_NAME,
        "--revision",
        MODEL_REVISION,
        "--served-model-name",
        "llm",  # Serve model as "llm" - this is what clients expect
        "--host",
        "0.0.0.0",
        "--port",
        str(VLLM_PORT),
    ]

    # enforce-eager disables both Torch compilation and CUDA graph capture
    # default is no-enforce-eager. see the --compilation-config flag for tighter control
    cmd += ["--enforce-eager" if FAST_BOOT else "--no-enforce-eager"]

    if not FAST_BOOT:  # CUDA graph capture is only used with `--no-enforce-eager`
        cmd += [
            "-O.cudagraph_capture_sizes="
            + str(CUDA_GRAPH_CAPTURE_SIZES).replace(" ", "")
        ]

    # Data type optimization: use float16 for A10G/L4 (SM86) to avoid Marlin kernel warning
    # bf16 is optimized for SM90+ (H100), fp16 is better for Ampere architecture
    if USE_FLOAT16:
        cmd += ["--dtype", "float16"]
    else:
        cmd += ["--dtype", "bfloat16"]

    # Limit context length to speed up startup and reduce memory allocation
    cmd += ["--max-model-len", str(MAX_MODEL_LEN)]

    # Disable custom all-reduce for single GPU (reduces startup overhead)
    if N_GPU == 1:
        cmd += ["--disable-custom-all-reduce"]

    # Enable prefix caching for faster subsequent requests
    cmd += ["--enable-prefix-caching"]

    # Trust remote code for GPT-OSS models
    cmd += ["--trust-remote-code"]

    # Optimize loading format for faster startup
    cmd += ["--load-format", "auto"]  # Auto-detect best format

    # assume multiple GPUs are for splitting up large matrix multiplications
    cmd += ["--tensor-parallel-size", str(N_GPU)]

    # Additional optimizations for faster startup and inference
    # Disable usage stats collection to speed up startup
    cmd += ["--disable-log-stats"]
    
    # Use swap space if needed (helps with memory pressure on smaller GPUs)
    cmd += ["--swap-space", "4"]  # 4GB swap space

    print(f"Starting vLLM server with command: {' '.join(cmd)}")

    subprocess.Popen(" ".join(cmd), shell=True)


# =============================================================================
# Local Test Entrypoint
# =============================================================================


@app.local_entrypoint()
async def test(test_timeout=30 * MINUTES, user_content=None, twice=True):
    """
    Test the deployed server with a sample prompt.
    
    Args:
        test_timeout: Maximum time to wait for server health
        user_content: Custom prompt to send (default: SVD explanation)
        twice: Whether to send a second request
    """
    url = serve.get_web_url()
    
    system_prompt = {
        "role": "system",
        "content": f"""You are ChatModal, a large language model trained by Modal.
Knowledge cutoff: 2024-06
Current date: {datetime.now(timezone.utc).date()}
Reasoning: low
# Valid channels: analysis, commentary, final. Channel must be included for every message.
Calls to these tools must go to the commentary channel: 'functions'.""",
    }

    if user_content is None:
        user_content = "Explain what the Singular Value Decomposition is."

    messages = [  # OpenAI chat format
        system_prompt,
        {"role": "user", "content": user_content},
    ]

    async with aiohttp.ClientSession(base_url=url) as session:
        print(f"Running health check for server at {url}")
        async with session.get("/health", timeout=test_timeout - 1 * MINUTES) as resp:
            up = resp.status == 200
        assert up, f"Failed health check for server at {url}"
        print(f"Successful health check for server at {url}")

        print(f"Sending messages to {url}:", *messages, sep="\n\t")
        await _send_request(session, "llm", messages)

        if twice:
            messages[0]["content"] += "\nTalk like a pirate, matey."
            print(f"Re-sending messages to {url}:", *messages, sep="\n\t")
            await _send_request(session, "llm", messages)


async def _send_request(
    session: aiohttp.ClientSession, model: str, messages: list
) -> None:
    """Send a streaming request to the vLLM server."""
    # `stream=True` tells an OpenAI-compatible backend to stream chunks
    payload: dict[str, Any] = {"messages": messages, "model": model, "stream": True}

    headers = {"Content-Type": "application/json", "Accept": "text/event-stream"}

    t = time.perf_counter()
    async with session.post(
        "/v1/chat/completions", json=payload, headers=headers, timeout=10 * MINUTES
    ) as resp:
        async for raw in resp.content:
            resp.raise_for_status()
            # extract new content and stream it
            line = raw.decode().strip()
            if not line or line == "data: [DONE]":
                continue
            if line.startswith("data: "):  # SSE prefix
                line = line[len("data: ") :]

            chunk = json.loads(line)
            assert (
                chunk["object"] == "chat.completion.chunk"
            )  # or something went horribly wrong
            delta = chunk["choices"][0]["delta"]

            if "content" in delta:
                print(delta["content"], end="")  # print the content as it comes in
            elif "reasoning_content" in delta:
                print(delta["reasoning_content"], end="")
            elif not delta:
                print()
            else:
                raise ValueError(f"Unsupported response delta: {delta}")
    print("")
    print(f"Time to Last Token: {time.perf_counter() - t:.2f} seconds")


# =============================================================================
# Utility Functions
# =============================================================================


def get_endpoint_url() -> str:
    """Get the deployed endpoint URL."""
    return serve.get_web_url()


if __name__ == "__main__":
    print("Run this script with Modal:")
    print("  modal run gpt_oss_inference.py       # Test the server")
    print("  modal deploy gpt_oss_inference.py    # Deploy to production")

